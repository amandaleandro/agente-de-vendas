// Motor de Empatia e Escuta Ativa - Faz o bot REALMENTE ouvir o cliente
class EmpathyEngine {
  constructor() {
    this.estadosEmocionais = {
      FRUSTRADO: {
        palavras: ['problema', 'difícil', 'ruim', 'pior', 'complicado', 'nunca', 'não funciona', 'perdi', 'desespero'],
        ton: 'COMPASSIVO',
        dados: { ton: 'COMPASSIVO' },
        estrategia: 'Validar problema + oferecer solução específica',
        exemploResposta: 'Entendo que isso é frustrante. Justamente por isso o FechaPro foi criado.'
      },
      ANIMADO: {
        palavras: ['legal', 'interessante', 'gostei', 'legal mesmo', 'nossa', 'bacana', 'top', 'massa'],
        tom: 'ENTUSIASMADO',
        estrategia: 'Aproveitar momentum + oferecer link agora',
        exemploResposta: 'Ótimo! Que legal que você está animado. Deixa eu te mostrar na prática!'
      },
      CONFUSO: {
        palavras: ['como', 'como assim', 'não entendi', 'entendi não', 'me explica', 'o que é', 'qual a diferença'],
        tom: 'EDUCADOR',
        estrategia: 'Explicar com exemplos práticos + perguntar se ficou claro',
        exemploResposta: 'Deixa eu simplificar. Pensa assim...'
      },
      INDECISO: {
        palavras: ['não sei', 'talvez', 'pode ser', 'acho que', 'meio que', 'depende'],
        tom: 'ORIENTADOR',
        estrategia: 'Oferecer diagnóstico para validar + perguntar o que falta',
        exemploResposta: 'Entendo a indecisão. Vamos deixar claro o que faz sentido pra você?'
      },
      RESISTENTE: {
        palavras: ['não', 'não quero', 'não preciso', 'não serve', 'nope', 'de jeito nenhum'],
        tom: 'RESPEITOSO',
        estrategia: 'Respeitar mas entender raiz da objeção',
        exemploResposta: 'Entendo. Me deixa só perguntar: qual é exatamente a dúvida?'
      },
      INDIFERENTE: {
        palavras: ['ok', 'tá', 'pode ser', 'sei lá', 'tanto faz', 'blz'],
        tom: 'PROVOCADOR',
        estrategia: 'Provocar curiosidade + perguntar o que seria útil',
        exemploResposta: 'Haha, entendi a desconfiança. Mas e se eu te mostrasse algo que VAI mudar?'
      }
    };

    this.tiposCliente = {
      EMPREENDEDOR_APAIXONADO: {
        sinais: ['meu negócio', 'eu mesma', 'autônomo', 'startup', 'minha empresa'],
        tom: 'INSPIRADOR',
        foco: 'Crescimento e resultado',
        abordagem: 'Fala de oportunidades e potencial'
      },
      EXECUTIVO_OCUPADO: {
        sinais: ['ocupado', 'pouco tempo', 'gestão', 'time', 'sistema', 'integração'],
        tom: 'DIRETO',
        foco: 'ROI e eficiência',
        abordagem: 'Vai direto ao ponto, números'
      },
      PROFISSIONAL_CRIATIVO: {
        sinais: ['fotografia', 'design', 'evento', 'arquitetura', 'decoração', 'criação'],
        tom: 'CRIATIVO',
        foco: 'Estética e apresentação',
        abordagem: 'Fala sobre como ficaria bonito e profissional'
      },
      SERVIÇOS_TÉCNICOS: {
        sinais: ['elétrica', 'hidráulica', 'ar-condicionado', 'reforma', 'técnico', 'manutenção'],
        tom: 'CONFIÁVEL',
        foco: 'Profissionalismo e confiança',
        abordagem: 'Foca em como vai passar mais confiança'
      },
      VENDEDOR_PURO: {
        sinais: ['vendo', 'cliente', 'proposta', 'negócio', 'venda', 'ticket'],
        tom: 'COMPETITIVO',
        foco: 'Número de vendas e fechamentos',
        abordagem: 'Fala de quantas vendas pode recuperar'
      }
    };
  }

  // LÓGICA 1: Reconhecer estado emocional do cliente
  reconhecerEmocao(texto, historicoCompleto = []) {
    const textoLower = String(texto || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');

    let emocaoPrincipal = 'INDECISO';
    let confianca = 0;

    // Procura por palavras-chave de cada emoção
    for (const [emocao, dados] of Object.entries(this.estadosEmocionais)) {
      const matches = dados.palavras.filter(p =>
        textoLower.includes(p.toLowerCase())
      ).length;

      if (matches > confianca) {
        confianca = matches;
        emocaoPrincipal = emocao;
      }
    }

    return {
      emocao: emocaoPrincipal,
      confianca,
      dados: this.estadosEmocionais[emocaoPrincipal]
    };
  }

  // LÓGICA 2: Gerar perguntas de validação de interesse
  gerarPerguntasValidacao(leadData, emoção) {
    const perguntasBase = {
      'Isso faz sentido pra você?': 'validar compreensão',
      'É exatamente isso que você procurava?': 'validar alinhamento',
      'Você realmente acha que isso resolveria seu problema?': 'validar utilidade',
      'Ficou claro como funcionaria no seu negócio?': 'validar aplicabilidade',
      'Qual seria o maior benefício pra você?': 'validar valor',
      'Você vê isso funcionando no seu dia a dia?': 'validar praticidade'
    };

    // Perguntas adaptadas por emoção
    const perguntasAdaptadas = {
      FRUSTRADO: 'Você realmente acha que isso terminaria com esse problema?',
      ANIMADO: 'Quer que eu te mostre como ficaria na prática agora?',
      CONFUSO: 'Ficou claro como isso funcionaria pra você?',
      INDECISO: 'O que ainda falta pra você decidir?',
      RESISTENTE: 'Qual é exatamente a dúvida que você tem?',
      INDIFERENTE: 'E se isso pudesse impactar seu faturamento? Você toparia ver?'
    };

    return perguntasAdaptadas[emoção] || 'Isso faz sentido pra você?';
  }

  // LÓGICA 3: Escuta Contextual - Guardar e reconectar informações
  construirContextoCompleto(leadData, historicoCompleto = []) {
    const contexto = {
      nome: leadData.nome,
      empresa: leadData.empresa,
      segmento: leadData.segmento,
      comoVende: leadData.como_encontra,
      comoEnviaOrcamento: leadData.como_envia_orcamento,
      ticketMedio: leadData.ticket_medio,
      principalDor: leadData.principal_dor,
      objecoes: leadData.objecoes || [],
      palavrasChave: this.extrairPalavrasChave(historicoCompleto),
      mencionouNomes: this.extrairNomes(historicoCompleto),
      mencionouNumeros: this.extrairNumeros(historicoCompleto),
      tom: this.analisarTom(historicoCompleto)
    };

    return contexto;
  }

  extrairPalavrasChave(historico) {
    const palavrasImportantes = ['perder', 'cliente', 'proposta', 'fechar', 'Google', 'Instagram',
                                 'WhatsApp', 'email', 'sistema', 'automação', 'tempo', 'dinheiro'];
    const encontradas = new Set();

    historico.forEach(msg => {
      const texto = String(msg.texto || '').toLowerCase();
      palavrasImportantes.forEach(palavra => {
        if (texto.includes(palavra.toLowerCase())) {
          encontradas.add(palavra);
        }
      });
    });

    return Array.from(encontradas);
  }

  extrairNomes(historico) {
    const nomes = new Set();
    historico.forEach(msg => {
      const texto = msg.texto || '';
      // Simples: primeira palavra capitalizada
      const palavras = texto.split(' ');
      palavras.forEach(palavra => {
        if (palavra[0] === palavra[0].toUpperCase() && palavra.length > 2) {
          nomes.add(palavra);
        }
      });
    });
    return Array.from(nomes);
  }

  extrairNumeros(historico) {
    const numeros = new Set();
    historico.forEach(msg => {
      const texto = msg.texto || '';
      const matches = texto.match(/\b\d+(?:[\.,]\d+)?\b/g) || [];
      matches.forEach(n => numeros.add(n));
    });
    return Array.from(numeros);
  }

  analisarTom(historico) {
    if (historico.length === 0) return 'FORMAL';

    const textos = historico.map(m => m.texto || '').join(' ').toLowerCase();
    const emojisCount = (historico.join('') || '').match(/[\u{1F300}-\u{1F9FF}]/gu)?.length || 0;
    const exclamacoes = (textos.match(/!/g) || []).length;
    const abreviacoes = (textos.match(/\b[a-z]{1,3}\b/g) || []).length;

    if (emojisCount > 0 || abreviacoes > 5) return 'CASUAL';
    if (exclamacoes > 2) return 'ENTUSIASMADO';
    return 'FORMAL';
  }

  // LÓGICA 4: Reconhecer interesse REAL vs educado
  reconhecerInteresseReal(texto, historico = []) {
    const textoLower = String(texto || '').toLowerCase();

    // Sinais de interesse GENUÍNO
    const sinaisAltos = ['topa', 'topada', 'passa', 'manda', 'link', 'quero', 'como pago', 'quando'];
    const sinaisMedios = ['interessante', 'legal', 'faz sentido', 'entendi', 'qual plano'];
    const sinaisBaixos = ['ok', 'tá', 'talvez', 'pode ser', 'depois'];
    const sinaisNegativos = ['não', 'nope', 'não serve', 'não preciso'];

    let score = 0;

    if (sinaisAltos.some(s => textoLower.includes(s))) score = 100;
    else if (sinaisMedios.some(s => textoLower.includes(s))) score = 60;
    else if (sinaisBaixos.some(s => textoLower.includes(s))) score = 20;
    else if (sinaisNegativos.some(s => textoLower.includes(s))) score = 0;

    // Ajusta baseado em histórico (respondeu rápido = mais interesse)
    if (historico.length > 0) {
      const ultimaMensagem = historico[historico.length - 1];
      const tempoSdeResposta = Date.now() - (ultimaMensagem.timestamp || 0);

      if (tempoSdeResposta < 2 * 60 * 1000) score += 20; // Respondeu rápido
      if (tempoSdeResposta > 60 * 60 * 1000) score -= 20; // Respondeu lento
    }

    const nivelInteresse = score >= 80 ? 'MUITO_ALTO' :
                          score >= 50 ? 'ALTO' :
                          score >= 30 ? 'MÉDIO' :
                          score >= 10 ? 'BAIXO' : 'NENHUM';

    return {
      score: Math.max(0, Math.min(100, score)),
      nivel: nivelInteresse,
      recomendacao: this.obterRecomendacaoPorInteresse(nivelInteresse)
    };
  }

  obterRecomendacaoPorInteresse(nivel) {
    const recomendacoes = {
      MUITO_ALTO: {
        acao: 'FECHAR_AGORA',
        mensagem: 'Enviar link de compra sem mais perguntas'
      },
      ALTO: {
        acao: 'RECOMENDAR_E_OFERECER',
        mensagem: 'Recomendar plano + oferecer link com garantia'
      },
      MÉDIO: {
        acao: 'OFERECER_DIAGNÓSTICO',
        mensagem: 'Sugerir diagnóstico para esclarecer dúvidas'
      },
      BAIXO: {
        acao: 'ESCUTA_E_PERGUNTAS',
        mensagem: 'Fazer perguntas de validação para entender dúvida'
      },
      NENHUM: {
        acao: 'RESPEITAR_E_DEIXAR_ABERTO',
        mensagem: 'Respeitar desejo, deixar aberto para futuro'
      }
    };

    return recomendacoes[nivel];
  }

  // LÓGICA 5: Adaptar TON baseado no tipo de cliente
  identificarTipoCliente(leadData, historico = []) {
    const textoCompleto = historico.map(m => m.texto || '').join(' ').toLowerCase();
    let tipoMelhorEncaixe = 'VENDEDOR_PURO';
    let confianca = 0;

    for (const [tipo, dados] of Object.entries(this.tiposCliente)) {
      const matches = dados.sinais.filter(s => textoCompleto.includes(s.toLowerCase())).length;

      if (matches > confianca) {
        confianca = matches;
        tipoMelhorEncaixe = tipo;
      }
    }

    return {
      tipo: tipoMelhorEncaixe,
      confianca,
      dados: this.tiposCliente[tipoMelhorEncaixe]
    };
  }

  // Adapta resposta baseado no tipo de cliente
  adaptarRespostaPorTipo(mensagem, tipoCliente) {
    const adaptacoes = {
      EMPREENDEDOR_APAIXONADO: {
        prefixo: '💡 ',
        focar: 'crescimento',
        exemplo: 'Isso vai potencializar seu negócio'
      },
      EXECUTIVO_OCUPADO: {
        prefixo: '📊 ',
        focar: 'ROI',
        exemplo: 'Recupera 1 venda = 6 meses pagos'
      },
      PROFISSIONAL_CRIATIVO: {
        prefixo: '✨ ',
        focar: 'apresentação',
        exemplo: 'Ficaria bem mais profissional'
      },
      SERVIÇOS_TÉCNICOS: {
        prefixo: '✅ ',
        focar: 'confiança',
        exemplo: 'Passaria muito mais profissionalismo'
      },
      VENDEDOR_PURO: {
        prefixo: '🎯 ',
        focar: 'vendas',
        exemplo: 'Você fecharia MUITO mais'
      }
    };

    const adaptacao = adaptacoes[tipoCliente] || adaptacoes.VENDEDOR_PURO;
    return `${adaptacao.prefixo}${mensagem}`;
  }

  // Gera resposta que MOSTRA que escutou
  gerarRespostaQueMostraEscuta(contexto, emoção, tipoCliente) {
    const { principalDor, ticketMedio, palavrasChave } = contexto;
    const { dados: dadosEmocao } = emoção;

    // Reconecta com o que cliente falou
    let resposta = '';

    if (palavrasChave.includes('perder')) {
      resposta = `Entendi: você está **perdendo vendas**`;
    } else if (palavrasChave.includes('cliente')) {
      resposta = `Pelo que você falou, o maior desafio é **com clientes**`;
    } else if (palavrasChave.includes('proposta')) {
      resposta = `Você mencionou **propostas**. Isso é chave`;
    }

    resposta += '. Justamente por isso o FechaPro foi criado.';

    return resposta;
  }
}

module.exports = EmpathyEngine;
