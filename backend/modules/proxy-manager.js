const { HttpsProxyAgent } = require('https-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');

/**
 * Gestão de proxies por chip (sessão) com rotação temporal.
 *
 * Cada sessão tem um "pool" de proxies definido em env:
 *   PROXY_SESSAO_1=http://user:pass@ip1:porta,http://user:pass@ip2:porta
 *   PROXY_SESSAO_2=socks5://user:pass@ip3:porta
 *
 * A cada PROXY_ROTACAO_HORAS (padrão 4h) o índice avança e o socket
 * reconecta saindo pelo próximo IP do pool. Rotação por TEMPO (não por
 * volume de mensagens) imita um aparelho real trocando de rede ao longo
 * do dia, sem criar padrão detectável de automação.
 *
 * Se não houver proxy configurado para a sessão, o socket sai pelo IP
 * do próprio servidor (comportamento anterior, sem quebrar nada).
 */

const indicePorSessao = new Map();

function lerPoolSessao(sessao) {
  const raw = process.env[`PROXY_SESSAO_${sessao}`];
  if (!raw) return [];
  return raw.split(',').map(url => url.trim()).filter(Boolean);
}

function criarAgent(url) {
  if (/^socks/i.test(url)) return new SocksProxyAgent(url);
  return new HttpsProxyAgent(url);
}

/** Mascara credenciais para log/exibição. */
function mascarar(url) {
  return url.replace(/\/\/[^@/]+@/, '//***@');
}

/**
 * Retorna o agent do proxy atual da sessão, ou null se não houver proxy.
 * O mesmo agent é usado no WebSocket (agent) e no download/upload de mídia (fetchAgent).
 */
function obterAgentAtual(sessao) {
  const pool = lerPoolSessao(sessao);
  if (!pool.length) return null;

  const indice = (indicePorSessao.get(String(sessao)) || 0) % pool.length;
  const url = pool[indice];
  try {
    return { agent: criarAgent(url), url, indice, total: pool.length };
  } catch (err) {
    console.log(`⚠️  Proxy inválido para sessão ${sessao} (${mascarar(url)}): ${err.message}`);
    return null;
  }
}

/**
 * Avança o índice do pool da sessão. Retorna true se de fato mudou de IP
 * (ou seja, pool tem 2+ proxies), false caso contrário.
 */
function rotacionar(sessao) {
  const pool = lerPoolSessao(sessao);
  if (pool.length < 2) return false;
  const atual = indicePorSessao.get(String(sessao)) || 0;
  indicePorSessao.set(String(sessao), (atual + 1) % pool.length);
  return true;
}

function temProxy(sessao) {
  return lerPoolSessao(sessao).length > 0;
}

function horasRotacao() {
  const h = Number(process.env.PROXY_ROTACAO_HORAS);
  return h > 0 ? h : 4;
}

/**
 * Descrição legível do estado atual dos proxies (para status/log).
 */
function status(sessoes) {
  return sessoes.map(sessao => {
    const pool = lerPoolSessao(sessao);
    if (!pool.length) return { sessao, proxy: null, pool: 0 };
    const indice = (indicePorSessao.get(String(sessao)) || 0) % pool.length;
    return { sessao, proxy: mascarar(pool[indice]), indice, pool: pool.length };
  });
}

module.exports = {
  obterAgentAtual,
  rotacionar,
  temProxy,
  horasRotacao,
  status,
  mascarar,
};
