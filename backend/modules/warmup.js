const fs = require('fs');
const path = require('path');

class WarmupManager {
  constructor() {
    this.statsFile = path.join(__dirname, 'warmup_stats.jsonl');
    this.statsEmMemoria = new Map();
    this.ultimoDiaReset = new Date().toDateString();
    this.carregarStats();
    this.iniciarResetDiarioAutomatico();
  }

  carregarStats() {
    if (!fs.existsSync(this.statsFile)) return;

    const hoje = new Date().toDateString();
    const recentesPorSessao = new Map();

    try {
      for (const linha of fs.readFileSync(this.statsFile, 'utf8').split('\n')) {
        if (!linha.trim()) continue;
        try {
          const registro = JSON.parse(linha);
          if (!registro.data || new Date(registro.data).toDateString() !== hoje) continue;

          const atual = recentesPorSessao.get(String(registro.sessao));
          if (!atual || new Date(registro.data).getTime() > new Date(atual.data).getTime()) {
            recentesPorSessao.set(String(registro.sessao), registro);
          }
        } catch {}
      }

      for (const [sessao, registro] of recentesPorSessao.entries()) {
        this.statsEmMemoria.set(sessao, {
          totalEnviados: registro.totalEnviados || 0,
          erros: registro.erros || 0,
          consecutivos: registro.consecutivos || 0,
          ultimoEnvio: registro.ultimoEnvio || 0,
        });
      }
    } catch (err) {
      console.log(`Erro ao carregar warmup stats: ${err.message}`);
    }
  }

  iniciarResetDiarioAutomatico() {
    setInterval(() => {
      const hoje = new Date().toDateString();
      if (this.ultimoDiaReset !== hoje) {
        this.resetarDia();
        this.ultimoDiaReset = hoje;
        console.log('Reset diario de warmup executado automaticamente');
      }
    }, 60 * 1000);
  }

  chave(sessao) {
    return String(sessao);
  }

  obterNivelWarmup(sessao) {
    const stats = this.statsEmMemoria.get(this.chave(sessao));
    if (!stats) return 1;

    const diasAtivos = this.contagemDiasAtivos(sessao);
    if (stats.consecutivos > 3 || stats.erros > 5) return 1;
    if (diasAtivos < 2) return 1;
    if (diasAtivos < 4) return 2;
    if (diasAtivos < 6) return 3;
    if (stats.erros === 0) return 5;
    return 4;
  }

  obterQuota(sessao) {
    const quotaCustomizada = Number(process.env[`WARMUP_QUOTA_SESSAO_${sessao}`]);
    if (quotaCustomizada > 0) return quotaCustomizada;

    const quotas = {
      1: Number(process.env.WARMUP_QUOTA_NIVEL_1) || 5,
      2: Number(process.env.WARMUP_QUOTA_NIVEL_2) || 10,
      3: Number(process.env.WARMUP_QUOTA_NIVEL_3) || 20,
      4: Number(process.env.WARMUP_QUOTA_NIVEL_4) || 35,
      5: Number(process.env.WARMUP_QUOTA_NIVEL_5) || 50,
    };

    return quotas[this.obterNivelWarmup(sessao)] || 100;
  }

  podeEnviar(sessao) {
    const stats = this.statsEmMemoria.get(this.chave(sessao)) || { totalEnviados: 0, erros: 0, consecutivos: 0 };
    if (stats.totalEnviados >= this.obterQuota(sessao)) return false;

    if (stats.consecutivos > 3) {
      const esperaMs = Number(process.env.WARMUP_ERRO_ESPERA_MS) || 60 * 1000;
      if (Date.now() - (stats.ultimoEnvio || 0) < esperaMs) return false;
    }

    return true;
  }

  registrarEnvio(sessao, sucesso = true) {
    const chave = this.chave(sessao);
    const stats = this.statsEmMemoria.get(chave) || { totalEnviados: 0, erros: 0, consecutivos: 0 };

    stats.totalEnviados += 1;
    stats.ultimoEnvio = Date.now();
    if (sucesso) {
      stats.consecutivos = 0;
    } else {
      stats.erros += 1;
      stats.consecutivos += 1;
    }

    this.statsEmMemoria.set(chave, stats);
    this.salvarStats(sessao);
  }

  salvarStats(sessao) {
    const stats = this.statsEmMemoria.get(this.chave(sessao));
    if (!stats) return;

    const registro = {
      sessao: this.chave(sessao),
      totalEnviados: stats.totalEnviados,
      erros: stats.erros,
      consecutivos: stats.consecutivos,
      ultimoEnvio: stats.ultimoEnvio,
      data: new Date().toISOString(),
    };

    fs.appendFileSync(this.statsFile, `${JSON.stringify(registro)}\n`, 'utf8');
  }

  contagemDiasAtivos(sessao) {
    if (!fs.existsSync(this.statsFile)) return 0;

    const datas = new Set();
    try {
      for (const linha of fs.readFileSync(this.statsFile, 'utf8').split('\n')) {
        if (!linha.trim()) continue;
        try {
          const registro = JSON.parse(linha);
          if (String(registro.sessao) === this.chave(sessao) && registro.data) {
            datas.add(new Date(registro.data).toDateString());
          }
        } catch {}
      }
    } catch {}

    return datas.size;
  }

  resetarDia() {
    for (const [sessao, stats] of this.statsEmMemoria.entries()) {
      stats.totalEnviados = 0;
      stats.consecutivos = 0;
      this.salvarStats(sessao);
    }
  }

  obterStatusWarmup(sessao) {
    const stats = this.statsEmMemoria.get(this.chave(sessao)) || { totalEnviados: 0, erros: 0, consecutivos: 0 };
    const quota = this.obterQuota(sessao);

    return {
      sessao,
      nivel: this.obterNivelWarmup(sessao),
      enviados: stats.totalEnviados,
      quota,
      erros: stats.erros,
      consecutivos: stats.consecutivos,
      diasAtivos: this.contagemDiasAtivos(sessao),
      podeEnviar: this.podeEnviar(sessao),
    };
  }

  obterRelatorio() {
    return Array.from(this.statsEmMemoria.keys()).map(sessao => this.obterStatusWarmup(sessao));
  }
}

module.exports = WarmupManager;
