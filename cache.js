const logger = require('./logger');

class CacheManager {
  constructor(ttlMs = 5 * 60 * 1000) {
    this.cache = new Map();
    this.ttl = ttlMs; // 5 minutos padrão
    this.hits = 0;
    this.misses = 0;
  }

  set(chave, valor, ttl = this.ttl) {
    const expiresAt = Date.now() + ttl;
    this.cache.set(chave, { valor, expiresAt });
    logger.debug(`Cache SET: ${chave}`);
  }

  get(chave) {
    const item = this.cache.get(chave);

    if (!item) {
      this.misses++;
      return null;
    }

    if (Date.now() > item.expiresAt) {
      this.cache.delete(chave);
      this.misses++;
      logger.debug(`Cache EXPIRED: ${chave}`);
      return null;
    }

    this.hits++;
    logger.debug(`Cache HIT: ${chave}`);
    return item.valor;
  }

  delete(chave) {
    this.cache.delete(chave);
    logger.debug(`Cache DELETE: ${chave}`);
  }

  clear() {
    const tamanho = this.cache.size;
    this.cache.clear();
    logger.info(`Cache limpo: ${tamanho} itens removidos`);
  }

  obterEstatisticas() {
    const total = this.hits + this.misses;
    const taxa = total > 0 ? Math.round((this.hits / total) * 100) : 0;

    return {
      tamanho: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      total,
      taxaAcerto: `${taxa}%`,
      memoria: Math.round(this.calcularTamanhoMemoria() / 1024),
    };
  }

  calcularTamanhoMemoria() {
    let tamanho = 0;
    for (const item of this.cache.values()) {
      tamanho += JSON.stringify(item.valor).length;
    }
    return tamanho;
  }

  limparExpirados() {
    const agora = Date.now();
    let removidos = 0;

    for (const [chave, item] of this.cache.entries()) {
      if (agora > item.expiresAt) {
        this.cache.delete(chave);
        removidos++;
      }
    }

    if (removidos > 0) {
      logger.debug(`Cache: ${removidos} itens expirados removidos`);
    }
  }

  resetarEstatisticas() {
    this.hits = 0;
    this.misses = 0;
  }
}

module.exports = CacheManager;
