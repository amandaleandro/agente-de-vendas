const fs = require('fs');
const path = require('path');

class WarmupManager {
  constructor() {
    this.statsFile = path.join(__dirname, 'warmup_stats.jsonl');
    this.statsEmMemoria = new Map(); // sessao -> { totalEnviados, ultimoEnvio, diaDosStats, erros, consecutivos }
    this.ultimoDiaReset = new Date().toDateString();
    this.carregarStats();
    this.iniciarResetDiarioAutomatico();
  }

  iniciarResetDiarioAutomatico() {
    // Verifica a cada minuto se deve fazer reset diário
    setInterval(() => {
      const hoje = new Date().toDateString();
      if (this.ultimoDiaReset !== hoje) {
        this.resetarDia();
        this.ultimoDiaReset = hoje;
        console.log('🔄 Reset diário de warmup executado automaticamente');
      }
    }, 60 * 1000); // A cada minuto
  }

  carregarStats() {
    if (!fs.existsSync(this.statsFile)) return;
    try {
      const linhas = fs.readFileSync(this.statsFile, 'utf8').split('\n').filter(l => l.trim());
      const hoje = new Date().toDateString();
      const registrosPorSessao = {};

      // Carregar apenas o registro MAIS RECENTE de cada sessão (hoje)
      linhas.forEach(linha => {
        try {
          const registro = JSON.parse(linha);
          if (registro.data && new Date(registro.data).toDateString() === hoje) {
            // Se já existe registro desta sessão, manter o mais recente (último processado)
            if (!registrosPorSessao[registro.sessao]) {
              registrosPorSessao[registro.sessao] = registro;
            } else {
              const existente = registrosPorSessao[registro.sessao];
              const dataExistente = new Date(existente.data).getTime();
              const dataNovaData = new Date(registro.data).getTime();
              if (dataNovaData > dataExistente) {
                registrosPorSessao[registro.sessao] = registro;
              }
            }
          }
        } catch {}
      });

      // Carregar registros consolidados
      Object.entries(registrosPorSessao).forEach(([sessao, registro]) => {
        this.statsEmMemoria.set(sessao, {
          totalEnviados: registro.totalEnviados || 0,
          erros: registro.erros || 0,
          consecutivos: registro.consecutivos || 0,
          ultimoEnvio: registro.ultimoEnvio || 0,
        });
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
      if (!fs.existsSync(this.statsFile)) return;

      const stats = fs.statSync(this.statsFile);
      if (stats.size <= 50 * 1024 * 1024) return;

      // Se passou de 50MB, limpar dados antigos (mais de 30 dias) e depois rodar
      const linhas = fs.readFileSync(this.statsFile, 'utf8').split('\n').filter(l => l.trim());
      const hoje = new Date();
      const limiteData = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 dias atrás

      const linhasLimpas = linhas.filter(linha => {
        try {
          const registro = JSON.parse(linha);
          const dataRegistro = new Date(registro.data);
          return dataRegistro >= limiteData;
        } catch {
          return true; // Manter linhas inválidas por segurança
        }
      });

      if (linhasLimpas.length < linhas.length) {
        fs.writeFileSync(this.statsFile, linhasLimpas.join('\n') + '\n', 'utf8');
        console.log(`📊 Stats de warmup limpos: ${linhas.length - linhasLimpas.length} registros antigos removidos`);
      } else {
        // Se mesmo depois de limpar ainda está grande, fazer backup
        const backup = `${this.statsFile}.${Date.now()}`;
        fs.renameSync(this.statsFile, backup);
        console.log(`📊 Stats de warmup rotacionados para ${backup}`);
      }
    } catch (err) {
      console.warn(`⚠️ Erro ao rotacionar stats: ${err.message}`);
    }
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
    ][nivel - 1] || 'Desconhecido';

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
      this.salvarStats(sessao); // Persistir o reset
    });
  }

  obterRelatorio() {
    const relatorio = [];
    this.statsEmMemoria.forEach((stats, sessao) => {
      relatorio.push(this.obterStatusWarmup(sessao));
    });
    return relatorio;
  }

  // Configurações ajustáveis
  obterConfiguracao(sessao) {
    const stats = this.statsEmMemoria.get(sessao) || {};
    const quota = this.obterQuota(sessao);

    return {
      sessao,
      nivelWarmup: this.obterNivelWarmup(sessao),
      quotaAtual: quota,
      quotas: {
        nivel1: 10,
        nivel2: 20,
        nivel3: 50,
        nivel4: 100,
        nivel5: 200
      },
      diasParaProximoNivel: this.calcularDiasParaProximo(sessao),
      enviados: stats.totalEnviados || 0,
      erros: stats.erros || 0,
      consecutivos: stats.consecutivos || 0,
      diasAtivos: this.contagemDiasAtivos(sessao),
      podeEnviar: this.podeEnviar(sessao)
    };
  }

  calcularDiasParaProximo(sessao) {
    const diasAtivos = this.contagemDiasAtivos(sessao);
    const nivel = this.obterNivelWarmup(sessao);

    if (nivel >= 5) return 0; // Já está no máximo

    const proximoMilestone = {
      1: 2,
      2: 4,
      3: 6,
      4: 7
    }[nivel] || 0;

    return Math.max(0, proximoMilestone - diasAtivos);
  }

  alterarQuota(sessao, novaQuota) {
    // Permitir sobrescrever quotas através de arquivo de config
    if (!this.quotasCustomizadas) this.quotasCustomizadas = {};
    this.quotasCustomizadas[sessao] = novaQuota;
    return { success: true, novaQuota };
  }

  resetarSessao(sessao) {
    this.statsEmMemoria.delete(sessao);
    // Remover registros antigos dessa sessão do arquivo
    if (!fs.existsSync(this.statsFile)) return { success: true };

    try {
      const linhas = fs.readFileSync(this.statsFile, 'utf8').split('\n').filter(l => l.trim());
      const linhasLimpas = linhas.filter(linha => {
        try {
          const registro = JSON.parse(linha);
          return registro.sessao !== sessao;
        } catch {
          return true;
        }
      });

      if (linhasLimpas.length < linhas.length) {
        fs.writeFileSync(this.statsFile, linhasLimpas.join('\n') + '\n', 'utf8');
      }
      return { success: true, message: `Sessão ${sessao} resetada` };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  obterEstatisticas() {
    const stats = [];
    this.statsEmMemoria.forEach((data, sessao) => {
      stats.push({
        sessao,
        totalEnviados: data.totalEnviados,
        erros: data.erros,
        taxa: data.totalEnviados > 0 ? ((data.totalEnviados - data.erros) / data.totalEnviados * 100).toFixed(1) : 100,
        diasAtivos: this.contagemDiasAtivos(sessao)
      });
    });
    return stats;
  }
}

module.exports = WarmupManager;
