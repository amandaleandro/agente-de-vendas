// Motor de pontuação de leads - calcula temperatura e urgência
class ScoringEngine {
  constructor() {
    this.scores = new Map(); // telefone -> score
    this.historico = new Map(); // telefone -> [eventos]
  }

  registrarEvento(telefone, evento, pontos) {
    if (!this.historico.has(telefone)) {
      this.historico.set(telefone, []);
    }
    const eventos = this.historico.get(telefone);
    eventos.push({
      evento,
      pontos,
      timestamp: new Date().toISOString(),
    });

    // Manter últimos 50 eventos
    if (eventos.length > 50) eventos.shift();

    this.recalcularScore(telefone);
  }

  calcularScore(leadData) {
    let score = 0;

    // Intenção (primária)
    const intencoesQuentes = {
      'PRONTO_COMPRA': 20,
      'QUER_PRECO': 10,
      'QUER_DEMO': 15,
      'DIAGNOSTICO_REALIZADO': 5,
    };
    score += intencoesQuentes[leadData.intencao] || 0;

    // Etapa comercial
    const etapasQuentes = {
      'FECHAMENTO': 20,
      'PLANO_RECOMENDADO': 15,
      'DEMO': 10,
      'DIAGNOSTICO': 5,
      'QUALIFICACAO': 3,
      'LEAD_NOVO': 0,
    };
    score += etapasQuentes[leadData.etapa_comercial] || 0;

    // Dor identificada (indica urgência)
    const doresUrgentes = {
      'CLIENTE_DESAPARECE': 20,
      'FALTA_ORGANIZACAO': 15,
      'PROCESSO_LENTO': 10,
      'AQUISICAO_CLIENTE': 15,
    };
    score += doresUrgentes[leadData.principal_dor] || 0;

    // Categoria
    if (leadData.categoria === 'SUPORTE' && leadData.intencao !== 'SUPORTE_TECNICO') {
      score -= 10; // Lead em suporte é menos quente (a menos que seja novo suporte)
    }

    // Sinais comportamentais
    if (leadData.como_envia_orcamento) score += 5;
    if (leadData.quantidade_orcamentos_mes > 5) score += 10;
    if (leadData.quantidade_orcamentos_mes > 20) score += 20;
    if (leadData.tem_site === true) score += 3;
    if (leadData.tem_google_meu_negocio === true) score += 3;

    // Frequência de interação (histórico tamanho)
    if (leadData.historicoTamanho > 5) score += 10;
    if (leadData.historicoTamanho > 10) score += 5;

    // Penalidades
    if (['FINANCEIRO', 'SUPORTE'].includes(leadData.categoria)) score -= 5;
    if (leadData.precisa_humano) score += 15; // Se precisa humano, é lead qualificado

    // Tempo desde última atividade (decay)
    const ultimaAtividade = new Date(leadData.ultima_atividade);
    const diasInativo = (Date.now() - ultimaAtividade.getTime()) / (1000 * 60 * 60 * 24);
    if (diasInativo > 7) score -= 10;
    if (diasInativo > 30) score -= 20;

    return Math.max(0, Math.min(100, score));
  }

  recalcularScore(telefone) {
    const eventos = this.historico.get(telefone) || [];
    let score = eventos.reduce((sum, e) => sum + e.pontos, 0);
    score = Math.max(0, Math.min(100, score));
    this.scores.set(telefone, score);
  }

  obterScore(telefone, leadData = null) {
    // Se tiver leadData, calcular baseado em atributos
    if (leadData) {
      return this.calcularScore(leadData);
    }
    return this.scores.get(telefone) || 0;
  }

  obterTemperatura(score) {
    if (score >= 76) return { temperatura: 'PRONTO_FECHAR', descricao: 'Pronto para fechamento' };
    if (score >= 51) return { temperatura: 'QUENTE', descricao: 'Lead quente' };
    if (score >= 21) return { temperatura: 'MORNO', descricao: 'Lead morno' };
    return { temperatura: 'FRIO', descricao: 'Lead frio' };
  }

  obterRecomendacao(score, leadData) {
    const { temperatura } = this.obterTemperatura(score);

    // Se QUENTE ou PRONTO, considerar escalação
    if (['QUENTE', 'PRONTO_FECHAR'].includes(temperatura)) {
      if (score >= 50) {
        return {
          acao: 'ESCALAR_HUMANO',
          motivo: `Lead com ${temperatura}. Score: ${score}. Pronto para contato personalizado.`,
          urgencia: score >= 75 ? 'MAXIMA' : 'ALTA',
        };
      }
    }

    // Se não qualificado mas está conversando, continuar engajamento
    if (temperatura === 'MORNO' && leadData.historicoTamanho >= 3) {
      return {
        acao: 'APROFUNDAR_QUALIFICACAO',
        motivo: `Lead interessado. Score ${score}. Falta informação para recomendação.`,
        urgencia: 'MEDIA',
      };
    }

    // Lead frio mas novo
    if (temperatura === 'FRIO' && leadData.etapa_comercial === 'LEAD_NOVO') {
      return {
        acao: 'QUALIFICAR',
        motivo: 'Lead novo. Iniciar fluxo de qualificação.',
        urgencia: 'BAIXA',
      };
    }

    return {
      acao: 'MANTER_ENGAJAMENTO',
      motivo: 'Continuar conversa natural.',
      urgencia: 'BAIXA',
    };
  }

  deveEscalar(leadData, score) {
    // Critérios para escalar para humano
    const criterios = {
      pronto_compra: leadData.intencao === 'PRONTO_COMPRA',
      quer_condicao_especial: leadData.principal_dor === 'NEGOCIA_DESCONTO',
      problema_tecnico: leadData.intencao === 'SUPORTE_TECNICO',
      cliente_irritado: leadData.categoria === 'SUPORTE' && leadData.historicoTamanho > 2,
      lead_qualificado_quente: score >= 50,
      muito_engajado: leadData.historicoTamanho > 5 && score > 30,
    };

    return Object.values(criterios).some(c => c === true);
  }

  gerarRelatorio(telefone, leadData) {
    const score = this.obterScore(telefone, leadData);
    const { temperatura, descricao } = this.obterTemperatura(score);
    const recomendacao = this.obterRecomendacao(score, leadData);
    const deveEscalar = this.deveEscalar(leadData, score);

    return {
      telefone,
      score,
      temperatura,
      descricao,
      recomendacao,
      deveEscalar,
      motivo_escalacao: deveEscalar ? recomendacao.motivo : null,
    };
  }
}

module.exports = ScoringEngine;
