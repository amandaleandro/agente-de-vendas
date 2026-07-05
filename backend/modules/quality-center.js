const chatStore = require('./chat-store');
const semanticAnalyzer = require('./semantic-analyzer');
const sentimentAnalyzer = require('./sentiment-analyzer');
const whatsappRiskGuard = require('./whatsapp-risk-guard');
const abTesting = require('./ab-testing');

function telefoneFromJid(jid) {
  return String(jid || '').split('@')[0].replace(/\D/g, '');
}

function lastInbound(messages) {
  return [...messages].reverse().find(msg => !msg.fromMe);
}

function lastOutbound(messages) {
  return [...messages].reverse().find(msg => msg.fromMe);
}

function calcularScoreConversa(conversa) {
  const mensagens = conversa.messages || [];
  const entrada = lastInbound(mensagens);
  const saida = lastOutbound(mensagens);

  // Sem resposta do cliente ainda: nao ha texto de cliente para analisar.
  // Analisar a propria mensagem do bot geraria sentimento/score falsos.
  if (!entrada) {
    return {
      score: conversa.requiresAttention ? 85 : 10,
      precisaHumano: Boolean(conversa.requiresAttention),
      motivo: conversa.requiresAttention ? 'recomenda handoff' : 'aguardando resposta do lead',
      analise: {},
      sentimento: { sentimento: 'sem_resposta', frustracaoLevel: 0, engajamento: 0 },
      proximaAcao: 'Aguardar resposta do lead'
    };
  }

  const texto = entrada.text || '';
  const analise = semanticAnalyzer.analisarTexto(texto);
  const sentimento = sentimentAnalyzer.analisarSentimento
    ? sentimentAnalyzer.analisarSentimento(texto)
    : { sentimento: analise.temNegativo ? 'frustrado' : 'neutro', frustracaoLevel: analise.temNegativo ? 0.7 : 0.1, engajamento: analise.especificidade || 0.3 };

  let score = 40;
  if (conversa.unread > 0) score += 15;
  if (analise.problema) score += 20;
  if (analise.fezPergunta) score += 12;
  if (analise.citouNumeros) score += 8;
  if (sentimento.frustracaoLevel >= 0.6) score += 15;
  if (saida && entrada.timestamp > saida.timestamp) score += 10;
  if (conversa.requiresAttention) score = Math.max(score, 85);

  const precisaHumano = score >= 75 || sentimento.frustracaoLevel >= 0.75 || /atendente|humano|vendedor|ligar|telefone/i.test(texto);
  const motivo = [];
  if (conversa.unread > 0) motivo.push('mensagem nao lida');
  if (analise.problema) motivo.push(`dor: ${analise.problema}`);
  if (analise.fezPergunta) motivo.push('cliente fez pergunta');
  if (sentimento.frustracaoLevel >= 0.6) motivo.push('frustracao alta');
  if (precisaHumano) motivo.push('recomenda handoff');

  return {
    score: Math.min(100, score),
    precisaHumano,
    motivo: motivo.length ? motivo.join(', ') : 'acompanhar',
    analise,
    sentimento,
    proximaAcao: precisaHumano ? 'Assumir conversa agora' : analise.problema ? 'Aprofundar dor e quantificar impacto' : 'Continuar qualificacao'
  };
}

class QualityCenter {
  dashboard() {
    const conversas = chatStore.getAllConversations();
    const itens = conversas.map(conversa => {
      const avaliacao = calcularScoreConversa(conversa);
      const telefone = telefoneFromJid(conversa.jid);
      return {
        sessao: conversa.sessao,
        jid: conversa.jid,
        telefone,
        nome: conversa.name,
        unread: conversa.unread,
        lastTime: conversa.lastTime,
        paused: global.atendimentosHumanos?.has(`${conversa.sessao}:${conversa.jid}`) || false,
        requiresAttention: conversa.requiresAttention,
        lastMessage: lastInbound(conversa.messages)?.text || lastOutbound(conversa.messages)?.text || '',
        ...avaliacao
      };
    }).sort((a, b) => b.score - a.score);

    const fila = itens.filter(item => item.precisaHumano || item.requiresAttention).slice(0, 30);
    const risco = whatsappRiskGuard.relatorio ? whatsappRiskGuard.relatorio() : { sessoes: [] };
    const experimentos = abTesting.report();

    return {
      resumo: {
        conversas: itens.length,
        filaHumana: fila.length,
        leadsQuentes: itens.filter(item => item.score >= 70).length,
        frustrados: itens.filter(item => item.sentimento?.frustracaoLevel >= 0.6).length,
        pausados: itens.filter(item => item.paused).length
      },
      fila,
      oportunidades: itens.slice(0, 50),
      risco,
      experimentos
    };
  }

  marcarHandoff(sessao, jid, motivo = 'handoff_manual') {
    const key = `${sessao}:${jid}`;
    if (!global.atendimentosHumanos) global.atendimentosHumanos = new Set();
    global.atendimentosHumanos.add(key);
    chatStore.setRequiresAttention(Number(sessao), jid, true);
    return { success: true, sessao: Number(sessao), jid, motivo };
  }

  simular(texto) {
    const analise = semanticAnalyzer.analisarTexto(texto);
    const estrategia = semanticAnalyzer.recomendarEstrategia(analise);
    const sentimento = sentimentAnalyzer.analisarSentimento
      ? sentimentAnalyzer.analisarSentimento(texto)
      : null;
    const risco = whatsappRiskGuard.analisarConteudo(texto);
    return {
      texto,
      analise,
      estrategia,
      sentimento,
      risco,
      respostaSugerida: semanticAnalyzer.construirRespostaContextual(analise)
    };
  }
}

module.exports = new QualityCenter();
