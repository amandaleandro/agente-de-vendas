const logger = require('./logger');

class RateLimiter {
  constructor() {
    this.limitadores = new Map(); // ip -> { endpoints -> { count, resetEm } }
    this.config = {
      global: { limite: 100, janela: 60000 }, // 100 req/min global
      '/api/lista': { limite: 10, janela: 60000 }, // 10 req/min
      '/api/iniciar': { limite: 5, janela: 60000 },
      '/api/tank/gerar': { limite: 3, janela: 60000 },
      '/api/tank/carregar': { limite: 5, janela: 60000 },
      default: { limite: 30, janela: 60000 },
    };
  }

  obterIp(req) {
    return req.headers['x-forwarded-for']?.split(',')[0].trim() ||
           req.socket.remoteAddress ||
           '127.0.0.1';
  }

  verificar(req, endpoint = null) {
    const ip = this.obterIp(req);
    const chaveEndpoint = endpoint || req.url.split('?')[0];
    const config = this.config[chaveEndpoint] || this.config.default;

    if (!this.limitadores.has(ip)) {
      this.limitadores.set(ip, {});
    }

    const ipData = this.limitadores.get(ip);
    const agora = Date.now();

    if (!ipData[chaveEndpoint]) {
      ipData[chaveEndpoint] = {
        count: 0,
        resetEm: agora + config.janela,
      };
    }

    const endpoint_data = ipData[chaveEndpoint];

    // Reset se a janela expirou
    if (agora > endpoint_data.resetEm) {
      endpoint_data.count = 0;
      endpoint_data.resetEm = agora + config.janela;
    }

    endpoint_data.count++;

    if (endpoint_data.count > config.limite) {
      logger.warn('Rate limit excedido', {
        ip,
        endpoint: chaveEndpoint,
        limite: config.limite,
        tentativas: endpoint_data.count,
      });
      return false;
    }

    return true;
  }

  obterStatusIp(ip) {
    const ipData = this.limitadores.get(ip);
    if (!ipData) return null;

    const status = {};
    for (const [endpoint, data] of Object.entries(ipData)) {
      const config = this.config[endpoint] || this.config.default;
      const tempoRestante = Math.max(0, data.resetEm - Date.now());

      status[endpoint] = {
        usado: data.count,
        limite: config.limite,
        restante: Math.max(0, config.limite - data.count),
        resetEm: new Date(data.resetEm).toISOString(),
        tempoRestanteMs: tempoRestante,
      };
    }

    return status;
  }

  limparExpirados() {
    const agora = Date.now();
    let removidos = 0;

    for (const [ip, endpoints] of this.limitadores.entries()) {
      for (const [endpoint, data] of Object.entries(endpoints)) {
        if (agora > data.resetEm) {
          delete endpoints[endpoint];
        }
      }

      if (Object.keys(endpoints).length === 0) {
        this.limitadores.delete(ip);
        removidos++;
      }
    }

    if (removidos > 0) {
      logger.debug(`Rate limiter: ${removidos} IPs expirados removidos`);
    }
  }

  obterEstatisticas() {
    return {
      totalIps: this.limitadores.size,
      endpoints: Object.keys(this.config),
    };
  }

  resetarIp(ip) {
    this.limitadores.delete(ip);
    logger.info(`Rate limiter resetado para IP`, { ip });
  }

  resetarTudo() {
    this.limitadores.clear();
    logger.info('Rate limiter resetado completamente');
  }
}

module.exports = new RateLimiter();
