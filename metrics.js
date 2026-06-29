const fs = require('fs');
const path = require('path');

class MetricsManager {
  constructor() {
    this.metricsFile = path.join(__dirname, 'metrics.jsonl');
    this.metricsEmMemoria = [];
    this.carregarMetricas();
  }

  carregarMetricas() {
    if (!fs.existsSync(this.metricsFile)) return;
    try {
      const linhas = fs.readFileSync(this.metricsFile, 'utf8').split('\n').filter(l => l.trim());
      // Manter últimas 10k linhas em memória (últimas ~1 semana)
      const todas = linhas.map(l => {
        try { return JSON.parse(l); } catch { return null; }
      }).filter(l => l !== null);
      this.metricsEmMemoria = todas.slice(-10000);
    } catch (err) {
      console.log(`⚠️ Erro ao carregar métricas: ${err.message}`);
    }
  }

  registrarRespostaIA({ telefone, tamanho, fonte, truncado = false }) {
    const registro = {
      telefone,
      tamanho: Math.floor(tamanho),
      fonte: fonte === 'ia' ? 'ia' : 'roteiro',
      truncado,
      timestamp: new Date().toISOString(),
    };

    this.metricsEmMemoria.push(registro);
    if (this.metricsEmMemoria.length > 10000) this.metricsEmMemoria.shift();

    fs.appendFileSync(this.metricsFile, `${JSON.stringify(registro)}\n`, 'utf8');
    this.rotacionarMetricasSeNecessario();
  }

  rotacionarMetricasSeNecessario() {
    try {
      const stats = fs.statSync(this.metricsFile);
      if (stats.size > 50 * 1024 * 1024) {
        const backup = `${this.metricsFile}.${Date.now()}`;
        fs.renameSync(this.metricsFile, backup);
        console.log(`📈 Métricas rotacionadas`);
      }
    } catch {}
  }

  obterResumoIA() {
    const hoje = new Date().toDateString();
    const metricsHoje = this.metricsEmMemoria.filter(m => {
      const d = new Date(m.timestamp).toDateString();
      return d === hoje;
    });

    if (metricsHoje.length === 0) {
      return {
        total: 0,
        iaCount: 0,
        roteiroCount: 0,
        iaPercent: 0,
        roteiroPercent: 0,
        tamanhoMedio: 0,
        truncadas: 0,
      };
    }

    const iaCount = metricsHoje.filter(m => m.fonte === 'ia').length;
    const roteiroCount = metricsHoje.filter(m => m.fonte === 'roteiro').length;
    const truncadas = metricsHoje.filter(m => m.truncado).length;
    const tamanhosIa = metricsHoje.filter(m => m.fonte === 'ia').map(m => m.tamanho);

    return {
      total: metricsHoje.length,
      iaCount,
      roteiroCount,
      iaPercent: Math.round((iaCount / metricsHoje.length) * 100),
      roteiroPercent: Math.round((roteiroCount / metricsHoje.length) * 100),
      tamanhoMedio: tamanhosIa.length > 0 ? Math.round(tamanhosIa.reduce((a, b) => a + b, 0) / tamanhosIa.length) : 0,
      truncadas,
    };
  }
}

module.exports = MetricsManager;
