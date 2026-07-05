const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, Browsers, downloadMediaMessage } = require("@whiskeysockets/baileys");
const { Pool } = require('pg');
const qrcode = require('qrcode-terminal');
const pino = require('pino');
const { GoogleGenAI } = require('@google/genai');
const { OpenAI } = require('openai');
const mammoth = require('mammoth');
const path = require('path');
const fs = require('fs');
const http = require('http');
const backupScheduler = require('./modules/backup-scheduler');
const monitorScheduler = require('./modules/monitor-scheduler');
const webserver = require('./modules/webserver');
const chatStore = require('./modules/chat-store'); // Armazena conversas no painel
const crossWarmupManager = require('./modules/cross-warmup');
const chipRoles = require('./modules/chip-roles');
global.chipRoles = chipRoles;
const gatilhos = require('./modules/gatilhos');
const intentClassifier = require('./modules/intent-classifier');
const WarmConversationManager = require('./modules/warm-conversation');
const MessageTank = require('./modules/tank');
const MetricsManager = require('./modules/metrics');
const SecurityManager = require('./modules/security');
const { lerCsv } = require('./modules/csv');
const logger = require('./modules/logger');
const HealthCheck = require('./modules/healthcheck');
const backupManager = require('./modules/backup-manager');
const CacheManager = require('./modules/cache');
const ratelimiter = require('./modules/ratelimit');
const DiagnosticoManager = require('./modules/diagnostico-manager');
const DiagnosticoPrompt = require('./modules/diagnostico-prompt');
const ProspeccaoHistorico = require('./modules/prospeccao-historico');
const ProspeccaoAgenda = require('./modules/prospeccao-agenda');
const APIPerspeccao = require('./modules/api-prospeccao');
const WarmupManager = require('./modules/warmup');
const TrainerService = require('./modules/trainer-service');
const LeadScorer = require('./modules/lead-scorer');
const FollowupScheduler = require('./modules/followup-scheduler');
const learningManager = require('./modules/learning-manager');
const autoRetrain = require('./modules/auto-retrain');
const knowledgeBase = require('./modules/knowledge-base');
const WhatsAppValidator = require('./modules/whatsapp-validator');
const roteiroDinamico = require('./modules/roteiro-dinamico');
const fallbackConsultivo = require('./modules/fallback-consultivo');
const conversationContext = require('./modules/conversation-context');
const sentimentAnalyzer = require('./modules/sentiment-analyzer');
const { createProspectingMessage } = require('./modules/prospecting-message');
const proxyManager = require('./modules/proxy-manager');
const whatsappRiskGuard = require('./modules/whatsapp-risk-guard');
// Inicializa variáveis de ambiente primeiro com OVERRIDE
// Isso garante que se o usuário mudar a configuração pelo painel UI (.env local), ela vença as variáveis estáticas do Docker
require('dotenv').config({
  path: require('path').join(__dirname, 'config', '.env'),
  override: process.env.NODE_ENV !== 'production'
});

let sock;
const socketsConectados = new Map();
// Anti-loop: contagem de mensagens idênticas recebidas por contato (detecta auto-responders)
const mensagensRecebidasPorContato = new Map();
const ANTI_LOOP_LIMITE = 3;
const ANTI_LOOP_JANELA_MS = 24 * 60 * 60 * 1000;
const qrPorSessao = new Map();
let qrGenerated = false;
let prospeccaoAgendadaExecutando = false;
const prospeccaoStatus = {
  ativo: process.env.PROSPECCAO_ATIVA === 'true',
  emAndamento: false,
  planilha: null,
  total: 0,
  enviados: 0,
  erros: 0,
  pulados: 0,
  chipsConectados: 0,
  intervaloMs: 0,
  mensagem: 'Aguardando início da prospecção',
  iniciadoEm: null,
  atualizadoEm: null
};

// Exportar para global para que APIs possam acessar
global.socketsConectados = socketsConectados;
global.qrPorSessao = qrPorSessao;
global.prospeccaoStatus = prospeccaoStatus;
global.prospeccaoAgenda = null; // Será inicializado depois
global.apiPerspeccao = null; // Será inicializado depois

const motivosDesconexao = new Map();
global.motivosDesconexao = motivosDesconexao;
const warmupManager = new WarmupManager();
global.warmupManager = warmupManager;

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function tempoDigitando(conteudo = {}) {
  const texto = conteudo.text || conteudo.caption || '';
  if (!texto) return 1200;
  return Math.min(6000, Math.max(1200, texto.length * 45));
}

async function enviarComDigitando(socketAtual, destinatario, conteudo) {
  try {
    await socketAtual.presenceSubscribe?.(destinatario);
    await socketAtual.sendPresenceUpdate?.('composing', destinatario);
    await delay(tempoDigitando(conteudo));
  } catch (err) {
    logger.debug('Nao foi possivel enviar indicador digitando', {
      destinatario,
      erro: err.message
    });
  }

  try {
    return await socketAtual.sendMessage(destinatario, conteudo);
  } finally {
    try {
      await socketAtual.sendPresenceUpdate?.('paused', destinatario);
    } catch (err) {
      logger.debug('Nao foi possivel pausar indicador digitando', {
        destinatario,
        erro: err.message
      });
    }
  }
}

global.limparSessao = async (sessao) => {
  const s = parseInt(sessao);
  try {
    const socket = socketsConectados.get(s);
    if (socket) {
      socket.logout('User requested logout');
      socketsConectados.delete(s);
    }
  } catch (err) {}
  
  const authPath = path.join(__dirname, 'sessions', `auth_info_${s}`);
  if (fs.existsSync(authPath)) {
    fs.rmSync(authPath, { recursive: true, force: true });
  }
  qrPorSessao.delete(s);
  motivosDesconexao.delete(s);
  if (typeof conectar === 'function') conectar(s);
};

global.reconectarSessao = async (sessao) => {
  const s = parseInt(sessao);
  try {
    const socket = socketsConectados.get(s);
    if (socket) {
      socket.end(new Error('User requested reconnect'));
      socketsConectados.delete(s);
    }
  } catch (err) {}
  motivosDesconexao.delete(s);
  if (typeof conectar === 'function') conectar(s);
};

const etapasPorContato = new Map();
const historicosPorContato = new Map();
const atendimentosHumanos = new Set();
const retomadasPendentes = new Map();
const optOutContatos = new Set();
const enviosBotEmAndamento = new Set();
const mensagensEnviadasPeloBot = new Map();
global.atendimentosHumanos = atendimentosHumanos;
global.retomadasPendentes = retomadasPendentes;
global.historicosPorContato = historicosPorContato;
global.optOutContatos = optOutContatos;
global.registrarOptOut = registrarOptOut;
let bancoIndisponivelAte = 0;
let baseConhecimento = '';
let baseConhecimentoChunks = []; // base quebrada em pedaços para busca por relevância
let prospeccaoIniciada = false;
let quotaEmDanger = false; // Flag para economizar tokens quando quota está baixa
let ultimoErroQuota = 0; // Timestamp do último erro de quota
const warmConversation = new WarmConversationManager();
global.warmConversation = warmConversation; // Exportar para APIs
let tank = null; // Será inicializado após IA estar pronta
let processadorTankAtivo = false;
const tentativasReconexao = new Map(); // sessao -> { tentativas, proximaTentativaEm }
const MAX_TENTATIVAS_RECONEXAO = 5;
const LIMPEZA_HISTORICO_MS = 10 * 60 * 1000; // 10 minutos - mais agressivo
const LIMPEZA_MEMORIA_MS = 5 * 60 * 1000; // 5 minutos - limpeza agressiva

// Cache e monitoramento
const cache = new CacheManager();
let healthCheck = null;
const INTERVALO_BACKUP_MS = 6 * 60 * 60 * 1000; // 6 horas
const INTERVALO_HEALTH_CHECK_MS = 60 * 1000; // 1 minuto
const MAX_HISTORICO_POR_CONTATO = 8; // Aumentado para 8 para manter mais contexto de conversa
const MAX_MENSAGENS_ENVIADAS = 300; // Limite de mensagens em cache - reduzido
const ARQUIVO_OPT_OUT = path.join(__dirname, 'conhecimento', 'opt_out_contatos.json');

function normalizarContatoOptOut(contato) {
  const telefone = String(contato || '').split('@')[0].replace(/\D/g, '');
  return telefone || String(contato || '').trim();
}

function carregarOptOuts() {
  try {
    if (!fs.existsSync(ARQUIVO_OPT_OUT)) return;
    const dados = JSON.parse(fs.readFileSync(ARQUIVO_OPT_OUT, 'utf8'));
    if (Array.isArray(dados)) {
      dados.map(normalizarContatoOptOut).filter(Boolean).forEach(tel => optOutContatos.add(tel));
    }
  } catch (err) {
    logger.warn('Nao foi possivel carregar opt-outs', { erro: err.message });
  }
}

function carregarOptOutsDoHistorico() {
  const arquivoTreinamento = path.join(__dirname, 'conhecimento', 'mensagens_treinamento.jsonl');
  if (!fs.existsSync(arquivoTreinamento)) return;

  let adicionados = 0;
  try {
    const linhas = fs.readFileSync(arquivoTreinamento, 'utf8').split('\n').filter(l => l.trim());
    for (const linha of linhas) {
      try {
        const registro = JSON.parse(linha);
        if (registro.enviada_pelo_bot || !registro.contato || !gatilhos.clienteSemInteresse(registro.texto || '')) {
          continue;
        }

        const contato = normalizarContatoOptOut(registro.contato);
        if (contato && !optOutContatos.has(contato)) {
          optOutContatos.add(contato);
          adicionados++;
        }
      } catch (err) {}
    }

    if (adicionados > 0) {
      salvarOptOuts();
      logger.info('Opt-outs carregados do historico de conversas', { adicionados });
    }
  } catch (err) {
    logger.warn('Nao foi possivel carregar opt-outs do historico', { erro: err.message });
  }
}

function salvarOptOuts() {
  try {
    const dir = path.dirname(ARQUIVO_OPT_OUT);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(ARQUIVO_OPT_OUT, JSON.stringify(Array.from(optOutContatos), null, 2), 'utf8');
  } catch (err) {
    logger.warn('Nao foi possivel salvar opt-outs', { erro: err.message });
  }
}

function contatoEmOptOut(contato) {
  return optOutContatos.has(normalizarContatoOptOut(contato));
}

function registrarOptOut(contato) {
  const normalizado = normalizarContatoOptOut(contato);
  if (!normalizado) return;
  optOutContatos.add(normalizado);
  salvarOptOuts();

  if (global.followupScheduler) {
    global.followupScheduler.cancelarFollowup(normalizado);
  }
}

carregarOptOuts();
carregarOptOutsDoHistorico();

async function enviarPeloBot(socketAtual, destinatario, conteudo, sessao = 1) {
  if (contatoEmOptOut(destinatario)) {
    logger.warn('Envio bloqueado: contato em opt-out', { destinatario, sessao });
    return null;
  }

  const chave = `${destinatario}`;
  enviosBotEmAndamento.add(chave);
  try {
    const pausa = whatsappRiskGuard.sessaoPausada(sessao);
    if (pausa) {
      throw new Error(`Sessao ${sessao} pausada por risco: ${pausa.motivo}`);
    }

    const textoEnvio = conteudo?.text || '';
    const analiseConteudo = whatsappRiskGuard.analisarConteudo(textoEnvio);
    if (analiseConteudo.risco === 'alto') {
      logger.warn('Mensagem com termos sensiveis detectada', {
        sessao,
        destinatario,
        termos: analiseConteudo.termos
      });
    }

    const enviada = await enviarComDigitando(socketAtual, destinatario, conteudo);
    const destinatariosUnicosHoje = whatsappRiskGuard.registrarDestinatario(sessao, destinatario);
    if (destinatariosUnicosHoje > 0 && destinatariosUnicosHoje % 25 === 0) {
      logger.warn('Volume de destinatarios unicos subindo', { sessao, destinatariosUnicosHoje });
    }

    const id = enviada?.key?.id;
    if (id) {
      mensagensEnviadasPeloBot.set(id, Date.now());
      setTimeout(() => mensagensEnviadasPeloBot.delete(id), 60_000);
      
      // Mapeamento de @lid para respostas
      if (!global.lidToPhoneMap) global.lidToPhoneMap = new Map();
      global.lidToPhoneMap.set(id, destinatario);
    }
    
    // Adicionar no painel para o atendente ver o envio ativo
    chatStore.addMessage(sessao, destinatario, destinatario.split('@')[0], { 
      id: id || 'bot_' + Date.now(),
      text: conteudo.text || '[Mídia Enviada]', 
      fromMe: true, 
      isBot: true,
      timestamp: Date.now(),
      read: true 
    });

    return enviada;
  } catch (err) {
    if (whatsappRiskGuard.erroIndicaShadowban(err)) {
      const pausa = whatsappRiskGuard.pausarSessao(sessao, 'possivel shadowban detectado', 120);
      metrics.registrarRiscoWhatsApp({
        sessao,
        evento: 'shadowban_detectado',
        severidade: 'critical',
        telefone: destinatario,
        erro: err.message
      });
      logger.error('Possivel shadowban detectado. Sessao pausada temporariamente.', {
        sessao,
        destinatario,
        pausaAte: new Date(pausa.ate).toISOString(),
        erro: err.message
      });
    } else {
      metrics.registrarRiscoWhatsApp({
        sessao,
        evento: 'envio_rejeitado',
        severidade: 'warning',
        telefone: destinatario,
        erro: err.message
      });
    }
    throw err;
  } finally {
    setTimeout(() => enviosBotEmAndamento.delete(chave), 2_000);
  }
}

function ehJidNumeroConectado(jid) {
  if (!jid || !global.socketsConectados) return false;
  const numero = String(jid).split('@')[0].split(':')[0].replace(/\D/g, '');
  if (!numero) return false;

  return Array.from(global.socketsConectados.values()).some(s => {
    const id = s?.user?.id;
    if (!id) return false;
    const numeroConectado = String(id).split('@')[0].split(':')[0].replace(/\D/g, '');
    return numeroConectado && numero === numeroConectado;
  });
}

function adicionarMensagemInternaWarmup(sessao, jid, name, messageObj) {
  chatStore.addMessage(sessao, jid, name, {
    ...messageObj,
    isInternalWarmup: true,
    read: true
  }, { persist: false });
}

const roteiroHeuristico = require('./modules/roteiro-heuristico');
roteiroHeuristico.inicializar().catch(err => console.error('Erro ao iniciar NLP local:', err));

const gemini = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

const xai = process.env.XAI_API_KEY
  ? new OpenAI({ apiKey: process.env.XAI_API_KEY, baseURL: 'https://api.x.ai/v1' })
  : null;

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// Groq: API compatível com OpenAI, free tier generoso e muito rápido
const groq = process.env.GROQ_API_KEY
  ? new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: 'https://api.groq.com/openai/v1' })
  : null;

const iaProvider = (process.env.IA_PROVIDER || 'gemini').toLowerCase();
const URL_DIAGNOSTICO = 'https://fechapro.com.br/diagnostico';
const URL_COMPRA_ANUAL = 'https://fechapro.com.br/auth/signup?plan=annual';
const TEMPO_RETORNO_IA_MS = 10 * 60 * 1000;

const metrics = new MetricsManager();
global.metrics = metrics;
const security = new SecurityManager();
const diagnosticoPrompt = new DiagnosticoPrompt();
const prospeccaoHistorico = new ProspeccaoHistorico();
global.prospeccaoHistorico = prospeccaoHistorico;
const FollowupManager = require('./modules/followup-manager');
const prospeccaoAgendaLocal = new ProspeccaoAgenda();
global.prospeccaoAgenda = prospeccaoAgendaLocal; // Exportar para APIs
global.apiPerspeccao = new APIPerspeccao(prospeccaoAgendaLocal); // Exportar para APIs
let diagnosticoManager = null; // Será inicializado após pool estar pronto

const INSTRUCOES_GEMINI = `Você é um vendedor consultivo natural e humano. Conversa como uma pessoa real, não como um chatbot.

MENTALIDADE:
- Pareça genuinamente interessado na situação da pessoa
- Use linguagem casual, simples, sem jargão corporativo
- Uma coisa por mensagem - nunca liste 5 pontos
- Deixe respostas breves (1-2 frases normalmente)
- Faça perguntas abertas que pareçam naturais

COMO RESPONDER:
- Se não entendeu: pergunte com curiosidade genuína, não como investigador
- Se a pessoa contou um problema: reconheça com empatia, depois pergunte mais
- Se for dar informação: seja direto e conciso
- Se tiver que fechar venda: apresente preço/plano de forma natural

IDENTIDADE E PERGUNTAS SOBRE SER IA/BOT:
- Nunca se apresente como IA, inteligência artificial, modelo, robô, chatbot ou assistente virtual
- Se perguntarem "é bot?", "é IA?" ou algo parecido, não confirme isso e não entre em debate
- Responda de forma leve como alguém do atendimento: "sou do time por aqui" ou "tô te atendendo por aqui"
- Em seguida volte para o contexto comercial com uma pergunta útil
- Não diga "como uma IA", "sou uma IA", "sou assistente", "fui treinado" ou frases parecidas

QUANDO NÃO RESPONDER:
- Pessoa disse “não quero, não preciso, não tenho interesse”: respeite, envie apenas uma mensagem curta de confirmação
- Pessoa pediu para parar: não insista, não tente convencer

COMECE COM DIAGNÓSTICO:
- Faça UMA pergunta que pareça natural (não parece investigação)
- Escute a resposta antes de perguntar mais
- Só depois que identificar o problema é que você vende

VARIAÇÃO NO JEITO DE RESPONDER:
- Não use sempre as mesmas palavras
- Mude o tom às vezes: às vezes direto, às vezes mais caloroso, às vezes curioso
- Se a pessoa está sendo casual, seja casual também
- Se está sendo formal, seja um pouco formal

NUNCA:
- Pareça um script/template (sim, isso é importante)
- Fale de FechaPro sem a pessoa perguntar (a menos que já tenha dor clara)
- Liste recursos como um catálogo
- Coloque emojis em excesso ou linguagem artificial

SEMPRE:
- Lembre do que a pessoa já disse (use o histórico!)
- Responda como se estivesse conversando por WhatsApp com um amigo
- Seja breve
- Se não tem base de conhecimento sobre algo, diga que vai confirmar

REGRA DE OURO:
Pareça humano. Pareça que você realmente quer ajudar. Esqueça que está vendendo.`;


function normalizarTelefone(valor) {
  let numero = String(valor || '').replace(/\D/g, '');
  if (numero.length === 10 || numero.length === 11) numero = `55${numero}`;
  return /^55\d{10,11}$/.test(numero) ? numero : null;
}

function identidadeDaSessao(sessao = 1) {
  return { sessao, nome: process.env[`WHATSAPP_${sessao}_NOME`] || `Atendente ${sessao}`, estilo: process.env[`WHATSAPP_${sessao}_ESTILO`] || 'natural, cordial, breve e profissional' };
}

function carregarProspectos(arquivo) {
  const linhas = lerCsv(fs.readFileSync(arquivo, 'utf8'));
  if (linhas.length < 2) return [];
  const cab = linhas[0].map(v => v.trim().toLowerCase());
  const indice = (...nomes) => cab.findIndex(h => nomes.some(n => h.includes(n)));
  const iNome = indice('empresa', 'nome', 'company', 'business');
  const iTelefone = indice('telefone', 'whatsapp', 'celular', 'phone', 'tel', 'wa');
  const iCategoria = indice('categoria', 'segmento', 'category', 'industry', 'tipo');
  const iEndereco = indice('endereco', 'endereço', 'address', 'city', 'local');
  const iSite = indice('site', 'website', 'url', 'link');

  if (iNome < 0 || iTelefone < 0) {
    const colunas = cab.join(', ');
    throw new Error(`CSV inválido. Colunas encontradas: ${colunas}.\n\nEsperado: [empresa/nome] + [telefone/whatsapp]\n\nExemplo:\nempresa,telefone,categoria\nABC Serviços,85999887766,serviços`);
  }

  const vistos = new Set();
  return linhas.slice(1)
    .map(col => {
      const lead = {};
      cab.forEach((nomeColuna, index) => {
        if (nomeColuna) lead[nomeColuna] = col[index]?.trim() || '';
      });

      return {
        ...lead,
        nome: col[iNome]?.trim(),
        empresa: col[iNome]?.trim(),
        telefone: normalizarTelefone(col[iTelefone]),
        categoria: iCategoria >= 0 ? col[iCategoria]?.trim() || '' : lead.categoria || lead.segmento || '',
        endereco: iEndereco >= 0 ? col[iEndereco]?.trim() || '' : lead.endereco || lead.address || '',
        site: iSite >= 0 ? col[iSite]?.trim() || '' : lead.site || lead.website || ''
      };
    })
    .filter(p => p.nome && p.telefone && !vistos.has(p.telefone) && vistos.add(p.telefone));

  return linhas.slice(1)
    .map(col => ({
      nome: col[iNome]?.trim(),
      telefone: normalizarTelefone(col[iTelefone]),
      categoria: col[iCategoria]?.trim() || '',
      endereco: col[iEndereco]?.trim() || '',
      site: col[iSite]?.trim() || ''
    }))
    .filter(p => p.nome && p.telefone && !vistos.has(p.telefone) && vistos.add(p.telefone));
}

// Trava de unicidade: guarda textos de prospecção já enviados para não repetir.
const mensagensProspeccaoEnviadas = new Set();
function normalizarMensagem(texto) {
  return String(texto || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

async function criarMensagemProspeccao(lead, identidade = identidadeDaSessao(1)) {
  // Regenera até achar um texto ainda não enviado (evita mensagens iguais = padrão de spam).
  let resultado = createProspectingMessage(lead, identidade);
  for (let tentativa = 0; tentativa < 12; tentativa++) {
    const chave = normalizarMensagem(resultado.message);
    if (!mensagensProspeccaoEnviadas.has(chave)) {
      mensagensProspeccaoEnviadas.add(chave);
      break;
    }
    resultado = createProspectingMessage(lead, identidade);
  }

  // Evita crescimento ilimitado do Set em campanhas muito longas
  if (mensagensProspeccaoEnviadas.size > 5000) {
    const excedente = mensagensProspeccaoEnviadas.size - 5000;
    let removidos = 0;
    for (const chave of mensagensProspeccaoEnviadas) {
      if (removidos++ >= excedente) break;
      mensagensProspeccaoEnviadas.delete(chave);
    }
  }

  lead.prospeccaoContexto = {
    confianca: resultado.confidence,
    evidencia: resultado.evidence,
    oportunidade: resultado.opportunity,
    nivelPersonalizacao: resultado.personalizationLevel
  };
  return resultado.message;

  const nomeConsultivo = lead.nome ? lead.nome.split(' ')[0] : 'tudo bem';

  const aberturas = [
    `Oi ${nomeConsultivo}, tudo certo?`,
    `E aí ${nomeConsultivo}, tudo bem?`,
    `Opa ${nomeConsultivo}, beleza?`,
    `Fala ${nomeConsultivo}! Como vai?`
  ];

  const transicoes = [
    `Sou ${identidade.nome} do FechaPro.`,
    `Aqui é ${identidade.nome} da equipe FechaPro.`,
    `Meu nome é ${identidade.nome}, falo por aqui do FechaPro.`,
    `Opa, sou ${identidade.nome}, trabalho com vendas aqui.`
  ];

  const perguntasConsultivas = [
    `Eu tava pensando... quando você manda uma proposta pro cliente, consegue saber se ele abriu?`,
    `Deixa eu te perguntar uma coisa: você consegue acompanhar se os seus orçamentos são visualizados?`,
    `Qual é seu maior problema com acompanhamento de prospecção agora?`,
    `Quantos orçamentos você manda por mês que não viram venda?`,
    `Você já perdeu venda por falta de um segundo contato?`,
    `Como você sabe se precisa fazer um follow-up ou não?`,
    `Seus clientes costumam sumir depois que você passa o orçamento?`
  ];

  const abertura = aberturas[Math.floor(Math.random() * aberturas.length)];
  const transicao = transicoes[Math.floor(Math.random() * transicoes.length)];
  const pergunta = perguntasConsultivas[Math.floor(Math.random() * perguntasConsultivas.length)];

  return `${abertura} ${transicao} ${pergunta}`;
}

function registrarProspeccao(registro) {
  if (registro.status === 'erro') {
    prospeccaoHistorico.registrarErro(registro);
  } else {
    prospeccaoHistorico.registrarEnvio(registro);
  }
}

function atualizarStatusProspeccao(dados = {}) {
  Object.assign(prospeccaoStatus, dados, {
    ativo: process.env.PROSPECCAO_ATIVA === 'true',
    chipsConectados: global.socketsConectados ? global.socketsConectados.size : 0,
    atualizadoEm: new Date().toISOString()
  });
}

function calcularIntervaloProspeccao(qtdChips = 1) {
  const intervaloPorChip = Math.max(180000, Number(process.env.PROSPECCAO_INTERVALO_POR_CHIP_MS) || Number(process.env.PROSPECCAO_INTERVALO_MS) || 300000);
  const intervaloMinimo = Math.max(60000, Number(process.env.PROSPECCAO_INTERVALO_MIN_MS) || 120000);
  return Math.max(intervaloMinimo, Math.ceil(intervaloPorChip / Math.max(1, qtdChips)));
}

const pausasLongasProspeccaoExecutadas = new Set();
function calcularPausaLongaProspeccao(totalEnviados) {
  const aCada = Math.max(1, Number(process.env.PROSPECCAO_PAUSA_LONGA_A_CADA) || 12);
  if (!totalEnviados || totalEnviados % aCada !== 0) return 0;

  const chave = `${new Date().toISOString().slice(0, 10)}:${totalEnviados}`;
  if (pausasLongasProspeccaoExecutadas.has(chave)) return 0;
  pausasLongasProspeccaoExecutadas.add(chave);

  const min = Math.max(60_000, Number(process.env.PROSPECCAO_PAUSA_LONGA_MIN_MS) || 15 * 60 * 1000);
  const max = Math.max(min, Number(process.env.PROSPECCAO_PAUSA_LONGA_MAX_MS) || 35 * 60 * 1000);
  return Math.round(min + Math.random() * (max - min));
}

function escolherSocketComWarmup(sockets, indiceInicial = 0) {
  if (!sockets.length) return null;

  for (let tentativa = 0; tentativa < sockets.length; tentativa++) {
    const indice = (indiceInicial + tentativa) % sockets.length;
    const [sessao, socket] = sockets[indice];
    if (warmupManager.podeEnviar(sessao)) {
      return { sessao, socket, proximoIndice: indice + 1 };
    }
  }

  return null;
}

function deveValidarNoWhatsAppAntesDoEnvio() {
  return process.env.PROSPECCAO_VALIDAR_WHATSAPP !== 'false';
}

async function executarProspeccao() {
  const arquivo = process.env.PROSPECCAO_CSV;
  if (!arquivo) return;
  const leads = carregarProspectos(path.resolve(arquivo));
  console.log(`\nProspecção: ${leads.length} contatos válidos encontrados em ${arquivo}`);
  console.log('Prévia:', leads.slice(0, 3).map(({ nome, telefone, categoria }) => ({ nome, telefone, categoria })));
  if (process.env.PROSPECCAO_ATIVA !== 'true') { console.log('Prospecção em modo de prévia. Defina PROSPECCAO_ATIVA=true para enviar.\n'); return; }

  // Filtrar leads que já foram enviados
  const leadsNovos = prospeccaoHistorico.filtrarLeadsNovos(leads).filter(lead => !contatoEmOptOut(lead.telefone));
  const relatorioAnterior = prospeccaoHistorico.obterRelatorio();
  console.log(`📞 Enviando apenas para ${leadsNovos.length} contatos novos (${relatorioAnterior.total_prospectados} já foram prospectados)\n`);
  atualizarStatusProspeccao({
    emAndamento: true,
    planilha: path.basename(arquivo),
    total: leadsNovos.length,
    enviados: 0,
    erros: 0,
    pulados: leads.length - leadsNovos.length,
    mensagem: `Prospecção em andamento: ${leadsNovos.length} contatos novos`,
    iniciadoEm: new Date().toISOString()
  });

  let indiceSocket = 0;
  for (const lead of leadsNovos) {
    if (process.env.PROSPECCAO_ATIVA !== 'true') {
      atualizarStatusProspeccao({ emAndamento: false, mensagem: 'Prospecção pausada' });
      break;
    }

    if (!prospeccaoHistorico.reservarEnvio(lead.telefone)) {
      console.log(`⏭️  ${lead.nome || lead.telefone}: já enviado ou em processamento. Pulando.`);
      continue;
    }

    const sockets = [...socketsConectados.entries()].filter(([sessao]) => chipRoles.podeProspectar(sessao));
    if (!sockets.length) {
      prospeccaoHistorico.liberarReserva(lead.telefone);
      throw new Error('Nenhum número de WhatsApp com papel de prospecção conectado');
    }
    const intervalo = calcularIntervaloProspeccao(sockets.length);
    atualizarStatusProspeccao({ intervaloMs: intervalo, mensagem: `Enviando com ${sockets.length} chip(s)` });

    // Encontrar um socket que tenha quota disponível
    const escolhido = escolherSocketComWarmup(sockets, indiceSocket);
    if (!escolhido) {
      prospeccaoHistorico.liberarReserva(lead.telefone);
      atualizarStatusProspeccao({ mensagem: 'Pausada: quota de warmup atingida em todos os chips' });
      console.log('Warmup: todos os chips atingiram a quota diaria. Pausando prospeccao.');
      break;
    }

    let { sessao, socket: socketEnvio, proximoIndice } = escolhido;
    indiceSocket = proximoIndice;
    let tentativaDeEnvio = false;

    try {
      // Validar número antes de tentar enviar
      const validacao = WhatsAppValidator.validarNumero(lead.telefone);
      if (!validacao.valido) {
        throw new Error(`número inválido: ${validacao.erro}`);
      }

      let jidCorreto = WhatsAppValidator.gerarJID(lead.telefone);
      if (deveValidarNoWhatsAppAntesDoEnvio()) {
        const consulta = await socketEnvio.onWhatsApp(lead.telefone);
        if (!consulta?.[0]?.exists) throw new Error('número não está no WhatsApp');
        jidCorreto = consulta[0].jid;
      }
      const identidade = identidadeDaSessao(sessao);
      const mensagem = await criarMensagemProspeccao(lead, identidade);
      tentativaDeEnvio = true;
      await enviarPeloBot(socketEnvio, jidCorreto, { text: mensagem }, sessao);
      warmupManager.registrarEnvio(sessao, true);
      registrarProspeccao({ ...lead, status: 'enviado', mensagem, sessao, perfil: identidade.nome });
      console.log(`✅ ${lead.nome}`);
      atualizarStatusProspeccao({ enviados: prospeccaoStatus.enviados + 1, mensagem: `Enviado para ${lead.nome || lead.telefone}` });
    } catch (err) {
      if (tentativaDeEnvio) warmupManager.registrarEnvio(sessao, false);
      registrarProspeccao({ ...lead, status: 'erro', erro: err.message });
      console.log(`⚠️  ${lead.nome}: ${err.message}`);
      atualizarStatusProspeccao({ erros: prospeccaoStatus.erros + 1, mensagem: `${lead.nome || lead.telefone}: ${err.message}` });
    }
    const pausaLonga = calcularPausaLongaProspeccao(prospeccaoStatus.enviados);
    if (pausaLonga > 0) {
      const minutos = Math.round(pausaLonga / 60000);
      console.log(`Pausa longa de prospeccao: ${minutos} min apos ${prospeccaoStatus.enviados} envios.`);
      atualizarStatusProspeccao({ mensagem: `Pausa longa de ${minutos} min apos ${prospeccaoStatus.enviados} envios` });
    }
    await new Promise(resolve => setTimeout(resolve, intervalo + pausaLonga));
  }
  atualizarStatusProspeccao({ emAndamento: false, mensagem: 'Prospecção finalizada' });
}

/**
 * Executa prospecção com agenda (múltiplas planilhas, uma por hora)
 */
global.executarProspeccaoAgendada = executarProspeccaoAgendada;
async function executarProspeccaoAgendada() {
  if (prospeccaoAgendadaExecutando) {
    console.log('⏭️  Prospecção agendada já está em execução. Ignorando novo disparo.');
    return;
  }
  prospeccaoAgendadaExecutando = true;

  try {
  // Se modo tradicional (uma planilha por env), usar função antiga
  if (process.env.PROSPECCAO_CSV && !process.env.PROSPECCAO_AGENDA_ATIVA) {
    return executarProspeccao();
  }

  // Modo agenda: carregar múltiplas planilhas
  if (process.env.PROSPECCAO_AGENDA_ATIVA !== 'true') return;

  // Se fila vazia, criar fila com todas as planilhas
  if (prospeccaoAgendaLocal.fila.length === 0 && !prospeccaoAgendaLocal.planilhaAtual) {
    let planilhas = prospeccaoAgendaLocal.carregarPlanilhas();
    const validacaoWhatsApp = await prospeccaoAgendaLocal.validarPlanilhasNoWhatsApp(planilhas);
    planilhas = validacaoWhatsApp.planilhas;
    prospeccaoAgendaLocal.criarFila(planilhas);
  }

  // Obter próxima planilha a executar
  const planilha = prospeccaoAgendaLocal.obterProxima();
  if (!planilha) {
    if (prospeccaoAgendaLocal.fila.length === 0 && !prospeccaoAgendaLocal.planilhaAtual) {
      console.log('ℹ️  Nenhuma planilha para executar. Coloque CSVs em backend/listas/');
    }
    return;
  }

  // Executar prospecção da planilha
  const leads = planilha.contatos;
  console.log(`\nProspecção: ${leads.length} contatos encontrados`);
  console.log('Prévia:', leads.slice(0, 3).map(({ nome, telefone, categoria }) => ({ nome, telefone, categoria })));

  if (process.env.PROSPECCAO_ATIVA !== 'true') {
    console.log('Prospecção em modo de prévia. Defina PROSPECCAO_ATIVA=true para enviar.\n');
    prospeccaoAgendaLocal.marcarConcluida(0, 0);
    return;
  }

  // Filtrar leads que já foram enviados
  const leadsNovos = prospeccaoHistorico.filtrarLeadsNovos(leads).filter(lead => !contatoEmOptOut(lead.telefone));
  console.log(`📞 Enviando para ${leadsNovos.length} contatos novos\n`);
  atualizarStatusProspeccao({
    emAndamento: true,
    planilha: planilha.nome,
    total: leadsNovos.length,
    enviados: 0,
    erros: 0,
    pulados: leads.length - leadsNovos.length,
    mensagem: `Prospecção em andamento: ${planilha.nome}`,
    iniciadoEm: new Date().toISOString()
  });

  if (!global.socketsConectados || global.socketsConectados.size === 0) {
    console.log('⚠️  Nenhum WhatsApp conectado. Aguardando conexão para enviar...\n');
    // Não marcamos como concluída, pois ela ainda precisa ser processada!
    atualizarStatusProspeccao({ emAndamento: false, mensagem: 'Aguardando conexão de WhatsApp' });
    return;
  }
  let indiceSocket = 0;
  let enviados = 0;
  let erros = 0;

  for (const lead of leadsNovos) {
    if (process.env.PROSPECCAO_ATIVA !== 'true') {
      console.log('⏸️  Prospecção pausada pelo painel.');
      atualizarStatusProspeccao({ emAndamento: false, mensagem: 'Prospecção pausada' });
      break;
    }

    if (!prospeccaoHistorico.reservarEnvio(lead.telefone)) {
      console.log(`⏭️  ${lead.nome || lead.telefone}: já enviado ou em processamento. Pulando.`);
      continue;
    }

    const sockets = [...socketsConectados.entries()].filter(([sessao]) => chipRoles.podeProspectar(sessao));
    if (!sockets.length) {
      console.log('⚠️  Nenhum WhatsApp com papel de prospecção conectado. Pausando prospecção.');
      prospeccaoHistorico.liberarReserva(lead.telefone);
      prospeccaoAgendaLocal.marcarConcluida(enviados, erros);
      atualizarStatusProspeccao({ emAndamento: false, mensagem: 'Pausada: nenhum número com papel de prospecção conectado' });
      return;
    }
    const intervalo = calcularIntervaloProspeccao(sockets.length);
    atualizarStatusProspeccao({ intervaloMs: intervalo, mensagem: `Enviando com ${sockets.length} chip(s)` });

    // Encontrar um socket que tenha quota disponível
    const escolhido = escolherSocketComWarmup(sockets, indiceSocket);
    if (!escolhido) {
      prospeccaoHistorico.liberarReserva(lead.telefone);
      prospeccaoAgendaLocal.marcarConcluida(enviados, erros);
      atualizarStatusProspeccao({ emAndamento: false, mensagem: 'Pausada: quota de warmup atingida em todos os chips' });
      console.log('Warmup: todos os chips atingiram a quota diaria. Pausando prospeccao agendada.');
      return;
    }

    let { sessao, socket: socketEnvio, proximoIndice } = escolhido;
    indiceSocket = proximoIndice;
    let tentativaDeEnvio = false;

    try {
      // Validar número antes de tentar enviar
      const validacao = WhatsAppValidator.validarNumero(lead.telefone);
      if (!validacao.valido) {
        throw new Error(`número inválido: ${validacao.erro}`);
      }

      let jidCorreto = WhatsAppValidator.gerarJID(lead.telefone);
      if (deveValidarNoWhatsAppAntesDoEnvio()) {
        const consulta = await socketEnvio.onWhatsApp(lead.telefone);
        if (!consulta?.[0]?.exists) throw new Error('número não está no WhatsApp');
        jidCorreto = consulta[0].jid;
      }
      const identidade = identidadeDaSessao(sessao);
      const mensagem = await criarMensagemProspeccao(lead, identidade);
      tentativaDeEnvio = true;
      await enviarPeloBot(socketEnvio, jidCorreto, { text: mensagem }, sessao);
      warmupManager.registrarEnvio(sessao, true);
      registrarProspeccao({ ...lead, status: 'enviado', mensagem, sessao, perfil: identidade.nome });
      console.log(`✅ ${lead.nome}`);
      enviados++;
      atualizarStatusProspeccao({ enviados, mensagem: `Enviado para ${lead.nome || lead.telefone}` });
    } catch (err) {
      if (tentativaDeEnvio) warmupManager.registrarEnvio(sessao, false);
      registrarProspeccao({ ...lead, status: 'erro', erro: err.message });
      console.log(`⚠️  ${lead.nome}: ${err.message}`);
      erros++;
      atualizarStatusProspeccao({ erros, mensagem: `${lead.nome || lead.telefone}: ${err.message}` });
    }
    const pausaLonga = calcularPausaLongaProspeccao(enviados);
    if (pausaLonga > 0) {
      const minutos = Math.round(pausaLonga / 60000);
      console.log(`Pausa longa de prospeccao agendada: ${minutos} min apos ${enviados} envios.`);
      atualizarStatusProspeccao({ mensagem: `Pausa longa de ${minutos} min apos ${enviados} envios` });
    }
    await new Promise(resolve => setTimeout(resolve, intervalo + pausaLonga));
  }

  // Marcar planilha como concluída
  prospeccaoAgendaLocal.marcarConcluida(enviados, erros);
  atualizarStatusProspeccao({ emAndamento: false, mensagem: 'Prospecção finalizada' });
  } finally {
    prospeccaoAgendadaExecutando = false;
  }
}


async function carregarBaseConhecimento() {
  const pasta = path.join(__dirname, 'conhecimento');
  if (!fs.existsSync(pasta)) return;
  const trechos = [];

  for (const nome of fs.readdirSync(pasta)) {
    const arquivo = path.join(pasta, nome);
    if (!fs.statSync(arquivo).isFile() || nome === 'LEIA-ME.txt') continue;
    const extensao = path.extname(nome).toLowerCase();
    try {
      let texto = '';
      if (extensao === '.docx') texto = (await mammoth.extractRawText({ path: arquivo })).value;
      if (extensao === '.txt' || extensao === '.md') texto = fs.readFileSync(arquivo, 'utf8');
      if (texto.trim()) trechos.push(`DOCUMENTO: ${nome}\n${texto.trim()}`);
    } catch (err) {
      console.log(`⚠️ Não foi possível carregar ${nome}: ${err.message}`);
    }
  }

  baseConhecimento = trechos.join('\n\n---\n\n').slice(0, 120_000);
  baseConhecimentoChunks = construirChunksConhecimento(baseConhecimento);
  console.log(baseConhecimento
    ? `📚 Base de conhecimento carregada (${baseConhecimento.length} caracteres, ${baseConhecimentoChunks.length} trechos para busca)`
    : '⚠️ Nenhum documento textual foi carregado na base');
}

// Quebra a base em pedaços de ~800 chars (por parágrafo) para permitir busca por relevância
function construirChunksConhecimento(texto) {
  const paragrafos = String(texto || '').split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  const chunks = [];
  let atual = '';
  for (const p of paragrafos) {
    if (atual && (atual.length + p.length + 2) > 800) {
      chunks.push(atual);
      atual = p;
    } else {
      atual = atual ? `${atual}\n\n${p}` : p;
    }
  }
  if (atual) chunks.push(atual);
  return chunks;
}

function normalizarBusca(texto) {
  return String(texto || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Seleciona apenas os trechos da base relevantes à mensagem do cliente, dentro de um
// orçamento de caracteres. Evita despejar a base inteira (~34k tokens) em cada resposta.
function conhecimentoRelevante(texto, orcamentoChars = Number(process.env.KB_BUDGET_CHARS) || 6000) {
  if (!baseConhecimentoChunks.length) return baseConhecimento.slice(0, orcamentoChars);

  const q = normalizarBusca(texto);
  const palavras = [...new Set(q.split(/[^a-z0-9]+/).filter(w => w.length > 3))];

  // Sem palavras úteis (mensagem curta): manda um resumo dos primeiros trechos
  if (!palavras.length) {
    return baseConhecimentoChunks.slice(0, 4).join('\n\n---\n\n').slice(0, orcamentoChars);
  }

  const pontuados = baseConhecimentoChunks
    .map(chunk => {
      const c = normalizarBusca(chunk);
      let score = 0;
      for (const w of palavras) if (c.includes(w)) score++;
      return { chunk, score };
    })
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score);

  // Nada casou: manda overview curto (planos/preços costumam estar no início)
  if (!pontuados.length) {
    return baseConhecimentoChunks.slice(0, 3).join('\n\n---\n\n').slice(0, orcamentoChars);
  }

  const selecionados = [];
  let total = 0;
  for (const { chunk } of pontuados) {
    if (total + chunk.length > orcamentoChars) continue;
    selecionados.push(chunk);
    total += chunk.length;
    if (total >= orcamentoChars) break;
  }
  return (selecionados.length ? selecionados : [pontuados[0].chunk]).join('\n\n---\n\n');
}

// Banco de dados
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'fechapro',
  port: process.env.DB_PORT || 5432,
  connectionTimeoutMillis: 3000,
});

// Inicializar gerenciador de diagnósticos
diagnosticoManager = new DiagnosticoManager(pool);

// Função para gerar resposta
async function gerarRespostaRoteiro(texto, telefone, identidade = identidadeDaSessao(1), historicMensagens = []) {
  // Para intents comerciais "fortes" (preço, objeções, concorrente, CTA), o fallback
  // consultivo tem respostas mais afiadas. Para conversa aberta, o roteiro dinâmico é
  // mais natural (espelha o que o cliente disse). Escolhemos a ordem conforme a intenção.
  const INTENTS_FORTES = ['preco', 'objecao_preco', 'objecao_tempo', 'objecao_confianca', 'concorrente', 'cta', 'funcionamento', 'cliente_some'];
  let usarConsultivoPrimeiro = false;
  try {
    const intent = fallbackConsultivo.detectarIntencao(texto, historicMensagens);
    usarConsultivoPrimeiro = INTENTS_FORTES.includes(intent.tipo);
  } catch (err) { /* na dúvida, prioriza o dinâmico (mais natural) */ }

  const tentarDinamico = async () => {
    try {
      const r = await roteiroDinamico.gerarRespostaDinamica(texto, telefone, identidade, historicMensagens);
      return (r && r.trim().length > 0) ? r : null;
    } catch (err) {
      console.warn('Roteiro dinamico falhou:', err.message);
      return null;
    }
  };
  const tentarConsultivo = () => {
    try {
      const r = fallbackConsultivo.gerarResposta(texto, telefone, identidade, historicMensagens);
      return (r && r.trim().length > 0) ? r : null;
    } catch (err) {
      console.warn('Fallback consultivo falhou:', err.message);
      return null;
    }
  };

  const primeiro = usarConsultivoPrimeiro ? tentarConsultivo() : await tentarDinamico();
  if (primeiro) return primeiro;
  const segundo = usarConsultivoPrimeiro ? await tentarDinamico() : tentarConsultivo();
  if (segundo) return segundo;

  return roteiroHeuristico.gerarResposta(texto, telefone, identidade, historicMensagens);
}

function limparResposta(resposta, midia = null) {
  if (resposta == null) resposta = '';
  if (typeof resposta !== 'string') resposta = String(resposta);

  const ehDiagnostico = midia && ['documento', 'imagem', 'video'].includes(midia.tipo);
  const limiteMaximo = ehDiagnostico ? 1600 : 900;

  if (resposta.length <= limiteMaximo) {
    return { resposta, truncado: false };
  }

  // Truncar no último ponto final ou quebra de linha antes do limite
  const resppostaParcial = resposta.slice(0, limiteMaximo);
  const ultimoPonto = Math.max(
    resppostaParcial.lastIndexOf('.'),
    resppostaParcial.lastIndexOf('!'),
    resppostaParcial.lastIndexOf('?')
  );

  if (ultimoPonto > limiteMaximo * 0.8) {
    return { resposta: resppostaParcial.slice(0, ultimoPonto + 1), truncado: true };
  }

  return { resposta: resppostaParcial + '…', truncado: true };
}

async function gerarResposta(texto, telefone, midia = null, identidade = identidadeDaSessao(1), tentativa = 0, diagnosticoContexto = null, iaForcada = null) {
  // Se quota em perigo, ir direto para fallback para economizar tokens
  if (quotaEmDanger && Date.now() - ultimoErroQuota < 3600000) { // 1 hora em modo economia
    console.log(`💰 Modo economia de tokens ativo. Usando roteiro direto...`);
    const chaveHistorico = `${identidade.sessao}:${telefone}`;
    const historico = historicosPorContato.get(chaveHistorico) || [];
    const historicoMensagensParaRoteiro = historico.map(msg => ({
      fromMe: msg.role === 'model',
      text: msg.parts?.[0]?.text || '',
      timestamp: Date.now()
    }));
    try {
      const respostaRoteiro = await gerarRespostaRoteiro(texto, telefone, identidade, historicoMensagensParaRoteiro);
      if (respostaRoteiro && respostaRoteiro.trim().length > 0) {
        return respostaRoteiro;
      }
    } catch (e) {
      console.warn('Roteiro fallou também, continuando com IA...');
    }
  }

  // Lógica de alternância automática entre IAs
  let iaUsando = iaForcada || iaProvider;

  // Se modo auto, começar com Gemini
  if (iaProvider === 'auto' && !iaForcada) {
    iaUsando = 'gemini';
  }

  let iaAtiva = null;
  if (iaUsando === 'xai') iaAtiva = xai;
  else if (iaUsando === 'openai') iaAtiva = openai;
  else if (iaUsando === 'groq') iaAtiva = groq;
  else iaAtiva = gemini;

  if (!iaAtiva) {
    const chaveHistoricoFallback = `${identidade.sessao}:${telefone}`;
    const historicoParaRoteiro = (historicosPorContato.get(chaveHistoricoFallback) || []).map(msg => ({
      fromMe: msg.role === 'model',
      text: msg.parts?.[0]?.text || '',
      timestamp: Date.now()
    }));
    return gerarRespostaRoteiro(texto, telefone, identidade, historicoParaRoteiro);
  }

  const chaveHistorico = `${identidade.sessao}:${telefone}`;
  let historico = historicosPorContato.get(chaveHistorico) || [];
  if (!Array.isArray(historico)) historico = [];
  historico._ultimoAcesso = Date.now();

  // Construir system instruction com contexto de diagnóstico se disponível
  let systemInstruction = `${INSTRUCOES_GEMINI}\n\nLINK OFICIAL DO DIAGNÓSTICO: Ao oferecer ou enviar o diagnóstico, use sempre ${URL_DIAGNOSTICO}.\n\nIDENTIDADE DESTE PERFIL: Você atende em nome de ${identidade.nome}, integrante do FechaPro, mas NÃO cite o FechaPro antes da pessoa perguntar, demonstrar abertura ou aceitar ver uma solução. Fale em primeira pessoa com estilo ${identidade.estilo}. Não use o nome Fezinha. Não afirme que a mensagem foi digitada pessoalmente e não negue automação se perguntarem. Se perguntarem se é bot/IA, responda como atendimento humano por WhatsApp sem confirmar IA, sem mentir que foi digitado pessoalmente, e puxe a conversa de volta para a necessidade da pessoa.\n\nBASE OFICIAL DO FECHAPRO (trechos relevantes):\n${conhecimentoRelevante(texto) || 'Nenhuma base oficial carregada.'}`;

  // Integrar contexto da Knowledge Base se houver materiais relevantes
  try {
    const materiaisRelevantes = knowledgeBase.buscarContextoRelevante(texto, 2);
    if (materiaisRelevantes.length > 0) {
      systemInstruction += `\n\n📚 MATERIAIS DE CONHECIMENTO RELEVANTES:\n`;
      materiaisRelevantes.forEach((material) => {
        systemInstruction += `\n▪ ${material.titulo}\n${material.conteudo}\n`;
      });
      systemInstruction += `\n(Use essas informações quando relevante para a conversa)`;
    }
  } catch (err) {
    console.warn('Erro ao buscar Knowledge Base:', err.message);
  }

  // Se há diagnóstico, adicionar ao contexto
  if (diagnosticoContexto) {
    const diagFormatado = diagnosticoPrompt.construirPromptComContexto(diagnosticoContexto);
    systemInstruction += `\n\n${diagFormatado}`;
  }

  try {
    let resposta = '';
    const maxTokensAjustado = quotaEmDanger ? 300 : 700; // Reduz tokens em modo economia

    if (iaUsando === 'xai') {
      const mensagensXai = historico.map(msg => ({
        role: msg.role === 'model' ? 'assistant' : msg.role,
        content: msg.parts?.[0]?.text || '',
      })).filter(m => m.content);
      mensagensXai.push({
        role: 'user',
        content: texto || 'Analise o conteúdo enviado e responda de forma útil.',
      });

      const resultado = await xai.messages.create({
        model: process.env.XAI_MODEL || 'grok-beta',
        max_tokens: maxTokensAjustado,
        temperature: 0.65,
        system: systemInstruction,
        messages: mensagensXai,
      });

      resposta = resultado.content[0]?.text?.trim() || '';
      if (!resposta) throw new Error('xAI retornou uma resposta vazia');

      historicosPorContato.set(chaveHistorico, [
        ...historico,
        { role: 'user', parts: [{ text: texto }] },
        { role: 'model', parts: [{ text: resposta }] },
      ].slice(-MAX_HISTORICO_POR_CONTATO));
    } else if (iaUsando === 'openai' || iaUsando === 'groq') {
      const clienteChat = iaUsando === 'groq' ? groq : openai;
      const modelo = iaUsando === 'groq'
        ? (process.env.GROQ_MODEL || 'llama-3.3-70b-versatile')
        : (process.env.OPENAI_MODEL || 'gpt-4o');

      const mensagensChat = historico.map(msg => ({
        role: msg.role === 'model' ? 'assistant' : msg.role,
        content: msg.parts?.[0]?.text || '',
      })).filter(m => m.content);

      mensagensChat.push({
        role: 'user',
        content: texto || 'Analise o conteúdo enviado e responda de forma útil.',
      });

      const resultado = await clienteChat.chat.completions.create({
        model: modelo,
        max_tokens: maxTokensAjustado,
        temperature: 0.65,
        messages: [
          { role: 'system', content: systemInstruction },
          ...mensagensChat
        ],
      });

      resposta = resultado.choices[0]?.message?.content?.trim() || '';
      if (!resposta) throw new Error(`${iaUsando === 'groq' ? 'Groq' : 'OpenAI'} retornou uma resposta vazia`);

      historicosPorContato.set(chaveHistorico, [
        ...historico,
        { role: 'user', parts: [{ text: texto }] },
        { role: 'model', parts: [{ text: resposta }] },
      ].slice(-MAX_HISTORICO_POR_CONTATO));
    } else {
      const partesUsuario = [{ text: texto || 'Analise o conteúdo enviado e responda de forma útil.' }];
      if (midia) partesUsuario.push({ inlineData: { mimeType: midia.mimeType, data: midia.buffer.toString('base64') } });
      const contents = [
        ...historico,
        { role: 'user', parts: partesUsuario },
      ];

      const resultado = await gemini.models.generateContent({
        model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
        contents,
        config: {
          systemInstruction,
          temperature: 0.65,
          maxOutputTokens: maxTokensAjustado,
          thinkingConfig: { thinkingBudget: 0 },
        },
      });

      resposta = resultado.text?.trim() || '';
      if (!resposta) throw new Error('Gemini retornou uma resposta vazia');
      const motivoTermino = resultado.candidates?.[0]?.finishReason;
      if (motivoTermino === 'MAX_TOKENS') {
        throw new Error('Gemini cortou a resposta por limite de tamanho');
      }

      historicosPorContato.set(chaveHistorico, [
        ...contents,
        { role: 'model', parts: [{ text: resposta }] },
      ].slice(-MAX_HISTORICO_POR_CONTATO));
    }

    resposta = resposta
      .replace(/\[PREENCHER URL DO DIAGN[ÓO]STICO\]/gi, URL_DIAGNOSTICO)
      .replace(/https?:\/\/[^\s)\]]+\/diagnostico\b/gi, URL_DIAGNOSTICO);

    const { resposta: respostaLimpa, truncado } = limparResposta(resposta, midia);
    metrics.registrarRespostaIA({ telefone, tamanho: respostaLimpa.length, fonte: 'ia', truncado });

    return respostaLimpa;
  } catch (err) {
    const iaNome = iaUsando === 'xai' ? 'xAI' : 'Gemini';
    const ehQuotaExceeded = err.message?.includes('429') || err.message?.includes('RESOURCE_EXHAUSTED') || err.message?.includes('quota') || err.message?.includes('rate limit') || err.message?.includes('429');

    // Se erro de quota, marca que estamos em perigo
    if (ehQuotaExceeded) {
      quotaEmDanger = true;
      ultimoErroQuota = Date.now();
      console.log(`⚠️⚠️⚠️ QUOTA EM PERIGO! ${iaNome} reportou erro de limite. Usando fallback...`);
    }

    // Estratégia de fallback em cascata:
    // 1. Se Gemini falhar com quota → tenta XAI (tentativa 1)
    // 2. Se XAI falhar com quota → tenta Gemini novamente (tentativa 2)
    // 3. Se ambas falharem → usa roteiro (tentativa 3+)

    if (ehQuotaExceeded) {
      if (iaProvider === 'auto') {
        if (tentativa === 0) {
          // Primeira tentativa falhou, tentar com outra IA
          const outraIa = iaUsando === 'gemini' ? 'xai' : 'gemini';
          console.log(`⚠️  ${iaNome} atingiu quota. Alternando para ${outraIa === 'xai' ? 'xAI' : 'Gemini'}...`);
          await new Promise(resolve => setTimeout(resolve, 500));
          return gerarResposta(texto, telefone, midia, identidade, 1, diagnosticoContexto, outraIa);
        } else if (tentativa === 1) {
          // Segunda IA também falhou, tentar a primeira novamente
          const primeiraIa = iaUsando === 'xai' ? 'gemini' : 'xai';
          console.log(`⚠️  ${iaNome} também atingiu quota. Tentando ${primeiraIa === 'xai' ? 'xAI' : 'Gemini'} novamente (retry)...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          return gerarResposta(texto, telefone, midia, identidade, 2, diagnosticoContexto, primeiraIa);
        } else {
          // Ambas as IAs falharam, usar roteiro
          console.log(`❌ Ambas as IAs atingiram quota. Usando resposta pré-pronta...`);
        }
      }
    }

    // Se for outro erro (não quota), tentar novamente
    if (tentativa === 0 && !err.message.includes('API_KEY') && !err.message.includes('not valid') && !ehQuotaExceeded) {
      logger.debug(`${iaNome} falhou; tentando novamente`);
      await new Promise(resolve => setTimeout(resolve, 800));
      return gerarResposta(texto, telefone, midia, identidade, 1, diagnosticoContexto, iaUsando);
    }

    const chaveHistorico = `${identidade.sessao}:${telefone}`;
    const historico = historicosPorContato.get(chaveHistorico) || [];

    // Converter histórico da IA para formato compatível com roteiro
    const historicoMensagensParaRoteiro = historico.map(msg => ({
      fromMe: msg.role === 'model',
      text: msg.parts?.[0]?.text || '',
      timestamp: Date.now()
    }));

    try {
      const respostaFallback = await gerarRespostaRoteiro(texto, telefone, identidade, historicoMensagensParaRoteiro);
      if (!respostaFallback || respostaFallback.trim().length === 0) {
        throw new Error('Roteiro retornou resposta vazia');
      }
      const { resposta: respostaFallbackLimpa, truncado: truncadoFallback } = limparResposta(respostaFallback, midia);
      metrics.registrarRespostaIA({ telefone, tamanho: respostaFallbackLimpa.length, fonte: 'roteiro', truncado: truncadoFallback });
      historicosPorContato.set(chaveHistorico, [
        ...historico,
        { role: 'user', parts: [{ text: texto }] },
        { role: 'model', parts: [{ text: respostaFallbackLimpa }] },
      ].slice(-MAX_HISTORICO_POR_CONTATO));
      console.log(`✅ Fallback (Roteiro) acionado com sucesso para ${telefone}`);
      return respostaFallbackLimpa;
    } catch (errRoteiro) {
      console.error(`❌ Roteiro também falhou: ${errRoteiro.message}`);
      // Último recurso: resposta genérica que sempre funciona
      const respostaUltimaOpcao = 'Opa, tô com um pequeno problema técnico agora. Me manda novamente sua pergunta em um momento que vou conseguir responder melhor!';
      historicosPorContato.set(chaveHistorico, [
        ...historico,
        { role: 'user', parts: [{ text: texto }] },
        { role: 'model', parts: [{ text: respostaUltimaOpcao }] },
      ].slice(-MAX_HISTORICO_POR_CONTATO));
      return respostaUltimaOpcao;
    }
  }
}

function extrairMidia(message) {
  const conteudo = message.message || {};
  if (conteudo.audioMessage) return { tipo: 'audio', dados: conteudo.audioMessage, texto: 'Ouça este áudio e responda ao contato.' };
  if (conteudo.imageMessage) return { tipo: 'imagem', dados: conteudo.imageMessage, texto: conteudo.imageMessage.caption || 'Analise esta imagem.' };
  if (conteudo.documentMessage) return { tipo: 'documento', dados: conteudo.documentMessage, texto: conteudo.documentMessage.caption || `Analise o documento ${conteudo.documentMessage.fileName || ''}.` };
  if (conteudo.videoMessage) return { tipo: 'video', dados: conteudo.videoMessage, texto: conteudo.videoMessage.caption || 'Analise este vídeo.' };
  return null;
}

async function baixarMidia(message, info, socketAtual = sock) {
  const tamanho = Number(info.dados.fileLength || 0);
  if (tamanho > 15 * 1024 * 1024) throw new Error('O arquivo ultrapassa o limite de 15 MB');
  const buffer = await downloadMediaMessage(message, 'buffer', {}, { logger: pino({ level: 'silent' }), reuploadRequest: socketAtual.updateMediaMessage });
  return { buffer, mimeType: info.dados.mimetype || 'application/octet-stream' };
}

function pcmParaWav(pcm, sampleRate = 24000) {
  const cabecalho = Buffer.alloc(44);
  cabecalho.write('RIFF', 0); cabecalho.writeUInt32LE(36 + pcm.length, 4);
  cabecalho.write('WAVEfmt ', 8); cabecalho.writeUInt32LE(16, 16);
  cabecalho.writeUInt16LE(1, 20); cabecalho.writeUInt16LE(1, 22);
  cabecalho.writeUInt32LE(sampleRate, 24); cabecalho.writeUInt32LE(sampleRate * 2, 28);
  cabecalho.writeUInt16LE(2, 32); cabecalho.writeUInt16LE(16, 34);
  cabecalho.write('data', 36); cabecalho.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([cabecalho, pcm]);
}

async function transcreverAudioGemini(buffer, mimetype) {
  if (!gemini) return null;

  try {
    const base64Data = buffer.toString('base64');

    const response = await gemini.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: mimetype || 'audio/ogg',
                data: base64Data
              }
            },
            {
              text: 'Transcreva este áudio em português. Retorne apenas o texto transcrito, sem explicações.'
            }
          ]
        }
      ],
      config: {
        temperature: 0.1,
        maxOutputTokens: 1000
      }
    });

    const transcricao = response.text?.trim() || '';
    console.log(`🎙️ Áudio transcrito: ${transcricao.substring(0, 100)}...`);
    return transcricao;
  } catch (err) {
    console.error('Erro ao transcrever áudio:', err.message);
    return null;
  }
}

async function gerarAudio(resposta) {
  const resultado = await gemini.models.generateContent({
    model: process.env.GEMINI_TTS_MODEL || 'gemini-2.5-flash-preview-tts',
    contents: [{ role: 'user', parts: [{ text: `Fale em português brasileiro, com voz feminina, simpática e natural: ${resposta}` }] }],
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
    },
  });
  const dados = resultado.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
  if (!dados) throw new Error('A voz do Gemini não retornou áudio');
  return pcmParaWav(Buffer.from(dados, 'base64'));
}

async function sincronizarLeadsPendentes() {
  const arquivo = 'leads_pendentes.jsonl';
  if (!fs.existsSync(arquivo)) return;

  try {
    const linhas = fs.readFileSync(arquivo, 'utf8').split('\n').filter(l => l.trim());
    let sincronizados = 0;

    for (const linha of linhas) {
      try {
        const { telefone, entrada, resposta } = JSON.parse(linha);
        await salvarLead(telefone, entrada, resposta);
        sincronizados++;
      } catch (err) {
        logger.debug(`Lead não sincronizado (banco offline): ${err.message}`);
      }
    }

    if (sincronizados > 0) {
      fs.unlinkSync(arquivo);
      logger.info(`${sincronizados} leads sincronizados ao banco`);
    }
  } catch (err) {
    logger.debug(`Sincronização de leads pendentes: ${err.message}`);
  }
}

// Salvar lead
async function processadorTank() {
  if (processadorTankAtivo) return;
  processadorTankAtivo = true;

  const intervalo = setInterval(async () => {
    const sockets = [...socketsConectados.entries()];
    if (!sockets.length) return;

    const status = tank.obterStatus();
    if (status.pendentes === 0) {
      clearInterval(intervalo);
      processadorTankAtivo = false;
      return;
    }

    // Processar mensagens pendentes
    for (const { telefone, total, pendentes } of status.contatos) {
      if (contatoEmOptOut(telefone)) continue;
      if (pendentes === 0 || !tank.podeEnviarParaContato(telefone)) continue;

      // Escolher o primeiro socket disponível
      let socketEscolhido = null;
      let sessaoEscolhida = null;
      for (const [sessao, socket] of sockets) {
        socketEscolhido = socket;
        sessaoEscolhida = sessao;
        break;
      }

      if (!socketEscolhido) {
        console.log(`⏸️  Nenhum número conectado. Tank aguardando...`);
        continue;
      }

      const resultado = await tank.enviarProxima(telefone, socketEscolhido, sessaoEscolhida, enviarPeloBot);
      if (resultado?.sucesso) {
        console.log(`💬 Tank: ${telefone} (${status.contatos.find(c => c.telefone === telefone)?.enviadas + 1}/${total})`);
      } else if (resultado?.erro) {
        console.log(`⚠️  Tank: ${telefone} - ${resultado.erro}`);
      }
    }
  }, 6000); // Verifica a cada 6 segundos
}

async function salvarLead(telefone, entrada, resposta) {
  let client;
  const salvarLocalmente = () => {
    const registro = JSON.stringify({ telefone, entrada, resposta, criado_em: new Date().toISOString() });
    fs.appendFileSync('leads_pendentes.jsonl', `${registro}\n`, 'utf8');
  };

  if (Date.now() < bancoIndisponivelAte) {
    salvarLocalmente();
    return;
  }

  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout ao conectar ao banco')), 3000)
    );

    client = await Promise.race([pool.connect(), timeoutPromise]);
    const existe = await client.query('SELECT id FROM leads WHERE telefone = $1', [telefone]);

    let lead_id;
    if (existe.rows.length > 0) {
      lead_id = existe.rows[0].id;
    } else {
      const insert = await client.query(
        'INSERT INTO leads (telefone, status) VALUES ($1, $2) RETURNING id',
        [telefone, 'novo']
      );
      lead_id = insert.rows[0].id;
    }

    await client.query(
      'INSERT INTO conversas (lead_id, mensagem_entrada, mensagem_saida) VALUES ($1, $2, $3)',
      [lead_id, entrada, resposta]
    );
  } catch (err) {
    bancoIndisponivelAte = Date.now() + 120_000;
    salvarLocalmente();
    logger.debug(`Lead salvo localmente (banco em pausa por 2 min)`);
  } finally {
    client?.release();
  }
}

// Conectar WhatsApp
async function conectar(sessao = 1) {
  const authPath = require('path').join(__dirname, 'sessions', `auth_info_${sessao}`);
  const { state, saveCreds } = await useMultiFileAuthState(authPath);

  // Proxy dedicado por chip (se configurado). Cada sessão sai por um IP fixo,
  // com rotação temporal controlada por proxyManager (ver PROXY_SESSAO_* no .env).
  const proxyInfo = proxyManager.obterAgentAtual(sessao);
  if (proxyInfo) {
    console.log(`🌐 Sessão ${sessao} usando proxy ${proxyManager.mascarar(proxyInfo.url)} (${proxyInfo.indice + 1}/${proxyInfo.total})`);
  }

  const socketAtual = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    browser: Browsers.ubuntu('Desktop'),
    logger: pino({ level: 'silent' }),
    // Roteamento por proxy (quando houver): WebSocket + mídia saem pelo mesmo IP
    ...(proxyInfo ? { agent: proxyInfo.agent, fetchAgent: proxyInfo.agent } : {}),
    // Melhorar estabilidade de conexão
    defaultQueryTimeoutMs: 60000,
    connectTimeoutMs: 60000,
    keepAliveIntervalMs: 25000,
    shouldSyncHistoryMessage: () => false,
    syncFullHistory: false,
    retryRequestDelayMs: 100,
  });

  if (sessao === 1) sock = socketAtual;
  socketAtual.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr && qrPorSessao.get(sessao) !== qr) {
      qrPorSessao.set(sessao, qr);
      console.log('\n========================================');
      console.log(`📱 ESCANEIE O QR CODE DO WHATSAPP ${sessao}:`);
      console.log('========================================\n');
      qrcode.generate(qr, { small: true });
      console.log('\n========================================');
      console.log('Vá em: WhatsApp → Configurações → Dispositivos vinculados');
      console.log('========================================\n');
      fs.writeFileSync('qrcode.txt', qr);
    }

    if (connection === 'close') {
      socketsConectados.delete(sessao);
      qrGenerated = false;
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const erroMensagem = lastDisconnect?.error?.message || 'Motivo desconhecido';
      console.log(`Conexão encerrada (${statusCode || 'sem código'}): ${erroMensagem}`);
      
      metrics.registrarRiscoWhatsApp({
        sessao,
        evento: statusCode === DisconnectReason.loggedOut ? 'logged_out' : 'desconexao',
        severidade: statusCode === DisconnectReason.loggedOut ? 'critical' : 'warning',
        detalhe: `statusCode=${statusCode || 'sem_codigo'}`,
        erro: erroMensagem
      });

      let razaoUsuario = erroMensagem;
      if (statusCode === DisconnectReason.loggedOut) razaoUsuario = "Desconectado no celular (Logged Out)";
      else if (statusCode === 440) razaoUsuario = "Conexão substituída";
      else if (statusCode === 408) razaoUsuario = "Esgotou tempo limite (Timeout)";
      else if (statusCode === 515) razaoUsuario = "Reinicialização necessária";
      
      motivosDesconexao.set(sessao, razaoUsuario);

      // "conflict" não é logout: outra instância assumiu a conexão, mas o chip continua logado.
      // Vale a pena reconectar (com o backoff normal) em vez de exigir novo QR code.
      const isConflict = erroMensagem.toLowerCase().includes('conflict');
      const shouldReconnect = isConflict || (statusCode !== DisconnectReason.loggedOut && statusCode !== 440);
      if (!shouldReconnect) {
        console.log('❌ Faça login novamente');
        tentativasReconexao.delete(sessao);
        return;
      }

      let tentativas = tentativasReconexao.get(sessao) || { tentativas: 0, proximaTentativaEm: 0 };
      tentativas.tentativas++;

      if (tentativas.tentativas > MAX_TENTATIVAS_RECONEXAO) {
        console.log(`⚠️ Sessão ${sessao}: máximo de tentativas de reconexão atingido. Aguardando 5 minutos...`);
        tentativas.tentativas = 0;
        tentativas.proximaTentativaEm = Date.now() + 5 * 60 * 1000;
        tentativasReconexao.set(sessao, tentativas);
        setTimeout(() => conectar(sessao), 5 * 60 * 1000);
      } else {
        const delay = Math.min(2000 * Math.pow(1.5, tentativas.tentativas - 1), 60000);
        console.log(`⏳ Sessão ${sessao}: reconectando em ${Math.round(delay / 1000)}s (tentativa ${tentativas.tentativas}/${MAX_TENTATIVAS_RECONEXAO})...`);
        tentativasReconexao.set(sessao, tentativas);
        setTimeout(() => conectar(sessao), delay);
      }
    } else if (connection === 'open') {
      socketsConectados.set(sessao, socketAtual);
      qrGenerated = false;
      tentativasReconexao.delete(sessao);
      console.log(`\n✅ WhatsApp ${sessao} conectado! Fezinha pronta!\n`);
      if (process.env.PROSPECCAO_AUTO_INICIAR_AO_CONECTAR === 'true' && !prospeccaoIniciada) {
        prospeccaoIniciada = true;
        executarProspeccao().catch(err => console.log(`Erro na prospecção: ${err.message}`)).finally(() => { prospeccaoIniciada = false; });
      }
    }
  });

  socketAtual.ev.on('creds.update', saveCreds);

  socketAtual.ev.on('messages.upsert', async (m) => {
    // 🛡️ Filtro de Números Ativos para a IA
    const ativos = process.env.BOT_NUMEROS_ATIVOS
      ? process.env.BOT_NUMEROS_ATIVOS.split(',').map(n => n.trim()).filter(Boolean)
      : [sessao.toString()];
    if (!ativos.includes(sessao.toString())) {
      logger.warn('Mensagem ignorada: sessao fora de BOT_NUMEROS_ATIVOS', {
        sessao,
        BOT_NUMEROS_ATIVOS: process.env.BOT_NUMEROS_ATIVOS || sessao.toString()
      });
      return; // A IA ignora silenciosamente se o número atual não estiver habilitado
    }

    const message = m.messages[0];

    if (!message.message) return;

    let sender = message.key.remoteJid;
    
    // DEBUG LID
    if (sender && sender.includes('@lid')) {
      const fs = require('fs');
      fs.writeFileSync('./logs/lid_debug.json', JSON.stringify(m, null, 2), {flag: 'a'});
    }
    const infoMidia = extrairMidia(message);
    const texto = message.message.conversation ||
                  message.message.extendedTextMessage?.text ||
                  infoMidia?.texto || '';
    const name = message.pushName || '';

    // 🛡️ Ignorar mensagens de protocolo/sistema vazias
    if (!texto && !infoMidia && !message.message.pollCreationMessage) {
      return;
    }

    // 🔗 RESOLUÇÃO DE LID (WhatsApp Business)
    if (sender && sender.includes('@lid')) {
      const stanzaId = message.message?.extendedTextMessage?.contextInfo?.stanzaId;
      
      // Tentativa 1: Via stanzaId (citação direta da prospecção)
      if (stanzaId && global.lidToPhoneMap && global.lidToPhoneMap.has(stanzaId)) {
        const realPhone = global.lidToPhoneMap.get(stanzaId);
        console.log(`🔗 LID ${sender} resolvido para ${realPhone} através do stanzaId.`);
        global.lidToPhoneMap.set(sender, realPhone);
        sender = realPhone;
      } 
      // Tentativa 2: Cache de sessões anteriores
      else if (global.lidToPhoneMap && global.lidToPhoneMap.has(sender)) {
        sender = global.lidToPhoneMap.get(sender);
      } 
      // Tentativa 3: Buscar no mapeamento interno do Baileys
      else if (socketAtual?.authState?.creds) {
        // O Baileys costuma gravar na credencial um cache de contatos LID -> PN
        // mas pode estar em diversos lugares dependendo da versão
        try {
          const creds = socketAtual.authState.creds;
          if (creds.lidMappings && Array.isArray(creds.lidMappings)) {
            const mapped = creds.lidMappings.find(m => m.lid === sender || m.lid === sender.replace('@lid', ''));
            if (mapped && mapped.pn) {
               console.log(`🔗 LID ${sender} resolvido para ${mapped.pn} através do creds.lidMappings do Baileys.`);
               const realPhone = mapped.pn.includes('@') ? mapped.pn : `${mapped.pn}@s.whatsapp.net`;
               if (global.lidToPhoneMap) global.lidToPhoneMap.set(sender, realPhone);
               sender = realPhone;
            }
          }
        } catch(e) { /* ignore */ }
      }
      
      if (sender.includes('@lid')) {
        console.log(`⚠️ Mensagem de LID recebida sem cotação e sem cache. Impossível mapear número: ${sender}`);
        // ÚLTIMO RECURSO: Tentar associar pelo nome (pushName) se houver prospecções recentes com esse nome
        if (name) {
          const fs = require('fs');
          if (fs.existsSync('./listas/prospeccao_resultados.jsonl')) {
             const historicoLines = fs.readFileSync('./listas/prospeccao_resultados.jsonl', 'utf8').split('\n');
             for (let line of historicoLines.reverse()) {
               if (!line.trim()) continue;
               try {
                 const data = JSON.parse(line);
                 // Verifica se o pushName atual é parecido com o nome prospectado (ou vice versa)
                 if (data.nome && (data.nome.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(data.nome.toLowerCase()))) {
                    console.log(`🔗 LID ${sender} resolvido heuristicamente para ${data.telefone} devido a similaridade de nome ("${name}" ≈ "${data.nome}").`);
                    const realPhone = `${data.telefone}@s.whatsapp.net`;
                    if (global.lidToPhoneMap) global.lidToPhoneMap.set(sender, realPhone);
                    sender = realPhone;
                    break;
                 }
               } catch(e){}
             }
          }
        }
      }
    }

    // 🛡️ Prevenção de loop da IA entre chips da própria rede
    const isInternalBot = ehJidNumeroConectado(sender);

    if (isInternalBot) {
      // É uma mensagem do warmup cruzado. Ignoramos para a IA, mas adicionamos no painel de conversas.
      adicionarMensagemInternaWarmup(sessao, sender, name, {
        id: message.key.id,
        text: texto || '[Mídia]',
        fromMe: message.key.fromMe,
        timestamp: (message.messageTimestamp || Math.floor(Date.now()/1000)) * 1000,
      });
      return; 
    }
    
    // Adiciona ao chatStore do painel
    chatStore.addMessage(sessao, sender, name, {
      id: message.key.id,
      text: texto || (infoMidia ? `[${infoMidia.tipo}]` : '[Sistema]'),
      fromMe: message.key.fromMe,
      timestamp: (message.messageTimestamp || Math.floor(Date.now()/1000)) * 1000,
      read: message.key.fromMe // assumindo lido se foi nós quem mandou
    });

    const chaveAtendimento = `${sessao}:${sender}`;

    if (message.key.fromMe) {
      const foiEnviadaPeloBot = mensagensEnviadasPeloBot.has(message.key.id) || enviosBotEmAndamento.has(sender);
      
      // Marcar no chatStore que foi enviada pelo bot se aplicável
      if (foiEnviadaPeloBot) {
        const chats = chatStore.chats.get(sessao);
        if (chats && chats.has(sender)) {
          const arr = chats.get(sender).messages;
          if (arr.length > 0) arr[arr.length - 1].isBot = true;
        }
      }

      if (!foiEnviadaPeloBot && sender && !sender.endsWith('@g.us')) {
        const chaveAtendimento = `${sessao}:${sender}`;
        atendimentosHumanos.add(chaveAtendimento);
        historicosPorContato.delete(chaveAtendimento);
        const pendente = retomadasPendentes.get(chaveAtendimento);
        if (pendente) clearTimeout(pendente.timer);
        retomadasPendentes.delete(chaveAtendimento);
        console.log(`🧑 Atendimento humano detectado para ${sender}. IA pausada neste contato.`);
      }
      return;
    }

    if (!texto.trim()) return;

    if (contatoEmOptOut(sender)) {
      console.log(`🚫 ${sender}: mensagem ignorada porque o contato esta em opt-out.`);
      return;
    }

    // 🔁 Anti-loop: auto-responders (bots do outro lado) repetem sempre o mesmo texto.
    // A partir da 3ª mensagem idêntica em 24h, paramos de responder para não entrar em ping-pong.
    const textoNormalizado = texto.trim().toLowerCase().replace(/\s+/g, ' ');
    const recebidosDoContato = mensagensRecebidasPorContato.get(chaveAtendimento) || new Map();
    const registroRepeticao = recebidosDoContato.get(textoNormalizado) || { contagem: 0, ultimaEm: 0 };
    if (Date.now() - registroRepeticao.ultimaEm > ANTI_LOOP_JANELA_MS) registroRepeticao.contagem = 0;
    registroRepeticao.contagem++;
    registroRepeticao.ultimaEm = Date.now();
    recebidosDoContato.set(textoNormalizado, registroRepeticao);
    if (recebidosDoContato.size > 20) {
      const maisAntiga = [...recebidosDoContato.entries()].sort((a, b) => a[1].ultimaEm - b[1].ultimaEm)[0];
      if (maisAntiga) recebidosDoContato.delete(maisAntiga[0]);
    }
    mensagensRecebidasPorContato.set(chaveAtendimento, recebidosDoContato);
    if (registroRepeticao.contagem >= ANTI_LOOP_LIMITE) {
      console.log(`🔁 ${sender}: mesma mensagem recebida ${registroRepeticao.contagem}x — provável resposta automática do outro lado. Não vou responder.`);
      return;
    }

    const classificacao = intentClassifier.classificarMensagem(texto);
    logger.debug('Classificacao da mensagem recebida', {
      sessao,
      sender,
      intent: classificacao.intent,
      action: classificacao.action,
      confidence: classificacao.confidence
    });

    if (classificacao.action === 'opt_out') {
      registrarOptOut(sender);
      metrics.registrarRiscoWhatsApp({
        sessao,
        evento: 'opt_out',
        severidade: 'warning',
        telefone: sender,
        detalhe: classificacao.intent
      });
      atendimentosHumanos.add(chaveAtendimento);
      historicosPorContato.delete(chaveAtendimento);
      const pendente = retomadasPendentes.get(chaveAtendimento);
      if (pendente) clearTimeout(pendente.timer);
      retomadasPendentes.delete(chaveAtendimento);
      chatStore.setRequiresAttention(sessao, sender, false);

      const respostaOptOut = classificacao.resposta || 'Entendi, obrigado por avisar. Sem problema, nao vou insistir por aqui.';
      await enviarComDigitando(socketAtual, sender, { text: respostaOptOut });
      chatStore.addMessage(sessao, sender, null, {
        id: 'optout_' + Date.now(),
        text: respostaOptOut,
        fromMe: true,
        timestamp: Date.now(),
        read: true,
        isBot: true
      });
      console.log(`🚫 ${sender}: opt-out registrado apos desinteresse.`);
      return;
    }

    if (classificacao.action === 'ignore') {
      console.log(`🔇 ${sender}: mensagem ignorada (${classificacao.intent || classificacao.reason}).`);
      return;
    }

    // 🛡️ Verificar pedido de Humano
    if (classificacao.action === 'human_handoff') {
      console.log(`🚨 Cliente ${sender} solicitou atendimento humano.`);
      atendimentosHumanos.add(chaveAtendimento);
      historicosPorContato.delete(chaveAtendimento);
      chatStore.setRequiresAttention(sessao, sender, true);
      await enviarComDigitando(socketAtual, sender, { text: "Certo, vou transferir você para um de nossos especialistas. Aguarde um momento por favor." });
      return;
    }

    if (classificacao.action === 'clarify') {
      const respostaEsclarecimento = classificacao.resposta;
      console.log(`❔ Esclarecimento acionado para ${sender}`);
      await enviarComDigitando(socketAtual, sender, { text: respostaEsclarecimento });

      chatStore.addMessage(sessao, sender, null, {
        id: 'clarify_' + Date.now(),
        text: respostaEsclarecimento,
        fromMe: true,
        timestamp: Date.now(),
        read: true,
        isBot: true
      });
      return;
    }

    // ⚡ Verificar Gatilhos Rápidos
    const respostaRapida = classificacao.action === 'quick_reply' ? classificacao.resposta : null;
    if (respostaRapida) {
      console.log(`⚡ Gatilho rápido acionado para ${sender}`);
      await enviarComDigitando(socketAtual, sender, { text: respostaRapida });
      
      // Registrar envio bot no chatStore
      chatStore.addMessage(sessao, sender, null, {
        id: 'gatilho_' + Date.now(),
        text: respostaRapida,
        fromMe: true,
        timestamp: Date.now(),
        read: true,
        isBot: true
      });
      return;
    }

    if (atendimentosHumanos.has(`${sessao}:${sender}`)) {
      const chaveAtendimento = `${sessao}:${sender}`;
      const anterior = retomadasPendentes.get(chaveAtendimento);
      if (anterior) clearTimeout(anterior.timer);
      const textoPendente = anterior?.texto ? `${anterior.texto}\n${texto}` : texto;

      const timer = setTimeout(async () => {
        const pendenteAtual = retomadasPendentes.get(chaveAtendimento);
        if (!pendenteAtual || pendenteAtual.timer !== timer) return;
        retomadasPendentes.delete(chaveAtendimento);
        atendimentosHumanos.delete(chaveAtendimento);
        chatStore.setRequiresAttention(sessao, sender, false);
        console.log(`🤖 Humano não respondeu ${sender} em 10 minutos. IA retomando o atendimento.`);
        try {
          const identidade = identidadeDaSessao(sessao);
          const resposta = await gerarResposta(pendenteAtual.texto, sender, null, identidade);
          await salvarLead(sender, pendenteAtual.texto, resposta);
          await enviarPeloBot(socketAtual, sender, { text: resposta }, sessao);
          console.log(`🤖 ${identidade.nome}: ${resposta}`);
        } catch (err) {
          console.log(`❌ Erro ao retomar ${sender}: ${err.message}`);
        }
      }, TEMPO_RETORNO_IA_MS);

      retomadasPendentes.set(chaveAtendimento, { timer, texto: textoPendente, _criadoEm: Date.now() });
      console.log(`⏸️ ${sender}: aguardando resposta humana por até 10 minutos.`);
      return;
    }

    console.log(`\n📱 ${sender}: ${infoMidia ? `[${infoMidia.tipo}] ` : ''}${texto}`);

    try {
      const midia = infoMidia ? await baixarMidia(message, infoMidia, socketAtual) : null;
      const identidade = identidadeDaSessao(sessao);

      // Verificar se há diagnóstico mencionado na mensagem
      let diagnosticoContexto = null;
      if (diagnosticoManager) {
        const diagnosticoId = diagnosticoManager.extrairDiagnosticoId(texto);
        if (diagnosticoId) {
          diagnosticoContexto = await diagnosticoManager.buscarDiagnostico(diagnosticoId);
          if (diagnosticoContexto) {
            console.log(`📋 Diagnóstico encontrado: ${diagnosticoId}`);
          }
        }
      }

      let textoReal = texto;
      let transcricaoRealizada = false;

      // Transcrição de áudio (se for áudio e tivermos midia + gemini)
      if (infoMidia?.tipo === 'audio' && midia && gemini) {
        console.log(`🎤 Transcrevendo áudio recebido de ${sender}...`);
        try {
          const transcricao = await transcreverAudioGemini(midia.buffer, midia.mimetype);
          if (transcricao) {
            textoReal = `[Áudio Transcrito do Cliente]: ${transcricao}`;
            transcricaoRealizada = true;
            console.log(`📝 Áudio transcrito: "${transcricao}"`);
            // Notificar ao usuário que entendemos seu áudio
            await enviarPeloBot(socketAtual, sender, { text: '✅ Recebi seu áudio! Deixa eu processar...' }, sessao);
          } else {
            console.log(`⚠️ Áudio não pôde ser transcrito.`);
            textoReal = "[Áudio recebido, mas não pôde ser transcrito]";
            await enviarPeloBot(socketAtual, sender, { text: '⚠️ Recebi seu áudio, mas não consegui transcrever. Pode tentar escrever em texto?' }, sessao);
          }
        } catch (e) {
          console.error(`❌ Erro na transcrição:`, e.message);
          textoReal = "[Erro ao transcrever áudio do cliente]";
          await enviarPeloBot(socketAtual, sender, { text: '❌ Tive um problema ao processar seu áudio. Pode tentar de novo?' }, sessao);
        }
      }

      const resposta = await gerarResposta(textoReal, sender, midia, identidade, 0, diagnosticoContexto);
      await salvarLead(sender, textoReal, resposta);

      // Rastrear resposta para campanha Tank (se aplicável)
      const telefoneLimpo = sender.split('@')[0];
      tank.registrarResposta(telefoneLimpo);

      if (infoMidia?.tipo === 'audio' && gemini) {
        try {
          const audio = await gerarAudio(resposta);
          await enviarPeloBot(socketAtual, sender, { audio, mimetype: 'audio/wav', ptt: true }, sessao);
        } catch (err) {
          console.log(`⚠️ Não foi possível gerar voz; enviando texto (${err.message})`);
          await enviarPeloBot(socketAtual, sender, { text: resposta }, sessao);
        }
      } else {
        await enviarPeloBot(socketAtual, sender, { text: resposta }, sessao);
      }
      console.log(`🤖 Fezinha: ${resposta}`);
      console.log(`✅ Resposta enviada!\n`);
    } catch (err) {
      console.log(`❌ Erro: ${err.message}`);
    }
  });
}

function iniciarLimpezaPeriodicaDeMemoria() {
  setInterval(() => {
    const agora = Date.now();
    let removidos = 0;

    // Limpar mensagens enviadas antigas (mais agressivo)
    if (mensagensEnviadasPeloBot.size > MAX_MENSAGENS_ENVIADAS) {
      const entriesToDelete = mensagensEnviadasPeloBot.size - MAX_MENSAGENS_ENVIADAS;
      let deleted = 0;
      for (const [key, value] of mensagensEnviadasPeloBot.entries()) {
        if (deleted >= entriesToDelete) break;
        mensagensEnviadasPeloBot.delete(key);
        deleted++;
        removidos++;
      }
    }

    // Limpar tentativas de reconexão antigas
    tentativasReconexao.forEach((valor, chave) => {
      if (agora - valor.proximaTentativaEm > 24 * 60 * 60 * 1000) { // 24 horas
        tentativasReconexao.delete(chave);
        removidos++;
      }
    });

    // Limpar registros anti-loop expirados
    mensagensRecebidasPorContato.forEach((textos, chave) => {
      textos.forEach((registro, textoChave) => {
        if (agora - registro.ultimaEm > ANTI_LOOP_JANELA_MS) {
          textos.delete(textoChave);
          removidos++;
        }
      });
      if (textos.size === 0) mensagensRecebidasPorContato.delete(chave);
    });

    if (removidos > 0) {
      logger.info(`🧹 Limpeza de memória: ${removidos} itens removidos. Memória: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
    }

    // Force garbage collection se disponível
    if (global.gc) {
      global.gc();
    }
  }, LIMPEZA_MEMORIA_MS);
}

function iniciarLimpezaPeriodicaDeHistorico() {
  setInterval(() => {
    const agora = Date.now();
    let removidosHistorico = 0;
    let removidosEtapas = 0;
    let removidosRetomadasPendentes = 0;

    // Limpeza agressiva se memória > 80%
    const uso = (healthCheck.status?.memoria?.porcentagem) || 0;
    const isAgresivo = uso > 80;
    const limiteMs = isAgresivo ? 3 * 60 * 1000 : LIMPEZA_HISTORICO_MS;

    historicosPorContato.forEach((valor, chave) => {
      if (valor._ultimoAcesso && agora - valor._ultimoAcesso > limiteMs) {
        historicosPorContato.delete(chave);
        removidosHistorico++;
      }
    });

    etapasPorContato.forEach((valor, chave) => {
      if (!historicosPorContato.has(chave)) {
        etapasPorContato.delete(chave);
        removidosEtapas++;
      }
    });

    const limiteRetomadas = isAgresivo ? 5 * 60 * 1000 : 30 * 60 * 1000;
    retomadasPendentes.forEach((valor, chave) => {
      if (valor._criadoEm && agora - valor._criadoEm > limiteRetomadas) {
        retomadasPendentes.delete(chave);
        removidosRetomadasPendentes++;
      }
    });

    // Limpar arquivo de leads_pendentes se muito grande (>5MB)
    try {
      const stats = fs.statSync('leads_pendentes.jsonl');
      if (stats.size > 5 * 1024 * 1024) {
        const linhas = fs.readFileSync('leads_pendentes.jsonl', 'utf8').split('\n');
        const novasLinhas = linhas.slice(-50).filter(l => l.trim()); // Manter últimas 50
        fs.writeFileSync('leads_pendentes.jsonl', novasLinhas.join('\n'), 'utf8');
        logger.debug(`leads_pendentes.jsonl: ${linhas.length} -> ${novasLinhas.length} linhas`);
      }
    } catch (err) {
      logger.debug(`Limpeza leads_pendentes: ${err.message}`);
    }

    if (removidosHistorico > 0 || removidosEtapas > 0 || removidosRetomadasPendentes > 0) {
      logger.debug(`Limpeza: ${removidosHistorico} históricos, ${removidosEtapas} etapas, ${removidosRetomadasPendentes} retomadas`);
    }
  }, 10 * 60 * 1000); // A cada 10 minutos
}

function iniciarHealthCheck() {
  let ultimoLog = 0;
  let ultimoStatus = null;
  setInterval(async () => {
    await healthCheck.obterStatusCompleto(socketsConectados);
    const agora = Date.now();
    const statusString = JSON.stringify(healthCheck.status);

    // Log apenas quando status muda e a cada 10 minutos
    if (agora - ultimoLog > 10 * 60 * 1000 || statusString !== ultimoStatus) {
      if (!healthCheck.ehSaudavel()) {
        logger.debug('Health check:', healthCheck.status);
      }
      ultimoStatus = statusString;
      ultimoLog = agora;
    }
  }, INTERVALO_HEALTH_CHECK_MS);
}

function iniciarBackupAutomatico() {
  // Usar scheduler de backup automático (2:00 AM diariamente)
  const horarioBackup = process.env.BACKUP_SCHEDULE_CRON || '0 2 * * *';
  backupScheduler.iniciar(horarioBackup);

  console.log('✅ Scheduler de backup automático iniciado');
}

function iniciarProspeccaoAgendada() {
  if (process.env.PROSPECCAO_AGENDA_ATIVA !== 'true' && !process.env.PROSPECCAO_CSV) {
    return;
  }

  // Executar a cada 30 segundos para verificar se precisa rodar próxima planilha
  const INTERVALO_VERIFICACAO = 30 * 1000; // 30 segundos
  let prospeccaoEmAndamento = false;

  setInterval(async () => {
    if (prospeccaoEmAndamento) return;
    if (socketsConectados.size === 0) return;

    prospeccaoEmAndamento = true;
    try {
      await executarProspeccaoAgendada();
    } catch (err) {
      console.error('❌ Erro na prospecção agendada:', err.message);
    } finally {
      prospeccaoEmAndamento = false;
    }
  }, INTERVALO_VERIFICACAO);

  console.log('✅ Prospecção agendada iniciada (verifica a cada 30 segundos)');
}

function iniciarManutencaoPeriodicaDeCache() {
  setInterval(() => {
    cache.limparExpirados();
    ratelimiter.limparExpirados();

    // Limpar atendimentos humanos muito antigos (não removidos)
    const agora = Date.now();
    let removidosAtendimentos = 0;
    atendimentosHumanos.forEach(chave => {
      // Se o contato não tem mais retomada pendente há 30 min, remover
      const retomada = retomadasPendentes.get(chave);
      if (!retomada || agora - retomada._criadoEm > 30 * 60 * 1000) {
        // Se não há retomada pendente ativa, remover do set
        if (!retomada) {
          atendimentosHumanos.delete(chave);
          removidosAtendimentos++;
        }
      }
    });

    // Forçar garbage collection se memória muito alta
    const used = process.memoryUsage();
    const percentual = Math.round((used.heapUsed / used.heapTotal) * 100);
    if (percentual > 80 && global.gc) {
      global.gc();
      logger.debug(`GC (${percentual}% mem)`);
    }

    if (removidosAtendimentos > 0) {
      logger.debug(`${removidosAtendimentos} atendimentos humanos limpos`);
    }
  }, 5 * 60 * 1000); // A cada 5 minutos
}

async function iniciar() {
  logger.info('Fezinha iniciando...');

  // Inicializar health check
  healthCheck = new HealthCheck(pool);

  // Iniciar sistema de treinamento
  const trainerService = new TrainerService(pool);
  const intervaloTreinamento = parseInt(process.env.TRAINING_INTERVAL_MIN || '120'); // 2 horas
  trainerService.iniciar(intervaloTreinamento);
  global.trainerService = trainerService; // Exportar para APIs

  // Iniciar sistema de scoring de leads
  const leadScorer = new LeadScorer();
  global.leadScorer = leadScorer;
  logger.info('🎯 LeadScorer inicializado');

  // Iniciar sistema de follow-up automático
  const followupScheduler = new FollowupScheduler(pool);
  global.followupScheduler = followupScheduler;
  logger.info('📞 FollowupScheduler inicializado');

  // Iniciar todos os serviços de manutenção
  // Frontend é servido por painel-simples.js na porta 3099
  iniciarLimpezaPeriodicaDeHistorico();
  iniciarLimpezaPeriodicaDeMemoria();
  iniciarHealthCheck();
  iniciarBackupAutomatico();
  monitorScheduler.iniciar(); // Monitor 24/7
  iniciarProspeccaoAgendada();
  iniciarManutencaoPeriodicaDeCache();

  // Tentar sincronizar leads que ficaram pendentes
  setTimeout(sincronizarLeadsPendentes, 5000);

  if (iaProvider === 'groq' && groq) {
    logger.info(`Groq ativo (${process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'})`);
  } else if (iaProvider === 'groq' && !groq) {
    logger.warn('Groq foi selecionado mas GROQ_API_KEY não está configurada. Usando Gemini como fallback');
  } else if (iaProvider === 'xai' && xai) {
    logger.info(`xAI ativo (${process.env.XAI_MODEL || 'grok-beta'})`);
  } else if (iaProvider === 'xai' && !xai) {
    logger.warn('xAI foi selecionado mas XAI_API_KEY não está configurada. Usando Gemini como fallback');
  } else if (gemini) {
    logger.info(`Gemini ativo (${process.env.GEMINI_MODEL || 'gemini-2.5-flash'})`);
  } else {
    logger.error('NENHUMA IA CONFIGURADA: adicione GROQ_API_KEY, GEMINI_API_KEY ou XAI_API_KEY ao arquivo .env');
  }

  if (groq && iaProvider !== 'groq') {
    logger.info(`Groq disponível como alternativa (defina IA_PROVIDER=groq para usar)`);
  }

  // Inicializar Tank com IA
  const iaAtiva = iaProvider === 'groq' ? groq : (iaProvider === 'xai' ? xai : gemini);
  if (iaAtiva) {
    const iaComType = { ...iaAtiva, type: iaProvider };
    tank = new MessageTank(iaComType);
    console.log(`💬 Tank de mensagens com geração por IA inicializado`);
  } else {
    tank = new MessageTank(null);
    console.log(`⚠️ Tank sem geração automática (IA não configurada)`);
  }

  // Inicializar tabela de diagnósticos
  if (diagnosticoManager) {
    await diagnosticoManager.inicializarTabela();
    console.log('📋 Sistema de diagnósticos inicializado');
  }

  await carregarBaseConhecimento();

  const followupManager = new FollowupManager(process.env.GEMINI_API_KEY, async (destinatario, texto, sessao) => {
    const socket = socketsConectados.get(sessao);
    if (!socket) throw new Error(`Socket da sessão ${sessao} não conectado`);
    
    await enviarPeloBot(socket, destinatario, { text: texto }, sessao);
    
    // Adicionar no chatStore para aparecer no painel
    chatStore.addMessage(sessao, destinatario, "Bot", {
      id: 'foll_' + Date.now(),
      text: texto,
      fromMe: true,
      timestamp: Date.now(),
      read: true,
      isBot: true
    });
  });
  
  const intervaloFollowupMin = Math.max(5, Number(process.env.FOLLOWUP_VERIFICACAO_MINUTOS) || 60);

  // Rodar a rotina de follow-up no intervalo configurado
  setInterval(() => {
    followupManager.analisarEEnviarFollowups();
  }, intervaloFollowupMin * 60 * 1000);
  
  // E rodar após 30 segundos da inicialização
  setTimeout(() => {
    followupManager.analisarEEnviarFollowups();
  }, 30 * 1000);

  console.log('');
  const quantidadeNumeros = Math.max(1, Math.min(10, Number(process.env.WHATSAPP_NUMEROS) || 1));
  for (let sessao = 1; sessao <= quantidadeNumeros; sessao++) {
    await conectar(sessao);
    if (sessao < quantidadeNumeros) {
      console.log(`⏳ Aguardando 5 segundos antes de conectar a próxima sessão...`);
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  const crossWarmupAtivo = process.env.CROSS_WARMUP_ATIVO !== 'false';
  const intervaloCrossWarmup = Math.max(10, Number(process.env.CROSS_WARMUP_INTERVALO_MIN) || 60);
  if (crossWarmupAtivo && quantidadeNumeros >= 2) {
    crossWarmupManager.iniciar(intervaloCrossWarmup);
    setTimeout(() => crossWarmupManager.executarSorteio(), 2 * 60 * 1000);
  } else {
    console.log('Warmup Cruzado inativo: configure pelo menos 2 numeros ou CROSS_WARMUP_ATIVO=true.');
  }

  // 🌐 Rotação temporal de proxy por chip: a cada N horas, cada sessão que
  // tenha um pool com 2+ IPs avança para o próximo e reconecta pelo novo IP.
  // Reconexão é escalonada (10s entre chips) para não derrubar todos de uma vez.
  const sessoesComPool = [];
  for (let sessao = 1; sessao <= quantidadeNumeros; sessao++) {
    if (proxyManager.temProxy(sessao)) sessoesComPool.push(sessao);
  }
  if (sessoesComPool.length) {
    const horas = proxyManager.horasRotacao();
    console.log(`🌐 Rotação de proxy ativa a cada ${horas}h para as sessões: ${sessoesComPool.join(', ')}`);
    setInterval(async () => {
      for (const sessao of sessoesComPool) {
        if (!proxyManager.rotacionar(sessao)) continue; // pool com 1 IP só: mantém fixo
        const info = proxyManager.obterAgentAtual(sessao);
        console.log(`🔄 Sessão ${sessao}: rotacionando para ${info ? proxyManager.mascarar(info.url) : '?'} e reconectando...`);
        try {
          const socket = socketsConectados.get(sessao);
          if (socket) {
            socket.end(new Error('Rotação de proxy')); // close handler reconecta com o novo IP
            socketsConectados.delete(sessao);
          } else {
            conectar(sessao); // não estava conectado: conecta já com o novo proxy
          }
        } catch (err) {
          console.log(`⚠️  Falha ao rotacionar sessão ${sessao}: ${err.message}`);
        }
        await new Promise(r => setTimeout(r, 10 * 1000));
      }
    }, horas * 60 * 60 * 1000);
  } else {
    console.log('🌐 Rotação de proxy inativa: nenhum PROXY_SESSAO_* configurado.');
  }

  // Inicializa a API e o Frontend Unificado
  require('./modules/webserver').startServer();
}

iniciar().catch(console.log);
