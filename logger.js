const fs = require('fs');
const path = require('path');

class Logger {
  constructor() {
    this.logsDir = path.join(__dirname, 'logs');
    this.ensureLogsDir();
    this.logFile = path.join(this.logsDir, `app-${new Date().toISOString().split('T')[0]}.log`);
    this.errorFile = path.join(this.logsDir, `errors-${new Date().toISOString().split('T')[0]}.log`);
  }

  ensureLogsDir() {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  formatLog(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const log = {
      timestamp,
      level,
      message,
      ...data,
      pid: process.pid,
    };
    return JSON.stringify(log);
  }

  write(file, log) {
    try {
      fs.appendFileSync(file, log + '\n', 'utf8');
    } catch (err) {
      console.error('Erro ao escrever log:', err);
    }
  }

  info(message, data = {}) {
    const log = this.formatLog('INFO', message, data);
    console.log(`ℹ️  ${message}`);
    this.write(this.logFile, log);
  }

  warn(message, data = {}) {
    const log = this.formatLog('WARN', message, data);
    console.warn(`⚠️  ${message}`);
    this.write(this.logFile, log);
  }

  error(message, err = null, data = {}) {
    const errorData = err ? {
      error: err.message,
      stack: err.stack,
      code: err.code,
    } : {};
    const log = this.formatLog('ERROR', message, { ...data, ...errorData });
    console.error(`❌ ${message}`);
    this.write(this.logFile, log);
    this.write(this.errorFile, log);
  }

  debug(message, data = {}) {
    if (process.env.DEBUG === 'true') {
      const log = this.formatLog('DEBUG', message, data);
      console.debug(`🐛 ${message}`);
      this.write(this.logFile, log);
    }
  }

  success(message, data = {}) {
    const log = this.formatLog('SUCCESS', message, data);
    console.log(`✅ ${message}`);
    this.write(this.logFile, log);
  }

  obterUltimosLogs(linhas = 100) {
    try {
      const conteudo = fs.readFileSync(this.logFile, 'utf8');
      return conteudo.split('\n').slice(-linhas).filter(l => l.trim());
    } catch {
      return [];
    }
  }

  obterUltimosErros(linhas = 50) {
    try {
      const conteudo = fs.readFileSync(this.errorFile, 'utf8');
      return conteudo.split('\n').slice(-linhas).filter(l => l.trim());
    } catch {
      return [];
    }
  }

  limparLogsAntigos(diasRetencao = 7) {
    try {
      const arquivos = fs.readdirSync(this.logsDir);
      const agora = Date.now();
      const msPodia = diasRetencao * 24 * 60 * 60 * 1000;

      for (const arquivo of arquivos) {
        const caminho = path.join(this.logsDir, arquivo);
        const stats = fs.statSync(caminho);
        if (agora - stats.mtime.getTime() > msPodia) {
          fs.unlinkSync(caminho);
          this.info(`Log antigo removido: ${arquivo}`);
        }
      }
    } catch (err) {
      this.error('Erro ao limpar logs antigos', err);
    }
  }
}

module.exports = new Logger();
