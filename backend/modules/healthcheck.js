const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

class HealthCheck {
  constructor(pool) {
    this.pool = pool;
    this.status = {
      database: 'unknown',
      whatsapp: 'unknown',
      disk: 'unknown',
      memory: 'unknown',
      timestamp: new Date().toISOString(),
    };
  }

  async verificarBancoDados() {
    try {
      this.pool.connectionTimeoutMillis = 2000;
      const client = await Promise.race([
        this.pool.connect(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
      ]);
      await client.query('SELECT NOW()');
      client.release();
      this.status.database = 'healthy';
      return true;
    } catch (err) {
      this.status.database = `warning: ${err.message}`;
      logger.debug('Health check: banco indisponível (continuando offline)');
      return false;
    }
  }

  async verificarWhatsApp(socketsConectados) {
    try {
      if (socketsConectados && socketsConectados.size > 0) {
        this.status.whatsapp = `healthy (${socketsConectados.size} conectado)`;
        return true;
      } else {
        this.status.whatsapp = 'disconnected';
        return false;
      }
    } catch (err) {
      this.status.whatsapp = `error: ${err.message}`;
      logger.error('Health check: whatsapp', err);
      return false;
    }
  }

  verificarEspacoDisco() {
    try {
      const dir = __dirname;
      const stats = fs.statSync(dir);
      const tamanhoMb = stats.size / (1024 * 1024);

      if (tamanhoMb > 500) {
        this.status.disk = `warning: ${Math.round(tamanhoMb)}MB`;
        return 'warning';
      }
      this.status.disk = 'healthy';
      return true;
    } catch (err) {
      this.status.disk = `error: ${err.message}`;
      logger.error('Health check: disco', err);
      return false;
    }
  }

  verificarMemoria() {
    try {
      const used = process.memoryUsage();
      const heapUsedMb = Math.round(used.heapUsed / 1024 / 1024);
      const heapTotalMb = Math.round(used.heapTotal / 1024 / 1024);
      const percentual = Math.round((used.heapUsed / used.heapTotal) * 100);

      this.status.memory = {
        used: `${heapUsedMb}MB`,
        total: `${heapTotalMb}MB`,
        percent: percentual,
      };

      if (percentual > 95) {
        logger.debug('Uso de memória crítico', { percentual });
        return 'critical';
      }
      if (percentual > 85) {
        logger.debug('Uso de memória alto', { percentual });
        return 'warning';
      }

      return 'healthy';
    } catch (err) {
      this.status.memory = `error: ${err.message}`;
      logger.error('Health check: memória', err);
      return false;
    }
  }

  async verificarArquivos() {
    const arquivos = {
      fila: fs.existsSync(path.join(__dirname, 'fila_mensagens.jsonl')),
      warmup: fs.existsSync(path.join(__dirname, 'warmup_stats.jsonl')),
      metrics: fs.existsSync(path.join(__dirname, 'metrics.jsonl')),
      logs: fs.existsSync(path.join(__dirname, 'logs')),
    };

    this.status.arquivos = arquivos;
    return true;
  }

  async obterStatusCompleto(socketsConectados) {
    await this.verificarBancoDados();
    await this.verificarWhatsApp(socketsConectados);
    this.verificarEspacoDisco();
    this.verificarMemoria();
    await this.verificarArquivos();

    this.status.timestamp = new Date().toISOString();
    this.status.uptime = `${Math.round(process.uptime())}s`;

    return this.status;
  }

  ehSaudavel() {
    return (
      this.status.database === 'healthy' &&
      this.status.whatsapp !== 'disconnected' &&
      this.status.disk === 'healthy'
    );
  }
}

module.exports = HealthCheck;
