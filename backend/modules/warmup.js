const fs = require('fs');
const path = require('path');

class WarmupManager {
  constructor() {
    this.statsFile = path.join(__dirname, 'warmup_stats.jsonl');
    this.statsEmMemoria = new Map(); // sessao -> { totalEnviados, ultimoEnvio, diaDosStats, erros, consecutivos }
    this.carregarStats();
  }

  carregarStats() {
    if (!fs.existsSync(this.statsFile)) return;
    try {
      const linhas = fs.readFileSync(this.statsFile, 'utf8').split('\n').filter(l => l.trim());
      linhas.forEach(linha => {
        const registro = JSON.parse(linha);
        if (registro.data && new Date(registro.data).toDateString() === new Date().toDateString()) {
          this.statsEmMemoria.set(registro.sessao, {
            totalEnviados: registro.totalEnviados || 0,
            erros: registro.erros || 0,
            consecutivos: registro.consecutivos || 0,
            ultimoEnvio: registro.ultimoEnvio || 0,
          });
        }
      });
    } catch (err) {
      console.log(`⚠️ Erro ao carregar warmup stats: ${err.message}`);
    }
  }

  obterQuota(sessao, diasDeWarmup = 7) {
    // Ramp-up: começar baixo, aumentar dia a dia
    const stats = this.statsEmMemoria.get(sessao) || { totalEnviados: 0, erros: 0, consecutivos: 0 };

    // Dia 1-2: 10 msgs/dia
    // Dia 3-4: 20 msgs/dia
    // Dia 5-6: 50 msgs/dia
    // Dia 7+: 100 msgs/dia (sem limite se 0 erros)

    const nivelWarmup = this.obterNivelWarmup(sessao);
    const quotaPorNivel = {
      1: 10,  // Primeiros 2 dias
      2: 20,  // Dias 3-4
      3: 50,  // Dias 5-6
      4: 100, // Dia 7+
      5: 200, // Completamente aquecido (sem erros)
    };

    return quotaPorNivel[nivelWarmup] || 100;
  }

  obterNivelWarmup(sessao) {
    const stats = this.statsEmMemoria.get(sessao);
    if (!stats) return 1; // Primeira vez

    const diasAtivos = this.contagemDiasAtivos(sessao);
    if (stats.erros > 5) return 1; // Setou pra trás
    if (stats.consecutivos > 3) return 1; // Muitos erros seguidos
    if (diasAtivos < 2) return 1;
    if (diasAtivos < 4) return 2;
    if (diasAtivos < 6) return 3;
    if (stats.erros === 0) return 5;
    return 4;
  }

  contagemDiasAtivos(sessao) {
    if (!fs.existsSync(this.statsFile)) return 0;
    try {
      const linhas = fs.readFileSync(this.statsFile, 'utf8').split('\n').filter(l => l.trim());
      const datasUnicas = new Set();
      linhas.forEach(linha => {
        try {
          const registro = JSON.parse(linha);
          if (registro.sessao === sessao && registro.data) {
            datasUnicas.add(new Date(registro.data).toDateString());
          }
        } catch {}
      });
      return datasUnicas.size;
    } catch {
      return 0;
    }
  }

  podeEnviar(sessao) {
    const stats = this.statsEmMemoria.get(sessao) || { totalEnviados: 0, erros: 0, consecutivos: 0 };
    const quota = this.obterQuota(sessao);

    // Se já atingiu a quota do dia
    if (stats.totalEnviados >= quota) return false;

    // Se muitos erros, bloqueia por um tempo
    if (stats.consecutivos > 3) {
      const tempoMinimo = 60 * 1000; // 1 minuto de espera
      if (Date.now() - (stats.ultimoEnvio || 0) < tempoMinimo) return false;
    }

    return true;
  }

  registrarEnvio(sessao, sucesso = true) {
    const stats = this.statsEmMemoria.get(sessao) || { totalEnviados: 0, erros: 0, consecutivos: 0 };

    stats.totalEnviados = (stats.totalEnviados || 0) + 1;
    stats.ultimoEnvio = Date.now();

    if (!sucesso) {
      stats.erros = (stats.erros || 0) + 1;
      stats.consecutivos = (stats.consecutivos || 0) + 1;
    } else {
      stats.consecutivos = 0;
    }

    this.statsEmMemoria.set(sessao, stats);
    this.salvarStats(sessao);
  }

  salvarStats(sessao) {
    const stats = this.statsEmMemoria.get(sessao);
    if (!stats) return;

    const registro = {
      sessao,
      totalEnviados: stats.totalEnviados,
      erros: stats.erros,
      consecutivos: stats.consecutivos,
      ultimoEnvio: stats.ultimoEnvio,
      data: new Date().toISOString(),
    };

    fs.appendFileSync(this.statsFile, `${JSON.stringify(registro)}\n`, 'utf8');
    this.rotacionarStatsSeNecessario();
  }

  rotacionarStatsSeNecessario() {
    try {
      const stats = fs.statSync(this.statsFile);
      if (stats.size > 50 * 1024 * 1024) {
        const backup = `${this.statsFile}.${Date.now()}`;
        fs.renameSync(this.statsFile, backup);
        console.log(`📊 Stats de warmup rotacionados`);
      }
    } catch {}
  }

  obterStatusWarmup(sessao) {
    const stats = this.statsEmMemoria.get(sessao) || { totalEnviados: 0, erros: 0, consecutivos: 0 };
    const quota = this.obterQuota(sessao);
    const nivel = this.obterNivelWarmup(sessao);
    const diasAtivos = this.contagemDiasAtivos(sessao);

    const nivelTexto = [
      '❄️ Novo',
      '🧊 Nível 1 (10/dia)',
      '❓ Nível 2 (20/dia)',
      '🔥 Nível 3 (50/dia)',
      '🚀 Nível 4 (100/dia)',
      '⚡ Aquecido (200/dia)',
    ][nivel] || 'Desconhecido';

    return {
      sessao,
      nivel,
      nivelTexto,
      enviados: stats.totalEnviados,
      quota,
      erros: stats.erros,
      consecutivos: stats.consecutivos,
      diasAtivos,
      podeEnviar: this.podeEnviar(sessao),
    };
  }

  resetarDia() {
    // Limpar contadores diários (chamado todo dia à meia-noite)
    this.statsEmMemoria.forEach((stats, sessao) => {
      stats.totalEnviados = 0;
      stats.consecutivos = 0;
    });
  }

  obterRelatorio() {
    const relatorio = [];
    this.statsEmMemoria.forEach((stats, sessao) => {
      relatorio.push(this.obterStatusWarmup(sessao));
    });
    return relatorio;
  }
}

module.exports = WarmupManager;
