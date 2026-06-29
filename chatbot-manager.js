// Orquestrador do fluxo do chatbot Fezinha
const LeadClassifier = require('./lead-classifier');
const ScoringEngine = require('./scoring-engine');
const ObjecaoHandler = require('./objecao-handler');
const QualificationEngine = require('./qualification-engine');
const EmpathyEngine = require('./empathy-engine');

class ChatbotManager {
  constructor(baseConhecimento = '') {
    this.classifier = new LeadClassifier();
    this.scorer = new ScoringEngine();
    this.objecoes = new ObjecaoHandler();
    this.qualification = new QualificationEngine();
    this.empatia = new EmpathyEngine();
    this.baseConhecimento = baseConhecimento;
    this.fluxos = new Map(); // telefone -> estado do fluxo
    this.temposRespostas = new Map(); // telefone -> [timestamps]
    this.historicoCompleto = new Map(); // telefone -> [todas as mensagens]
  }

  async processar(telefone, texto, historico = []) {
    // Classificar o lead
    const leadData = this.classifier.classify(telefone, texto, historico);
    leadData.historicoTamanho = historico.length;

    // Calcular score
    const score = this.scorer.obterScore(telefone, leadData);
    const { temperatura, descricao } = this.scorer.obterTemperatura(score);

    // Atualizar lead com temperatura
    this.classifier.atualizarLead(telefone, { temperatura, score });

    // Verificar se precisa escalar
    const deveEscalar = this.scorer.deveEscalar(leadData, score);

    // Verificar objeção
    const tipoObjecao = this.objecoes.identificarObjecao(texto);
    if (tipoObjecao) {
      this.objecoes.registrarObjecao(telefone, tipoObjecao, texto);
    }

    // NOVA LÓGICA: Reconhecer URGÊNCIA baseado no tempo de resposta
    const tempoRespostaMs = this.calcularTempoResposta(telefone);
    const urgencia = this.qualification.reconhecerUrgencia(texto, tempoRespostaMs);

    // NOVA LÓGICA: Qualificar ticket médio se ainda não tem
    if (!leadData.ticket_medio) {
      const ticket = this.qualification.qualificarTicket(texto);
      if (ticket) {
        leadData.ticket_medio = ticket;
        this.classifier.atualizarLead(telefone, { ticket_medio: ticket });
      }
    }

    // NOVA LÓGICA: Verificar se precisa fazer follow-up
    const ultimoContato = historico.length > 0 ? historico[historico.length - 1].timestamp : Date.now();
    const followUp = this.qualification.agendaFollowUp(leadData, ultimoContato, urgencia);

    // NOVA LÓGICA: Análise de Empatia e Escuta Ativa
    const emocaoCliente = this.empatia.reconhecerEmocao(texto, historico);
    const historicoCompletoCliente = this.historicoCompleto.get(telefone) || [];
    historicoCompletoCliente.push({ texto, timestamp: Date.now() });
    this.historicoCompleto.set(telefone, historicoCompletoCliente);

    const contextoCompleto = this.empatia.construirContextoCompleto(leadData, historicoCompletoCliente);
    const tipoCliente = this.empatia.identificarTipoCliente(leadData, historicoCompletoCliente);
    const interesseReal = this.empatia.reconhecerInteresseReal(texto, historicoCompletoCliente);

    return {
      leadData,
      score,
      temperatura,
      descricao,
      tipoObjecao,
      deveEscalar,
      urgencia,
      scoreRelatorio: this.scorer.gerarRelatorio(telefone, leadData),
      followUp,
      // NOVO: Empatia e Escuta Ativa
      emocao: emocaoCliente,
      contexto: contextoCompleto,
      tipoCliente,
      interesseReal,
    };
  }

  // Calcula tempo desde última resposta
  calcularTempoResposta(telefone) {
    if (!this.temposRespostas.has(telefone)) {
      this.temposRespostas.set(telefone, []);
    }

    const tempos = this.temposRespostas.get(telefone);
    const agora = Date.now();

    if (tempos.length === 0) {
      tempos.push(agora);
      return 0;
    }

    const ultimoTempo = tempos[tempos.length - 1];
    const diferenca = agora - ultimoTempo;

    tempos.push(agora);
    // Manter apenas últimas 10 respostas
    if (tempos.length > 10) {
      tempos.shift();
    }

    return diferenca;
  }

  gerarResposta(texto, telefone, analise) {
    const { leadData, tipoObjecao, deveEscalar, urgencia, emocao, tipoCliente, interesseReal, contexto } = analise;

    // Se interesse é MUITO_ALTO e urgência é MUITO_ALTA, FECHE AGORA
    if (interesseReal && interesseReal.nivel === 'MUITO_ALTO' && urgencia === 'MUITO_ALTA') {
      const estrategia = this.qualification.obterEstrategiaVendaPorUrgencia('MUITO_ALTA', leadData);
      return {
        resposta: estrategia.mensagem,
        tipo: 'FECHAMENTO_URGENTE',
        urgencia,
        confianca: 'MUITO_ALTA'
      };
    }

    // Se emocao é CONFUSO, ofereça esclarecimento
    if (emocao && emocao.emocao === 'CONFUSO') {
      const perguntaValidacao = this.empatia.gerarPerguntasValidacao(leadData, 'CONFUSO');
      return {
        resposta: 'Deixa eu simplificar.

' + perguntaValidacao,
        tipo: 'ESCUTA_ATIVA',
        emocao: emocao.emocao,
        urgencia
      };
    }

    // Se emocao é RESISTENTE, respeite
    if (emocao && emocao.emocao === 'RESISTENTE') {
      return {
        resposta: 'Entendo. Qual é exatamente a dúvida que você tem? Fico feliz em esclarecer.',
        tipo: 'RESPEITAR_OBJECAO',
        emocao: emocao.emocao,
        urgencia
      };
    }

    // Se detectou objeção, tratar COM EMPATIA
    if (tipoObjecao) {
      const tratamento = this.objecoes.tratarObjecao(tipoObjecao, leadData, this.baseConhecimento);
      if (tratamento) {
        let respostaAdaptada = tratamento.resposta;
        if (emocao && emocao.emocao === 'FRUSTRADO') {
          respostaAdaptada = 'Entendo perfeitamente. ' + respostaAdaptada;
        }
        return {
          resposta: respostaAdaptada,
          tipo: 'OBJECAO_RESPOSTA',
          proximaPasso: tratamento.proximaPergunta,
        };
      }
    }

    // Se deve escalar, indicar COM EMPATIA
    if (deveEscalar) {
      return {
        resposta: 'Vi que sua situação merece atenção especial.

Vou encaminhar pro especialista certo. Você não precisa contar tudo de novo, já tenho tudo documentado aqui.',
        tipo: 'ESCALACAO',
        transferir_para_humano: true,
      };
    }

    // Se interesse é BAIXO, pergunte o que está faltando
    if (interesseReal && interesseReal.nivel === 'BAIXO') {
      return {
        resposta: 'O que ainda não ficou claro? Fico feliz em esclarecer sem pressão nenhuma.',
        tipo: 'VALIDACAO_INTERESSE',
        interesseReal: interesseReal.nivel,
        urgencia
      };
    }

    // Gerar resposta baseado na etapa comercial, urgência e tipo de cliente
    const resposta = this.gerarRespostaPorEtapa(leadData, texto, [], urgencia);

    return {
      resposta,
      tipo: 'FLUXO_NORMAL',
      proximoPasso: this.identificarProximoPasso(leadData),
      urgencia,
      emocao: emocao ? emocao.emocao : 'INDECISO',
      tipoCliente: tipoCliente ? tipoCliente.tipo : 'VENDEDOR_PURO'
    };
  }

  gerarRespostaPorEtapa(leadData, texto, historico, urgencia = 'MEDIA') {
    const etapa = leadData.etapa_comercial;
    const intencao = leadData.intencao;

    // Se urgência é ALTA, pule direto para recomendação
    if (urgencia === 'ALTA' && (etapa === 'LEAD_NOVO' || etapa === 'QUALIFICACAO')) {
      if (leadData.principal_dor && leadData.principal_dor !== 'NAO_IDENTIFICADA') {
        return this.fluxoRecomendacao(leadData, texto);
      }
    }

    // LEAD NOVO - primeira interação
    if (etapa === 'LEAD_NOVO' || etapa === 'QUALIFICACAO') {
      return this.fluxoQualificacao(leadData, texto);
    }

    // DIAGNÓSTICO - depois de fazer o diagnóstico
    if (etapa === 'DIAGNOSTICO') {
      return this.fluxoDiagnostico(leadData, texto);
    }

    // PLANO RECOMENDADO - já qual plano
    if (etapa === 'PLANO_RECOMENDADO') {
      return this.fluxoRecomendacao(leadData, texto);
    }

    // DEMO - quer ver funcionando
    if (etapa === 'DEMO') {
      return this.fluxoDemo(leadData, texto);
    }

    // FECHAMENTO - pronto para comprar
    if (etapa === 'FECHAMENTO') {
      return this.fluxoFechamento(leadData, texto);
    }

    // CLIENTE - já comprou
    if (etapa === 'CLIENTE' || etapa === 'CLIENTE_ONBOARDING') {
      return this.fluxoCliente(leadData, texto);
    }

    // SUPORTE - tem problema técnico
    if (etapa === 'SUPORTE') {
      return this.fluxoSuporte(leadData, texto);
    }

    return `Entendi. Como posso ajudar melhor? Qual é sua principal dúvida sobre o FechaPro?`;
  }

  fluxoQualificacao(leadData, texto) {
    // Usa engine de qualificação para determinar próxima pergunta
    const proximaPergunta = this.qualification.obterProximaPergunta(leadData);

    if (!proximaPergunta) {
      // Se já qualificou tudo, pare com perguntas e venda
      return null;
    }

    // Retorna a pergunta baseada no que falta
    return proximaPergunta.pergunta;
  }

  fluxoDiagnostico(leadData, texto) {
    // Se tem resultado do diagnóstico
    if (texto.includes('%') || texto.includes('resultado') || texto.includes('deu')) {
      return `Ótimo! Vi seu resultado.\n\nPelo seu cenário, o mais importante é organizar o caminho inteiro: apresentação melhor, acompanhamento certo e fechamento sem perder vendas.\n\nQual desses três problemas te afeta mais?`;
    }

    return `Você já fez o diagnóstico? Se não, ele é rápido (2 min) e mostra exatamente onde você pode melhorar: https://fechapro.com.br/diagnostico`;
  }

  fluxoRecomendacao(leadData, texto) {
    const dor = leadData.principal_dor;
    const ticket = leadData.ticket_medio;

    // Usa engine de qualificação para recomendar
    const recomendacao = this.qualification.obterPlanoRecomendado(ticket, dor);

    // Se ticket é alto, recomenda PERFORMANCE com mais força
    if (ticket === 'ACIMA_20K' || ticket === 'ATE_20K') {
      return `Perfeito! Você tem ticket alto.\n\n🔥 **Recomendo: PERFORMANCE** (${recomendacao.preco})\n\n${recomendacao.motivo}\n\n✅ Quer começar com implantação completa pela equipe?`;
    }

    // Default: Presença
    return `${recomendacao.motivo}\n\n💡 PRESENÇA (${recomendacao.preco})\n\nQual você prefere: mensal ou vitalício?`;
  }

  fluxoDemo(leadData, texto) {
    return `Claro! Vou preparar uma demonstração para você.\n\nAntes, deixa eu confirmar: qual é o seu principal objetivo com o FechaPro?\n\n1️⃣ Criar propostas profissionais\n2️⃣ Acompanhar clientes\n3️⃣ Facilitar pagamento\n4️⃣ Tudo junto`;
  }

  fluxoFechamento(leadData, texto) {
    // NO FECHAMENTO: NÃO PERGUNTE. FECHE.
    const textoLower = (texto || '').toLowerCase();

    let plano = 'PRESENÇA_MENSAL'; // default
    let url = 'https://fechapro.com.br/auth/signup?plan=presenca';
    let preco = 'R$ 109,90/mês';
    let descrição = 'Acesso ao sistema + propostas + acompanhamento';

    // Se mencionou Performance
    if (textoLower.includes('performance') || textoLower.includes('347') || textoLower.includes('implantação')) {
      plano = 'PERFORMANCE_MENSAL';
      url = 'https://fechapro.com.br/auth/signup?plan=performance';
      preco = 'R$ 347,90/mês (+ R$ 1.497 implantação)';
      descrição = 'Performance com implantação completa pela equipe';
    }
    // Se mencionou vitalício
    else if (textoLower.includes('vitalício') || textoLower.includes('vitalicio') || textoLower.includes('uma vez')) {
      if (textoLower.includes('performance')) {
        plano = 'PERFORMANCE_VITALICIO';
        preco = 'R$ 2.597 (pagamento único)';
        descrição = 'Performance vitalício';
      } else {
        plano = 'PRESENÇA_VITALICIO';
        preco = 'R$ 697 (pagamento único)';
        descrição = 'Presença vitalício';
      }
    }

    return `Perfeito! 🎉\n\n**${plano}** - ${preco}\n_${descrição}_\n\n👉 Link: ${url}\n\n✅ Você tem 7 dias de garantia. Reembolso integral se não gostar.`;
  }

  fluxoCliente(leadData, texto) {
    return `Oi! Como posso ajudar com sua conta?\n\n1️⃣ Dúvida sobre como usar\n2️⃣ Problema técnico\n3️⃣ Pagamento/assinatura\n4️⃣ Outro`;
  }

  fluxoSuporte(leadData, texto) {
    return `Entendi. Para localizar seu atendimento, qual é o e-mail que você usa no FechaPro?\n\nDepois vou te pedir mais detalhes sobre o problema.`;
  }

  identificarProximoPasso(leadData) {
    if (leadData.etapa_comercial === 'LEAD_NOVO') {
      return 'Qualificar: entender tipo de negócio';
    } else if (leadData.etapa_comercial === 'QUALIFICACAO') {
      return 'Oferecer diagnóstico';
    } else if (leadData.etapa_comercial === 'DIAGNOSTICO') {
      return 'Analisar resultado e recomendar plano';
    } else if (leadData.etapa_comercial === 'PLANO_RECOMENDADO') {
      return 'Oferecer contratação';
    } else if (leadData.etapa_comercial === 'FECHAMENTO') {
      return 'Conduzir ao pagamento';
    }
    return 'Continuar engajamento';
  }

  obterResumoLead(telefone) {
    const leadData = this.classifier.obterLead(telefone);
    const score = this.scorer.obterScore(telefone, leadData);

    return {
      telefone,
      nome: leadData.nome || 'Anônimo',
      empresa: leadData.empresa || 'Não informado',
      segmento: leadData.segmento || '',
      intencao: leadData.intencao,
      principal_dor: leadData.principal_dor,
      etapa_comercial: leadData.etapa_comercial,
      temperatura: leadData.temperatura,
      score,
      precisaHumano: score > 50,
      resumo: leadData.resumo_conversa,
      proxima_acao: this.identificarProximoPasso(leadData),
    };
  }

  // Detecta SINAIS DE COMPRA - reconhece quando está na hora de vender
  detectarSinalCompra(texto) {
    const sinais = {
      PRECO: ['quanto', 'custa', 'preço', 'valor', 'investimento'],
      PLANO: ['qual plano', 'qual é melhor', 'qual escolho', 'qual recomenda'],
      COMO_COMECAR: ['como começa', 'como inicio', 'como funciona', 'como é', 'me mostra'],
      PRONTIDAO: ['topada', 'topa', 'topa sim', 'vou pegar', 'vou contratar', 'quero contratar', 'quer dizer que', 'então é'],
      PAGAMENTO: ['como pago', 'pix', 'boleto', 'cartão', 'parcelado', 'forma de pagamento'],
    };

    const textoNorm = String(texto || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

    for (const [tipo, palavras] of Object.entries(sinais)) {
      if (palavras.some(p => textoNorm.includes(p))) {
        return { tipo, urgencia: 'ALTA' };
      }
    }

    return null;
  }

  // Se detectar sinal de compra, pula direto para o fechamento
  processarSinalCompra(sinal, leadData) {
    if (!sinal) return null;

    const { tipo } = sinal;

    if (tipo === 'PRECO') {
      return `Segue os valores:\n\n📅 Mensal: R$ 97/mês\n💰 Anual: R$ 997/ano\n♾️ Vitalício: R$ 1.397 (uma vez)\n\nQual desses combina melhor com você?`;
    }

    if (tipo === 'PLANO') {
      // RECOMENDE COM CONFIANÇA
      const dor = leadData.principal_dor || 'GERAL';
      const plano = dor === 'AQUISICAO_CLIENTE' ? 'Vitalício' : 'Anual';
      return `Para seu caso, recomendo o Plano ${plano}. Quer que eu te mande o link?`;
    }

    if (tipo === 'PRONTIDAO') {
      // ESTÁ PRONTO? VENDE JÁ
      return `Ótimo! 🎉\n\nSegue o link para contratar:\nhttps://fechapro.com.br/auth/signup?plan=annual\n\nTem 7 dias de garantia. Qualquer dúvida, é só chamar!`;
    }

    return null;
  }

  preparaParaTransferencia(telefone) {
    const resumo = this.obterResumoLead(telefone);
    const leadData = this.classifier.obterLead(telefone);
    const objecoes = this.objecoes.obterObjecoes(telefone);

    return {
      telefone,
      resumoLead: resumo,
      objecoes,
      contextoCompleto: leadData,
      mensagemTransferencia: `
**TRANSFERÊNCIA PARA HUMANO**

👤 ${resumo.nome}
🏢 ${resumo.empresa}
🏭 ${resumo.segmento}

📍 **Etapa**: ${resumo.etapa_comercial}
🌡️ **Temperatura**: ${resumo.temperatura}
📊 **Score**: ${resumo.score}/100

💬 **Última intenção**: ${resumo.intencao}
🎯 **Principal dor**: ${resumo.principal_dor}

${objecoes.length > 0 ? `📌 **Objeções registradas**:\n${objecoes.map(o => `- ${o.tipo}`).join('\n')}` : ''}

**Próximo passo**: ${resumo.proxima_acao}
      `.trim(),
    };
  }
}

module.exports = ChatbotManager;
