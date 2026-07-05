const TERMOS_SENSIVEIS = [
  'pix',
  'boleto',
  'cartao',
  'cartao de credito',
  'emprestimo',
  'financiamento',
  'investimento',
  'renda extra',
  'ganhe dinheiro',
  'promocao imperdivel',
  'clique aqui',
  'urgente'
];

const SHADOWBAN_PATTERNS = [
  'likely shadow ban',
  'whatsapp rejected sending this message',
  'not sent due to',
  'rejected sending'
];

class WhatsAppRiskGuard {
  constructor() {
    this.pausasPorSessao = new Map();
    this.destinatariosPorSessaoDia = new Map();
  }

  chaveDia(sessao) {
    return `${new Date().toISOString().slice(0, 10)}:${sessao}`;
  }

  normalizarTexto(texto) {
    return String(texto || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  analisarConteudo(texto) {
    const normalizado = this.normalizarTexto(texto);
    const termos = TERMOS_SENSIVEIS.filter(termo => normalizado.includes(termo));
    const repetitivo = /(.)\1{5,}/.test(normalizado) || normalizado.split(/\s+/).length > 0 && new Set(normalizado.split(/\s+/)).size <= 3 && normalizado.split(/\s+/).length >= 10;
    const muitosLinks = (normalizado.match(/https?:\/\/|www\./g) || []).length >= 2;
    return {
      risco: termos.length > 0 || repetitivo || muitosLinks ? 'alto' : 'baixo',
      termos,
      repetitivo,
      muitosLinks
    };
  }

  registrarDestinatario(sessao, jid) {
    const chave = this.chaveDia(sessao);
    const atual = this.destinatariosPorSessaoDia.get(chave) || new Set();
    atual.add(String(jid || '').split('@')[0]);
    this.destinatariosPorSessaoDia.set(chave, atual);
    return atual.size;
  }

  destinatariosUnicosHoje(sessao) {
    return (this.destinatariosPorSessaoDia.get(this.chaveDia(sessao)) || new Set()).size;
  }

  sessaoPausada(sessao) {
    const pausa = this.pausasPorSessao.get(String(sessao));
    if (!pausa) return null;
    if (Date.now() >= pausa.ate) {
      this.pausasPorSessao.delete(String(sessao));
      return null;
    }
    return pausa;
  }

  pausarSessao(sessao, motivo, minutos = 120) {
    const pausa = {
      motivo,
      ate: Date.now() + minutos * 60 * 1000,
      criadaEm: new Date().toISOString()
    };
    this.pausasPorSessao.set(String(sessao), pausa);
    return pausa;
  }

  erroIndicaShadowban(err) {
    const texto = this.normalizarTexto(`${err?.message || ''} ${err?.output?.payload?.message || ''}`);
    return SHADOWBAN_PATTERNS.some(pattern => texto.includes(pattern));
  }

  scoreSessao(sessao) {
    const unicos = this.destinatariosUnicosHoje(sessao);
    const pausa = this.sessaoPausada(sessao);
    let score = 0;
    if (unicos >= 20) score += 25;
    if (unicos >= 50) score += 35;
    if (pausa) score += 40;

    return {
      sessao: Number(sessao),
      destinatariosHoje: unicos,
      pausada: Boolean(pausa),
      pausa,
      score: Math.min(100, score),
      nivel: score >= 70 ? 'alto' : score >= 35 ? 'medio' : 'baixo',
      recomendacao: pausa
        ? 'Manter pausado ate estabilizar'
        : unicos >= 50
          ? 'Reduzir envios e aumentar intervalo'
          : unicos >= 20
            ? 'Monitorar respostas antes de escalar'
            : 'Operacao dentro do esperado'
    };
  }

  relatorio() {
    const totalSessoes = Number(process.env.WHATSAPP_NUMEROS) || 1;
    const sessoes = [];
    for (let sessao = 1; sessao <= totalSessoes; sessao++) {
      sessoes.push(this.scoreSessao(sessao));
    }
    return {
      sessoes,
      maiorRisco: sessoes.reduce((max, item) => item.score > max.score ? item : max, { score: 0 }),
      atualizadoEm: new Date().toISOString()
    };
  }
}

module.exports = new WhatsAppRiskGuard();
