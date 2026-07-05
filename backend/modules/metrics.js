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
      tipo: 'resposta_ia',
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

  registrarRiscoWhatsApp({ sessao, evento, severidade = 'info', telefone = null, detalhe = null, erro = null }) {
    const registro = {
      tipo: 'whatsapp_risco',
      sessao: sessao ? String(sessao) : null,
      evento,
      severidade,
      telefone,
      detalhe,
      erro,
      timestamp: new Date().toISOString(),
    };

    this.metricsEmMemoria.push(registro);
    if (this.metricsEmMemoria.length > 10000) this.metricsEmMemoria.shift();

    fs.appendFileSync(this.metricsFile, `${JSON.stringify(registro)}\n`, 'utf8');
    this.rotacionarMetricasSeNecessario();
  }

  obterResumoRiscoWhatsApp() {
    const hoje = new Date().toDateString();
    const eventosHoje = this.metricsEmMemoria.filter(m => {
      if (m.tipo !== 'whatsapp_risco') return false;
      return new Date(m.timestamp).toDateString() === hoje;
    });

    const porEvento = {};
    const porSessao = {};
    for (const evento of eventosHoje) {
      porEvento[evento.evento] = (porEvento[evento.evento] || 0) + 1;
      const sessao = evento.sessao || 'desconhecida';
      if (!porSessao[sessao]) {
        porSessao[sessao] = {
          total: 0,
          banimentosProvaveis: 0,
          shadowbansProvaveis: 0,
          optOuts: 0,
          rejeicoesEnvio: 0,
          desconexoes: 0,
        };
      }
      porSessao[sessao].total++;
      if (evento.evento === 'logged_out') porSessao[sessao].banimentosProvaveis++;
      if (evento.evento === 'shadowban_detectado') porSessao[sessao].shadowbansProvaveis++;
      if (evento.evento === 'opt_out') porSessao[sessao].optOuts++;
      if (evento.evento === 'envio_rejeitado') porSessao[sessao].rejeicoesEnvio++;
      if (evento.evento === 'desconexao') porSessao[sessao].desconexoes++;
    }

    return {
      totalHoje: eventosHoje.length,
      porEvento,
      porSessao,
      ultimosEventos: eventosHoje.slice(-50).reverse(),
      observacao: 'Denuncias diretas nao sao expostas pelo WhatsApp/Baileys; opt-out, rejeicao e logged_out sao sinais indiretos.',
    };
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
