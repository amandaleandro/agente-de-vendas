/**
 * LeadScorer - Sistema de scoring de leads
 * Calcula probabilidade de conversão baseado em comportamento
 */

class LeadScorer {
  constructor() {
    this.scoresPorLead = new Map();
    this.historicoLead = new Map();
  }

  /**
   * Calcula score de um lead baseado em diversos fatores
   * Score vai de 0 a 100
   */
  calcularScore(telefone, dados = {}) {
    let score = 0;

    // 1. Engajamento (0-25 pontos)
    if (dados.respondeu) score += 10;
    if (dados.fezPerguntas) score += 8;
    if (dados.respostasRapidas) score += 7; // Respondeu rápido = mais interessado

    // 2. Identificação de Dor (0-25 pontos)
    if (dados.temDorIdentificada) score += 15;
    if (dados.dor === 'cliente_nao_responde') score += 10; // Dor principal
    if (dados.dor === 'preco_alto') score -= 5; // Objeção de preço = menos chances

    // 3. Progresso na Conversa (0-20 pontos)
    if (dados.etapa === 'apresentacao') score += 0;
    if (dados.etapa === 'dor') score += 5;
    if (dados.etapa === 'diagnostico') score += 10;
    if (dados.etapa === 'permissao_produto') score += 15;
    if (dados.etapa === 'perguntou_produto') score += 20;

    // 4. Interesse em Solução (0-15 pontos)
    if (dados.pediumDiagnostico) score += 10;
    if (dados.perguntouPreco) score += 8;
    if (dados.perguntouComoFunciona) score += 12;

    // 5. Volume/Tamanho (0-15 pontos)
    if (dados.volumeOramentos >= 20) score += 10; // Alto volume = mais necessidade
    if (dados.categoriaDados?.includes('tech')) score += 5; // Tech scores melhor

    // Limpar entre 0-100
    score = Math.max(0, Math.min(100, score));

    // Guardar histórico
    const scorePorPeriodo = this.scoresPorLead.get(telefone) || [];
    scorePorPeriodo.push({
      score,
      timestamp: new Date(),
      dados
    });

    // Manter últimos 20 scores
    if (scorePorPeriodo.length > 20) {
      scorePorPeriodo.shift();
    }

    this.scoresPorLead.set(telefone, scorePorPeriodo);

    return {
      score,
      nivel: this.nivelScore(score),
      tendencia: this.calcularTendencia(telefone),
      proximaAcao: this.recomendarAcao(score, dados)
    };
  }

  /**
   * Classifica nível de score
   */
  nivelScore(score) {
    if (score >= 80) return 'HOT'; // 🔥 Muito quente, fechar agora
    if (score >= 60) return 'WARM'; // 🟠 Quente, perseguir
    if (score >= 40) return 'COLD'; // 🔵 Frio, cultivar
    return 'DEAD'; // ❌ Morto, deixar ir
  }

  /**
   * Calcula tendência do score (está subindo ou descendo?)
   */
  calcularTendencia(telefone) {
    const scores = this.scoresPorLead.get(telefone) || [];
    if (scores.length < 2) return 'NEUTRAL';

    const ultimoScore = scores[scores.length - 1].score;
    const scoreAnterior = scores[scores.length - 2].score;
    const diferenca = ultimoScore - scoreAnterior;

    if (diferenca > 10) return 'SUBINDO'; // ⬆️
    if (diferenca < -10) return 'CAINDO'; // ⬇️
    return 'ESTÁVEL'; // ➡️
  }

  /**
   * Recomenda próxima ação baseada no score
   */
  recomendarAcao(score, dados) {
    if (score >= 80) {
      return {
        acao: 'FECHAR',
        mensagem: 'Ofereça diagnóstico + link de compra NOW',
        urgencia: 'MÁXIMA'
      };
    }

    if (score >= 60) {
      return {
        acao: 'PERSEGUIR',
        mensagem: 'Envie diagnóstico, faça follow-up em 4h',
        urgencia: 'ALTA'
      };
    }

    if (score >= 40) {
      return {
        acao: 'CULTIVAR',
        mensagem: 'Continue dialogando, identifique mais dor',
        urgencia: 'MÉDIA'
      };
    }

    return {
      acao: 'DEIXAR',
      mensagem: 'Sem interesse claro, parar contato',
      urgencia: 'BAIXA'
    };
  }

  /**
   * Obtém score atual de um lead
   */
  obterScoreAtual(telefone) {
    const scores = this.scoresPorLead.get(telefone);
    if (!scores || scores.length === 0) return null;
    return scores[scores.length - 1];
  }

  /**
   * Lista leads por score (HOT → DEAD)
   */
  listaPorPrioridade() {
    const listas = {
      HOT: [],
      WARM: [],
      COLD: [],
      DEAD: []
    };

    for (const [telefone, scores] of this.scoresPorLead.entries()) {
      if (scores.length === 0) continue;

      const ultimoScore = scores[scores.length - 1];
      const nivel = this.nivelScore(ultimoScore.score);
      listas[nivel].push({
        telefone,
        score: ultimoScore.score,
        timestamp: ultimoScore.timestamp
      });
    }

    // Ordenar por score descrescente
    for (const nivel in listas) {
      listas[nivel].sort((a, b) => b.score - a.score);
    }

    return listas;
  }

  /**
   * Retorna estatísticas gerais
   */
  obterEstatisticas() {
    const scores = Array.from(this.scoresPorLead.values())
      .map(s => s[s.length - 1]?.score || 0);

    if (scores.length === 0) {
      return {
        totalLeads: 0,
        scoreMedio: 0,
        distribuicao: {}
      };
    }

    const scoreMedio = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);

    const distribuicao = {
      HOT: scores.filter(s => s >= 80).length,
      WARM: scores.filter(s => s >= 60 && s < 80).length,
      COLD: scores.filter(s => s >= 40 && s < 60).length,
      DEAD: scores.filter(s => s < 40).length
    };

    return {
      totalLeads: scores.length,
      scoreMedio: parseFloat(scoreMedio),
      distribuicao,
      potencialConversao: distribuicao.HOT + distribuicao.WARM
    };
  }
}

module.exports = LeadScorer;
