// Classificador de leads: intenção, categoria, etapa comercial, temperatura
class LeadClassifier {
  constructor() {
    this.leads = new Map(); // telefone -> lead data
  }

  normalizeText(texto) {
    return String(texto || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  classify(telefone, texto, historicoAtual = []) {
    let leadData = this.leads.get(telefone) || this.createDefaultLead(telefone);

    // Extrair informações do histórico
    if (historicoAtual.length > 0) {
      const ultimaMensagem = historicoAtual[historicoAtual.length - 1];
      if (ultimaMensagem.role === 'user') {
        leadData.ultimaMensagem = ultimaMensagem.parts?.[0]?.text || '';
      }
    }

    const t = this.normalizeText(texto);

    // Identificar intenção
    leadData.intencao = this.identificarIntencao(t, leadData);
    leadData.categoria = this.identificarCategoria(t, leadData);
    leadData.principal_dor = this.identificarDor(t, leadData);
    leadData.etapa_comercial = this.identificarEtapa(t, leadData);
    leadData.temperatura = this.identificarTemperatura(t, leadData);

    // Atualizar timestamp
    leadData.ultima_atividade = new Date().toISOString();

    this.leads.set(telefone, leadData);
    return leadData;
  }

  identificarIntencao(t, leadData) {
    // Novo interessado
    if (['como funciona', 'serve pra qu', 'pra qu', 'o qu eh', 'conhecendo', 'primeira vez', 'sou novo'].some(p => t.includes(p))) {
      return 'NOVO_INTERESSADO';
    }

    // Quer saber preço
    if (['quanto custa', 'qual o preco', 'valor', 'caro', 'custa', 'investimento', 'tabela de precos'].some(p => t.includes(p))) {
      return 'QUER_PRECO';
    }

    // Diagnóstico realizado
    if (['fiz o diagnostico', 'resultado', 'meu resultado', 'deu', '%'].some(p => t.includes(p))) {
      return 'DIAGNOSTICO_REALIZADO';
    }

    // Quer demonstração
    if (['demo', 'ver funcionando', 'quero ver', 'como funciona na pratica', 'mostrar'].some(p => t.includes(p))) {
      return 'QUER_DEMO';
    }

    // Pronto para comprar
    if (['como contrato', 'quero o plano', 'como pago', 'como começo', 'comprar', 'contratar', 'vou pegar'].some(p => t.includes(p))) {
      return 'PRONTO_COMPRA';
    }

    // Cliente em implantação
    if (['ja comprei', 'quando fica pronto', 'como comeca', 'implantacao', 'onboarding', 'como uso', 'nunca usei'].some(p => t.includes(p))) {
      return 'CLIENTE_IMPLANTACAO';
    }

    // Suporte técnico
    if (['nao consigo', 'deu erro', 'problema', 'nao funciona', 'travou', 'bug', 'erro', 'tela branca'].some(p => t.includes(p))) {
      return 'SUPORTE_TECNICO';
    }

    // Financeiro
    if (['pagamento', 'nota fiscal', 'cancelamento', 'reembolso', 'fatura', 'cobranca', 'assinatura'].some(p => t.includes(p))) {
      return 'FINANCEIRO';
    }

    // Parceria ou indicação
    if (['indicacao', 'parceria', 'trabalho com', 'marketing', 'revendedor', 'afiliado'].some(p => t.includes(p))) {
      return 'PARCERIA';
    }

    // Sem contexto - cliente existente ou nova pergunta
    if (leadData.categoria === 'CLIENTE' || leadData.etapa_comercial === 'CLIENTE') {
      return 'CLIENTE_DUVIDA';
    }

    return 'INDEFINIDO';
  }

  identificarCategoria(t, leadData) {
    // Determinar categoria baseado em intenção + contexto histórico
    const intencao = leadData.intencao;

    if (intencao === 'PRONTO_COMPRA' || intencao === 'CLIENTE_IMPLANTACAO' || intencao === 'FINANCEIRO') {
      return 'CLIENTE';
    }

    if (intencao === 'SUPORTE_TECNICO') {
      return 'SUPORTE';
    }

    if (intencao === 'NOVO_INTERESSADO' || intencao === 'INDEFINIDO') {
      return 'LEAD';
    }

    return leadData.categoria || 'LEAD';
  }

  identificarDor(t, leadData) {
    if (['cliente nao responde', 'cliente some', 'some', 'visualiza'].some(p => t.includes(p))) {
      return 'CLIENTE_DESAPARECE';
    }
    if (['desconto', 'negocia', 'reduz'].some(p => t.includes(p))) {
      return 'NEGOCIA_DESCONTO';
    }
    if (['demora', 'tempo', 'lento', 'rapido'].some(p => t.includes(p))) {
      return 'PROCESSO_LENTO';
    }
    if (['nao encontro cliente', 'achar cliente', 'conseguir cliente', 'mais vendas'].some(p => t.includes(p))) {
      return 'AQUISICAO_CLIENTE';
    }
    if (['organizar', 'desorganizado', 'control', 'acompanhar'].some(p => t.includes(p))) {
      return 'FALTA_ORGANIZACAO';
    }
    if (['profissional', 'pagina', 'site', 'presenca'].some(p => t.includes(p))) {
      return 'PRESENCA_PROFISSIONAL';
    }
    if (['pagamento', 'receber', 'pix'].some(p => t.includes(p))) {
      return 'RECEBIMENTO_PAGAMENTO';
    }

    return leadData.principal_dor || 'NAO_IDENTIFICADA';
  }

  identificarEtapa(t, leadData) {
    const intencao = leadData.intencao;

    if (intencao === 'NOVO_INTERESSADO' || intencao === 'INDEFINIDO') return 'LEAD_NOVO';
    if (['qual eh seu servico', 'como voce vende', 'quantos orcamentos'].some(p => t.includes(p))) return 'QUALIFICACAO';
    if (intencao === 'DIAGNOSTICO_REALIZADO') return 'DIAGNOSTICO';
    if (intencao === 'QUER_DEMO') return 'DEMO';
    if (intencao === 'QUER_PRECO') return 'PLANO_RECOMENDADO';
    if (['qual plano', 'recomenda', 'anual', 'mensal', 'vitalicio'].some(p => t.includes(p))) return 'PLANO_RECOMENDADO';
    if (intencao === 'PRONTO_COMPRA') return 'FECHAMENTO';
    if (leadData.etapa_comercial === 'CLIENTE') return 'CLIENTE';
    if (intencao === 'CLIENTE_IMPLANTACAO') return 'CLIENTE_ONBOARDING';
    if (intencao === 'SUPORTE_TECNICO') return 'SUPORTE';
    if (intencao === 'FINANCEIRO') return 'FINANCEIRO';
    if (intencao === 'PARCERIA') return 'PARCERIA';

    return leadData.etapa_comercial || 'LEAD_NOVO';
  }

  identificarTemperatura(t, leadData) {
    let score = 0;

    // Sinais quentes
    if (leadData.intencao === 'PRONTO_COMPRA') score += 30;
    if (leadData.intencao === 'QUER_PRECO') score += 15;
    if (leadData.intencao === 'QUER_DEMO') score += 15;
    if (['sim', 'quero', 'interessado', 'pode ser', 'talvez'].some(p => t.includes(p))) score += 5;
    if (['urgente', 'rapido', 'logo', 'agora', 'ja'].some(p => t.includes(p))) score += 10;

    // Sinais mornos
    if (leadData.intencao === 'NOVO_INTERESSADO') score += 10;
    if (['vou pensar', 'talvez depois', 'deixa pra depois'].some(p => t.includes(p))) score -= 10;
    if (['nao sei', 'preciso ver', 'pesquisando'].some(p => t.includes(p))) score += 5;

    // Sinais frios
    if (['nao tenho interesse', 'nao combina', 'muito caro'].some(p => t.includes(p))) score -= 20;
    if (['pode cancelar', 'nao quero'].some(p => t.includes(p))) score -= 30;
    if (leadData.intencao === 'INDEFINIDO' && !t.includes('fech')) score = 5;

    // Fator de frequência: mais mensagens = mais engajamento
    const historicoLength = leadData.historicoTamanho || 1;
    if (historicoLength > 3) score += 5;

    if (score >= 35) return 'PRONTO_FECHAR';
    if (score >= 20) return 'QUENTE';
    if (score >= 5) return 'MORNO';
    return 'FRIO';
  }

  createDefaultLead(telefone) {
    return {
      telefone,
      nome: '',
      empresa: '',
      segmento: '',
      cidade: '',
      origem: '',
      intencao: 'INDEFINIDO',
      principal_dor: 'NAO_IDENTIFICADA',
      como_envia_orcamento: '',
      quantidade_orcamentos_mes: 0,
      tem_site: null,
      tem_google_meu_negocio: null,
      urgencia: '',
      temperatura: 'FRIO',
      etapa_comercial: 'LEAD_NOVO',
      plano_recomendado: '',
      proxima_acao: '',
      precisa_humano: false,
      resumo_conversa: '',
      historicoTamanho: 0,
      ultima_atividade: new Date().toISOString(),
      criado_em: new Date().toISOString(),
    };
  }

  obterLead(telefone) {
    return this.leads.get(telefone) || this.createDefaultLead(telefone);
  }

  atualizarLead(telefone, dados) {
    const lead = this.leads.get(telefone) || this.createDefaultLead(telefone);
    Object.assign(lead, dados, { ultima_atividade: new Date().toISOString() });
    this.leads.set(telefone, lead);
    return lead;
  }
}

module.exports = LeadClassifier;
