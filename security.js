// Segurança: autenticação + rate limit
const net = require('net');

class SecurityManager {
  constructor() {
    this.apiKey = process.env.PAINEL_API_KEY || null;
    this.logouAvisoKey = false;
    this.limitadorTaxa = new Map(); // ip -> { count, inicio }
    this.limiteRequisicoes = 60; // 60 requisições por minuto
    this.janelaMs = 60 * 1000; // 1 minuto
  }

  obterIp(req) {
    return req.headers['x-forwarded-for']?.split(',')[0].trim() ||
           req.socket.remoteAddress ||
           '127.0.0.1';
  }

  verificarTaxa(req) {
    const ip = this.obterIp(req);
    const agora = Date.now();

    let entrada = this.limitadorTaxa.get(ip);
    if (!entrada || agora - entrada.inicio >= this.janelaMs) {
      entrada = { count: 0, inicio: agora };
    }

    entrada.count++;
    this.limitadorTaxa.set(ip, entrada);

    return entrada.count <= this.limiteRequisicoes;
  }

  verificarApiKey(req) {
    // Se modo dev sem autenticação, permite tudo
    if (process.env.DEV_NO_AUTH === 'true') {
      return true;
    }

    if (!this.apiKey) {
      if (!this.logouAvisoKey) {
        console.log('⚠️ PAINEL_API_KEY não está definida. Autenticação desativada (modo dev).');
        this.logouAvisoKey = true;
      }
      return true;
    }

    const chaveRecebida = req.headers['x-api-key'] || '';
    return chaveRecebida === this.apiKey;
  }

  ehRotaAberta(url) {
    return url === '/';
  }

  ehRotaApi(url) {
    return url.startsWith('/api/');
  }
}

module.exports = SecurityManager;
