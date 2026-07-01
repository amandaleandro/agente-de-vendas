/**
 * Response Selector - Seleciona respostas baseado em taxa de sucesso
 * Integra com learning-manager para otimizar respostas
 */

const learningManager = require('./learning-manager');
const logger = require('./logger');

class ResponseSelector {
  constructor() {
    this.useAiRecommendations = process.env.USE_BEST_RESPONSES === 'true';
    this.minTaxaSucesso = parseFloat(process.env.MIN_TAXA_SUCESSO) || 60; // Só usa se taxa > 60%
    this.cache = new Map(); // intencao -> melhor resposta
    this.cacheExpirado = 60000; // 1 minuto
  }

  /**
   * Obtém melhor resposta para uma intenção
   */
  obterMelhorResposta(intencao, respostaPadrao, respostasUsadas = []) {
    if (!this.useAiRecommendations) {
      return respostaPadrao; // Usar resposta padrão
    }

    try {
      // Verificar cache
      const cached = this.cache.get(intencao);
      if (cached && cached.expirado_em > Date.now()) {
        return cached.resposta || respostaPadrao;
      }

      // Obter melhor resposta do histórico
      const melhores = learningManager.obterMelhoresRespostas(intencao, 5);

      if (melhores.length === 0) {
        return respostaPadrao;
      }

      // Filtrar respostas não usadas
      const disponivel = melhores.find(m => {
        const taxaNumero = parseFloat(m.taxaSucesso);
        return taxaNumero >= this.minTaxaSucesso &&
               !respostasUsadas.some(r => r.substring(0, 50) === m.resposta.substring(0, 50));
      });

      const melhorResposta = disponivel?.resposta || respostaPadrao;

      // Cachear resultado
      this.cache.set(intencao, {
        resposta: melhorResposta,
        expirado_em: Date.now() + this.cacheExpirado
      });

      logger.debug(`✅ Resposta otimizada para ${intencao}`, {
        taxa: disponivel?.taxaSucesso || 'padrão'
      });

      return melhorResposta;
    } catch (err) {
      logger.error('❌ Erro ao selecionar resposta', { erro: err.message });
      return respostaPadrao;
    }
  }

  /**
   * Obter dados de múltiplas intenções
   */
  obterMelhoresRespostasMultiplas(intencoes = []) {
    const resultado = {};

    for (const intencao of intencoes) {
      const melhores = learningManager.obterMelhoresRespostas(intencao, 3);
      resultado[intencao] = melhores.map(m => ({
        resposta: m.resposta,
        taxa: m.taxaSucesso,
        vezes_usado: m.tentativas
      }));
    }

    return resultado;
  }

  /**
   * Score de qualidade de uma resposta
   */
  calcularScore(intencao, respostaTexto) {
    try {
      const melhores = learningManager.obterMelhoresRespostas(intencao, 10);

      const match = melhores.find(m =>
        m.resposta.substring(0, 50) === respostaTexto.substring(0, 50)
      );

      if (match) {
        return {
          score: parseFloat(match.taxaSucesso),
          posicao: melhores.indexOf(match) + 1,
          vezes_usado: match.tentativas
        };
      }

      return { score: 0, posicao: -1, vezes_usado: 0 };
    } catch (err) {
      return { score: 0, posicao: -1, vezes_usado: 0 };
    }
  }

  /**
   * Retorna status do selector
   */
  getStatus() {
    return {
      enabled: this.useAiRecommendations,
      minTaxaSucesso: this.minTaxaSucesso,
      cacheSize: this.cache.size,
      cacheExpirado: `${this.cacheExpirado / 1000}s`
    };
  }

  /**
   * Limpa cache
   */
  limparCache() {
    this.cache.clear();
    logger.info('✅ Cache de respostas limpo');
  }

  /**
   * Configurar opções
   */
  configurar(opcoes) {
    if (opcoes.useAiRecommendations !== undefined) {
      this.useAiRecommendations = opcoes.useAiRecommendations;
    }
    if (opcoes.minTaxaSucesso !== undefined) {
      this.minTaxaSucesso = opcoes.minTaxaSucesso;
    }
    logger.info('✅ Response Selector configurado', this.getStatus());
  }
}

module.exports = new ResponseSelector();
