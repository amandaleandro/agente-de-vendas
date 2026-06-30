const RESPOSTAS_RAPIDAS = [
  {
    regex: /^(planos?|precos?|preços?|valores|quanto custa|qual o valor|qual o preco|qual o preço)$/i,
    resposta: 'Consigo te passar, sim. Antes, pra nao te mandar algo fora do seu caso: voce hoje envia quantos orcamentos por semana?'
  },
  {
    regex: /^(diagnostico|diagnóstico)$/i,
    resposta: 'Posso te mandar o diagnostico. Antes, qual parte mais trava hoje: proposta, preco ou retorno do cliente?'
  },
  {
    regex: /^(obrigado|obrigada|valeu)$/i,
    resposta: 'Por nada. Obrigado pelo retorno.'
  }
];

const TERMOS_ATENDENTE = [
  'falar com humano',
  'falar com um humano',
  'falar com atendente',
  'falar com um atendente',
  'falar com uma pessoa',
  'passa pra um humano',
  'suporte humano',
  'atendimento humano',
  'quero reclamar'
];

const PADROES_DESINTERESSE = [
  /\bn[aã]o\s+(tenho|temos|tem)\s+interesse\b/i,
  /\bsem\s+interesse\b/i,
  /\bn[aã]o\s+(quero|queremos)\b/i,
  /\bn[aã]o\s+me\s+interessa\b/i,
  /\bn[aã]o\s+(preciso|precisamos)\b/i,
  /\bn[aã]o\s+serve\b/i,
  /\bagora\s+n[aã]o\b/i,
  /\b(outra|pr[oó]xima)\s+hora\b/i,
  /\bfica\s+(pra|para)\s+(uma\s+)?(outra|pr[oó]xima)\s+hora\b/i,
  /\bn[aã]o\s+(damos|dou|estamos\s+dando)\s+conta\b/i,
  /\b(muito|muitos|bastante)\s+servi[cç]os?\b/i,
  /\bservi[cç]os?\s+demais\b/i,
  /\bagenda\s+cheia\b/i,
  /\bestamos\s+cheios\b/i,
  /\bestou\s+cheio\b/i,
  /\bdeixa\s+pra\s+(pr[oó]xima|depois)\b/i,
  /\bpare\s+de\s+(mandar|enviar|me\s+chamar)\b/i,
  /\bn[aã]o\s+(mande|envie)\s+mais\b/i,
  /\bremova\s+(meu\s+)?(contato|n[uú]mero)\b/i,
  /\bme\s+tira\s+da\s+lista\b/i,
  /\bdescadastre\b/i,
  /\bcancelar\s+(mensagens|contato)\b/i
];

const FRASES_DESINTERESSE = [
  'nao tenho interesse',
  'nao tem interesse',
  'nao temos interesse',
  'sem interesse',
  'nao quero',
  'nao queremos',
  'nao me interessa',
  'nao preciso',
  'nao precisamos',
  'nao serve',
  'agora nao',
  'outra hora',
  'proxima hora',
  'fica pra outra hora',
  'fica para outra hora',
  'fica pra uma outra hora',
  'fica para uma outra hora',
  'fica pra proxima hora',
  'nao damos conta',
  'nao dou conta',
  'nao estamos dando conta',
  'servico demais',
  'servicos demais',
  'muito servico',
  'muitos servicos',
  'agenda cheia',
  'estamos cheios',
  'estou cheio',
  'deixa pra proxima',
  'deixa pra depois',
  'pare de mandar',
  'pare de enviar',
  'pare de me chamar',
  'nao mande mais',
  'nao envie mais',
  'me tira da lista',
  'remova meu contato',
  'remova meu numero',
  'descadastre',
  'cancela as mensagens',
  'cancelar mensagens'
];

const PADROES_AUTOMATICOS = [
  /agradece(?:mos)? (o|seu) contato/i,
  /responderemos em breve/i,
  /retornaremos em breve/i,
  /em breve (retornaremos|responderemos)/i,
  /responderei assim que poss[ií]vel/i,
  /mensagem autom[aá]tica/i,
  /hor[aá]rio de atendimento/i,
  /n[aã]o estou dispon[ií]vel/i,
  /ausente no momento/i,
  /estamos (offline|fechados)/i,
  /no momento n[aã]o podemo?s/i,
  /digite\s+\d+\s+para/i,
  /trabalho com\s*:/i,
  /me conta\s*👇?/i,
  /qual .* voc[eê] quer/i
];

const TERMOS_DOR = [
  'orcamento',
  'orcamentos',
  'proposta',
  'propostas',
  'cliente',
  'clientes',
  'preco',
  'valor',
  'some',
  'somem',
  'responde',
  'responder',
  'retorno',
  'fechar',
  'venda',
  'vendas'
];

const TERMOS_VAGOS = [
  'nao entendi',
  'nao sei',
  'talvez',
  'depende',
  'mais ou menos',
  'como assim',
  'pode ser',
  'me fala melhor',
  'explica melhor'
];

function normalizarTexto(texto) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function temFormatoDeMenuOuLista(texto) {
  const linhas = String(texto || '').split('\n').map(l => l.trim()).filter(Boolean);
  if (linhas.length < 4) return false;

  const linhasComMarcador = linhas.filter(l => /^[\d\-*•✅🏠🛠️👷💰👉👇]/u.test(l)).length;
  const temApresentacaoDeServicos = /trabalho com|servi[cç]os|atendemos|op[cç][oõ]es/i.test(texto);
  return temApresentacaoDeServicos && linhasComMarcador >= 2;
}

function clienteSemInteresse(texto) {
  const original = String(texto || '').trim();
  const normalizado = normalizarTexto(original);
  return PADROES_DESINTERESSE.some(regex => regex.test(original)) ||
    FRASES_DESINTERESSE.some(frase => normalizado.includes(frase));
}

function clientePedeHumano(texto) {
  const normalizado = normalizarTexto(texto);
  return TERMOS_ATENDENTE.some(termo => normalizado.includes(normalizarTexto(termo)));
}

function mensagemAutomatica(texto) {
  const original = String(texto || '');
  const normalizado = normalizarTexto(original);
  return PADROES_AUTOMATICOS.some(regex => regex.test(original)) ||
    normalizado.includes('mensagem automatica') ||
    normalizado.includes('resposta automatica') ||
    normalizado.includes('atendimento automatico') ||
    normalizado.includes('horario de atendimento') ||
    normalizado.includes('fora do horario') ||
    normalizado.includes('escolha uma opcao') ||
    temFormatoDeMenuOuLista(original);
}

function mensagemAmbigua(texto) {
  const normalizado = normalizarTexto(texto);
  if (!normalizado) return false;

  const palavras = normalizado.split(' ').filter(Boolean);
  const temTermoDor = TERMOS_DOR.some(termo => normalizado.includes(termo));
  const temTermoVago = TERMOS_VAGOS.some(termo => normalizado.includes(termo));

  if (temTermoVago) return true;
  if (palavras.length <= 3 && !temTermoDor) return true;
  if (palavras.length <= 6 && /^(sim|ok|certo|entendi|beleza|pode ser)/.test(normalizado) && !temTermoDor) return true;

  return false;
}

function verificarGatilhoRapido(texto) {
  const t = String(texto || '').trim().toLowerCase();
  for (const gatilho of RESPOSTAS_RAPIDAS) {
    if (gatilho.regex.test(t)) return gatilho.resposta;
  }
  return null;
}

function classificarMensagem(texto) {
  if (!String(texto || '').trim()) {
    return { intent: 'vazio', action: 'ignore', confidence: 1, reason: 'sem_texto' };
  }

  if (clienteSemInteresse(texto)) {
    return {
      intent: 'desinteresse',
      action: 'opt_out',
      confidence: 0.98,
      resposta: 'Entendi, obrigado por avisar. Sem problema, nao vou insistir por aqui.'
    };
  }

  if (mensagemAutomatica(texto)) {
    return { intent: 'mensagem_automatica', action: 'ignore', confidence: 0.9, reason: 'auto_reply' };
  }

  if (clientePedeHumano(texto)) {
    return { intent: 'pedido_humano', action: 'human_handoff', confidence: 0.95 };
  }

  const respostaRapida = verificarGatilhoRapido(texto);
  if (respostaRapida) {
    return { intent: 'gatilho_rapido', action: 'quick_reply', confidence: 0.85, resposta: respostaRapida };
  }

  if (mensagemAmbigua(texto)) {
    return {
      intent: 'ambigua',
      action: 'clarify',
      confidence: 0.55,
      resposta: 'Entendi em parte. So pra eu nao interpretar errado: hoje o maior ponto e cliente sumindo depois do orcamento, dificuldade em montar proposta ou voces ja estao com agenda cheia?'
    };
  }

  return { intent: 'conversa', action: 'ai', confidence: 0.65 };
}

module.exports = {
  classificarMensagem,
  clientePedeHumano,
  clienteSemInteresse,
  mensagemAutomatica,
  mensagemAmbigua,
  normalizarTexto,
  verificarGatilhoRapido
};
