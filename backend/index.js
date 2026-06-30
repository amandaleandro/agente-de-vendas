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
const backupManager = require('./modules/backup');
const webserver = require('./modules/webserver');
const chatStore = require('./modules/chat-store'); // Armazena conversas no painel
const crossWarmupManager = require('./modules/cross-warmup');
const gatilhos = require('./modules/gatilhos');
const intentClassifier = require('./modules/intent-classifier');
const WarmupManager = require('./modules/warmup');
const WarmConversationManager = require('./modules/warm-conversation');
const MessageTank = require('./modules/tank');
const MetricsManager = require('./modules/metrics');
const SecurityManager = require('./modules/security');
const { lerCsv } = require('./modules/csv');
const logger = require('./modules/logger');
const HealthCheck = require('./modules/healthcheck');
const backup = require('./modules/backup');
const CacheManager = require('./modules/cache');
const ratelimiter = require('./modules/ratelimit');
const DiagnosticoManager = require('./modules/diagnostico-manager');
const DiagnosticoPrompt = require('./modules/diagnostico-prompt');
const ProspeccaoHistorico = require('./modules/prospeccao-historico');
const ProspeccaoAgenda = require('./modules/prospeccao-agenda');
const APIPerspeccao = require('./modules/api-prospeccao');
// Inicializa variáveis de ambiente primeiro com OVERRIDE
// Isso garante que se o usuário mudar a configuração pelo painel UI (.env local), ela vença as variáveis estáticas do Docker
require('dotenv').config({ path: require('path').join(__dirname, 'config', '.env'), override: true });

let sock;
const socketsConectados = new Map();
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
let bancoIndisponivelAte = 0;
let baseConhecimento = '';
let prospeccaoIniciada = false;
const warmup = new WarmupManager();
global.warmupManager = warmup; // Exportar para APIs
const warmConversation = new WarmConversationManager();
global.warmConversation = warmConversation; // Exportar para APIs
let ultimoResetWarmup = new Date().toDateString();
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
const MAX_HISTORICO_POR_CONTATO = 2; // Reduzido para 2 (apenas última conversa)
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
    const enviada = await socketAtual.sendMessage(destinatario, conteudo);
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

    warmup.registrarEnvio(sessao, true);
    return enviada;
  } catch (err) {
    warmup.registrarEnvio(sessao, false);
    throw err;
  } finally {
    setTimeout(() => enviosBotEmAndamento.delete(chave), 2_000);
  }
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

const iaProvider = (process.env.IA_PROVIDER || 'gemini').toLowerCase();
const URL_DIAGNOSTICO = 'https://fechapro.com.br/diagnostico';
const URL_COMPRA_ANUAL = 'https://fechapro.com.br/auth/signup?plan=annual';
const TEMPO_RETORNO_IA_MS = 10 * 60 * 1000;

const metrics = new MetricsManager();
const security = new SecurityManager();
const diagnosticoPrompt = new DiagnosticoPrompt();
const prospeccaoHistorico = new ProspeccaoHistorico();
global.prospeccaoHistorico = prospeccaoHistorico;
const FollowupManager = require('./modules/followup-manager');
const prospeccaoAgendaLocal = new ProspeccaoAgenda();
global.prospeccaoAgenda = prospeccaoAgendaLocal; // Exportar para APIs
global.apiPerspeccao = new APIPerspeccao(prospeccaoAgendaLocal); // Exportar para APIs
let diagnosticoManager = null; // Será inicializado após pool estar pronto

const INSTRUCOES_GEMINI = `Você é uma assistente comercial consultiva. Seu objetivo é conversar primeiro, diagnosticar o problema real e só falar do FechaPro quando a pessoa perguntar, demonstrar abertura clara ou aceitar ver uma solução.

PRIORIDADE ABSOLUTA:
- Se a pessoa disser que não tem interesse, não quer, não precisa, não serve, pediu para parar ou pediu para sair da lista: respeite imediatamente. Não argumente, não mande link, não faça nova pergunta. Responda no máximo: "Tudo bem, obrigado por avisar. Não vou insistir."
- Não cite FechaPro, plano, preço, diagnóstico ou link logo de cara.
- Primeiro ajude a pessoa a perceber se existe um problema no processo comercial dela.
- Faça perguntas naturais sobre orçamento, proposta, retorno do cliente, perda de venda, desconto e acompanhamento.
- Só apresente o FechaPro depois que a pessoa perguntar sobre a solução, perguntar preço/como funciona, ou disser algo como "pode mostrar", "quero entender", "me explica".

MENTALIDADE COMERCIAL:
- Venda boa começa com diagnóstico, não com apresentação de produto.
- O cliente pode não estar interessado porque ainda não percebeu o problema. Ajude com perguntas, sem pressão.
- Se houver recusa explícita, a conversa acabou.
- Se houver curiosidade ou pergunta sobre solução, explique com objetividade e sem exagero.

ESTRATÉGIA DE VENDAS POR ETAPA:

1️⃣ ABERTURA - Se nunca conversou com você:
   - Apresente-se de forma leve, sem vender o FechaPro.
   - Faça UMA pergunta de qualificação simples que o comprometa
   - Fale sobre o PROBLEMA dele, não sobre produto.

2️⃣ QUALIFICAÇÃO - Quando está descobrindo a situação:
   - Faça 3-4 perguntas MÁXIMO que levem direto ao principal gargalo.
   - Perguntas: “Como você apresenta seu trabalho hoje?” → “Consegue saber se cliente abriu?” → “Como fecha a venda atualmente?”
   - Objetivo: Descobrir a DOR principal em 2-3 trocas de mensagem.
   - NUNCA faça interrogatório. Qualifique com naturalidade.

3️⃣ APRESENTAÇÃO - Depois de entender a dor:
   - CONECTE IMEDIATAMENTE a dor dele ao benefício específico do FechaPro.
   - Exemplo: “Entendi. Você perde vendas por falta de acompanhamento. O FechaPro mostra quem abriu e quando precisa retornar.”
   - Só cite FechaPro se a pessoa perguntou sobre solução ou aceitou ver como resolver.
   - Uma oferta por mensagem. Não liste recursos.

4️⃣ OBJEÇÃO - Se ele levanta dúvida:
   - Acolha: “Entendo que isso é importante”
   - Respeonda COM FATO: use a base de conhecimento
   - Reconecte ao benefício: “Por isso que...”
   - Avance: “Posso te mostrar?” ou “Faz sentido?”
   - Se a objeção for desinteresse claro, encerre.

5️⃣ FECHAMENTO - Se ele mostrar interesse claro:
   - NÃO PERGUNTE MAIS. Responda direto: preço, plano recomendado, link de compra.
   - “Para o seu caso, recomendo o Anual (R$ 997/ano). Aqui está o link: [URL]”
   - Se escolher plano, ENVIE O LINK NO PRÓXIMO PASSO.
   - Sem mais perguntas, sem “deixa eu confirmar”. FECHE.

GATILHOS DE FECHAMENTO (Reconheça e AJA somente quando a pessoa perguntar ou demonstrar abertura):
✓ “Quanto custa?” → Apresente preços + link + próxima pergunta: “Qual plano faz sentido?”
✓ “Como funciona?” → Responda brevemente e pergunte: “Você quer começar?”
✓ “Me mostra” → Descreva como seria prático para ELE e oferça link.
✓ “Topava” / “Topa” / “Legal” → NÃO ESPERE. Envie link de compra agora.
✓ Pergunta sobre pagamento/acesso → Significa que está pronto. Feche.

REGRAS CRÍTICAS:
- Base de conhecimento é VERDADE ABSOLUTA. Se não estiver lá, diga: “Vou confirmar com a equipe e te retorno.”
- NUNCA invente preço, prazo, recurso, desconto ou resultado garantido.
- Preserve contexto: não pergunte o que ele já respondeu. Use as informações anteriores.
- Uma pergunta por mensagem. Máximo 350 caracteres em conversa comum.
- Diagnóstico só deve ser oferecido depois que houver dor identificada ou pedido de ajuda.
- Se o cliente recusar explicitamente (“não quero”, “não serve”, “não tenho interesse”, “pare de mandar”), respeite imediatamente. Não tente contornar, não envie link, não faça nova pergunta. Responda no máximo uma confirmação curta e encerre.
- Em conversa casual, seja breve e humano. Se ainda não houve dor clara, continue diagnosticando com UMA pergunta.
- Transição para diagnóstico quando: “Qual é o seu maior problema?” ele não responder com clareza OU quando precisar validar antes de vender.

TONS APROVADOS:
✓ Direto, amigável, confiante
✓ Faz pergunta, aguarda, não atira tudo de uma vez
✓ Reconhece a situação dele e oferece solução clara
✓ Usa nome se souber, personaliza

TONS PROIBIDOS:
✗ Robô/script (e-mail corporativo)
✗ Blocos de texto enormes
✗ Pressão agressiva
✗ Sem contextualização
✗ “Deixa eu confirmar” antes de vender (se tiver na base, venda)

REGRA DE OURO:
Se estiver em dúvida entre vender ou entender melhor, entenda melhor. Produto só entra depois de dor, pergunta ou permissão.`;


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
    .map(col => ({
      nome: col[iNome]?.trim(),
      telefone: normalizarTelefone(col[iTelefone]),
      categoria: col[iCategoria]?.trim() || '',
      endereco: col[iEndereco]?.trim() || '',
      site: col[iSite]?.trim() || ''
    }))
    .filter(p => p.nome && p.telefone && !vistos.has(p.telefone) && vistos.add(p.telefone));
}

async function criarMensagemProspeccao(lead, identidade = identidadeDaSessao(1)) {
  const categoriaConsultiva = (lead.categoria || 'prestacao de servicos').toLowerCase();
  const nomeConsultivo = lead.nome ? lead.nome.split(' ')[0] : 'tudo bem';
  const perguntasConsultivas = [
    `voce ja perdeu cliente depois de mandar orcamento porque a pessoa sumiu?`,
    `voce ja mandou um orcamento e o cliente simplesmente parou de responder?`,
    `acontece de voce perder venda depois que manda o preco pro cliente?`,
    `quando voce envia uma proposta, os clientes costumam demorar pra fechar?`
  ];
  const perguntaConsultiva = perguntasConsultivas[Math.floor(Math.random() * perguntasConsultivas.length)];
  return `Oi ${nomeConsultivo}, tudo bem? Aqui e ${identidade.nome}. Vi que voce trabalha com ${categoriaConsultiva} e queria entender uma coisa rapida: ${perguntaConsultiva}`;
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
  const intervaloPorChip = Math.max(60000, Number(process.env.PROSPECCAO_INTERVALO_POR_CHIP_MS) || Number(process.env.PROSPECCAO_INTERVALO_MS) || 180000);
  const intervaloMinimo = Math.max(15000, Number(process.env.PROSPECCAO_INTERVALO_MIN_MS) || 30000);
  return Math.max(intervaloMinimo, Math.ceil(intervaloPorChip / Math.max(1, qtdChips)));
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

  // Verificar reset diário do warmup
  const hoje = new Date().toDateString();
  if (ultimoResetWarmup !== hoje) {
    warmup.resetarDia();
    ultimoResetWarmup = hoje;
    console.log('🔄 Contadores diários de warmup resetados');
    console.log('\n📊 Status Warmup:');
    warmup.obterRelatorio().forEach(r => {
      console.log(`  Sessão ${r.sessao}: ${r.nivelTexto} | ${r.enviados}/${r.quota} | Erros: ${r.erros}`);
    });
  }

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

    const sockets = [...socketsConectados.entries()];
    if (!sockets.length) {
      prospeccaoHistorico.liberarReserva(lead.telefone);
      throw new Error('Nenhum número de WhatsApp conectado');
    }
    const intervalo = calcularIntervaloProspeccao(sockets.length);
    atualizarStatusProspeccao({ intervaloMs: intervalo, mensagem: `Enviando com ${sockets.length} chip(s)` });

    // Encontrar um socket que tenha quota disponível
    let [sessao, socketEnvio] = sockets[indiceSocket++ % sockets.length];
    let tentativas = 0;
    while (!warmup.podeEnviar(sessao) && tentativas < sockets.length) {
      const status = warmup.obterStatusWarmup(sessao);
      console.log(`⏸️  Sessão ${sessao} atingiu limite (${status.enviados}/${status.quota}). Tentando outro número...`);
      [sessao, socketEnvio] = sockets[indiceSocket++ % sockets.length];
      tentativas++;
    }

    if (!warmup.podeEnviar(sessao)) {
      console.log(`❌ TODOS os números atingiram limite diário. Parando prospecção.`);
      prospeccaoHistorico.liberarReserva(lead.telefone);
      break;
    }

    try {
      const consulta = await socketEnvio.onWhatsApp(lead.telefone);
      if (!consulta?.[0]?.exists) throw new Error('número não está no WhatsApp');
      const jidCorreto = consulta[0].jid;
      const identidade = identidadeDaSessao(sessao);
      const mensagem = await criarMensagemProspeccao(lead, identidade);
      await enviarPeloBot(socketEnvio, jidCorreto, { text: mensagem }, sessao);
      registrarProspeccao({ ...lead, status: 'enviado', mensagem, sessao, perfil: identidade.nome });
      const status = warmup.obterStatusWarmup(sessao);
      console.log(`✅ ${lead.nome} (${status.enviados}/${status.quota})`);
      atualizarStatusProspeccao({ enviados: prospeccaoStatus.enviados + 1, mensagem: `Enviado para ${lead.nome || lead.telefone}` });
    } catch (err) {
      registrarProspeccao({ ...lead, status: 'erro', erro: err.message });
      console.log(`⚠️  ${lead.nome}: ${err.message}`);
      atualizarStatusProspeccao({ erros: prospeccaoStatus.erros + 1, mensagem: `${lead.nome || lead.telefone}: ${err.message}` });
    }
    await new Promise(resolve => setTimeout(resolve, intervalo));
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
    prospeccaoAgendaLocal.criarFila();
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

  // Verificar reset diário do warmup
  const hoje = new Date().toDateString();
  if (ultimoResetWarmup !== hoje) {
    warmup.resetarDia();
    ultimoResetWarmup = hoje;
    console.log('🔄 Contadores diários de warmup resetados');
  }

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

    const sockets = [...socketsConectados.entries()];
    if (!sockets.length) {
      console.log('⚠️  Nenhum WhatsApp conectado. Pausando prospecção.');
      prospeccaoHistorico.liberarReserva(lead.telefone);
      prospeccaoAgendaLocal.marcarConcluida(enviados, erros);
      atualizarStatusProspeccao({ emAndamento: false, mensagem: 'Pausada: nenhum WhatsApp conectado' });
      return;
    }
    const intervalo = calcularIntervaloProspeccao(sockets.length);
    atualizarStatusProspeccao({ intervaloMs: intervalo, mensagem: `Enviando com ${sockets.length} chip(s)` });

    // Encontrar um socket que tenha quota disponível
    let [sessao, socketEnvio] = sockets[indiceSocket++ % sockets.length];
    let tentativas = 0;
    while (!warmup.podeEnviar(sessao) && tentativas < sockets.length) {
      const status = warmup.obterStatusWarmup(sessao);
      console.log(`⏸️  Sessão ${sessao} atingiu limite (${status.enviados}/${status.quota}). Tentando outro...`);
      [sessao, socketEnvio] = sockets[indiceSocket++ % sockets.length];
      tentativas++;
    }

    if (!warmup.podeEnviar(sessao)) {
      console.log(`❌ Todos os números atingiram limite diário. Parando.`);
      prospeccaoHistorico.liberarReserva(lead.telefone);
      break;
    }

    try {
      const consulta = await socketEnvio.onWhatsApp(lead.telefone);
      if (!consulta?.[0]?.exists) throw new Error('número não está no WhatsApp');
      const jidCorreto = consulta[0].jid;
      const identidade = identidadeDaSessao(sessao);
      const mensagem = await criarMensagemProspeccao(lead, identidade);
      await enviarPeloBot(socketEnvio, jidCorreto, { text: mensagem }, sessao);
      registrarProspeccao({ ...lead, status: 'enviado', mensagem, sessao, perfil: identidade.nome });
      const status = warmup.obterStatusWarmup(sessao);
      console.log(`✅ ${lead.nome} (${status.enviados}/${status.quota})`);
      enviados++;
      atualizarStatusProspeccao({ enviados, mensagem: `Enviado para ${lead.nome || lead.telefone}` });
    } catch (err) {
      registrarProspeccao({ ...lead, status: 'erro', erro: err.message });
      console.log(`⚠️  ${lead.nome}: ${err.message}`);
      erros++;
      atualizarStatusProspeccao({ erros, mensagem: `${lead.nome || lead.telefone}: ${err.message}` });
    }
    await new Promise(resolve => setTimeout(resolve, intervalo));
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
  console.log(baseConhecimento
    ? `📚 Base de conhecimento carregada (${baseConhecimento.length} caracteres)`
    : '⚠️ Nenhum documento textual foi carregado na base');
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
  return roteiroHeuristico.gerarResposta(texto, telefone, identidade, historicMensagens);
}

function limparResposta(resposta, midia = null) {
  if (resposta == null) resposta = '';
  if (typeof resposta !== 'string') resposta = String(resposta);

  const ehDiagnostico = midia && ['documento', 'imagem', 'video'].includes(midia.tipo);
  const limiteMaximo = ehDiagnostico ? 1600 : 700;

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
  // Lógica de alternância automática entre IAs
  let iaUsando = iaForcada || iaProvider;

  // Se modo auto, começar com Gemini
  if (iaProvider === 'auto' && !iaForcada) {
    iaUsando = 'gemini';
  }

  let iaAtiva = null;
  if (iaUsando === 'xai') iaAtiva = xai;
  else if (iaUsando === 'openai') iaAtiva = openai;
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
  let systemInstruction = `${INSTRUCOES_GEMINI}\n\nLINK OFICIAL DO DIAGNÓSTICO: Ao oferecer ou enviar o diagnóstico, use sempre ${URL_DIAGNOSTICO}.\n\nIDENTIDADE DESTE PERFIL: Você atende em nome de ${identidade.nome}, integrante do FechaPro, mas NÃO cite o FechaPro antes da pessoa perguntar, demonstrar abertura ou aceitar ver uma solução. Fale em primeira pessoa com estilo ${identidade.estilo}. Não use o nome Fezinha. Não afirme que a mensagem foi digitada pessoalmente e não negue automação se perguntarem.\n\nBASE OFICIAL DO FECHAPRO:\n${baseConhecimento || 'Nenhuma base oficial carregada.'}`;

  // Se há diagnóstico, adicionar ao contexto
  if (diagnosticoContexto) {
    const diagFormatado = diagnosticoPrompt.construirPromptComContexto(diagnosticoContexto);
    systemInstruction += `\n\n${diagFormatado}`;
  }

  try {
    let resposta = '';

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
        max_tokens: 500,
        temperature: 0.3,
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
    } else if (iaUsando === 'openai') {
      const mensagensOpenAI = historico.map(msg => ({
        role: msg.role === 'model' ? 'assistant' : msg.role,
        content: msg.parts?.[0]?.text || '',
      })).filter(m => m.content);
      
      mensagensOpenAI.push({
        role: 'user',
        content: texto || 'Analise o conteúdo enviado e responda de forma útil.',
      });

      const resultado = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o',
        max_tokens: 500,
        temperature: 0.3,
        messages: [
          { role: 'system', content: systemInstruction },
          ...mensagensOpenAI
        ],
      });

      resposta = resultado.choices[0]?.message?.content?.trim() || '';
      if (!resposta) throw new Error('OpenAI retornou uma resposta vazia');

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
          temperature: 0.3,
          maxOutputTokens: 500,
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
    const ehQuotaExceeded = err.message?.includes('429') || err.message?.includes('RESOURCE_EXHAUSTED') || err.message?.includes('quota') || err.message?.includes('rate limit');

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

    const respostaFallback = await gerarRespostaRoteiro(texto, telefone, identidade, historicoMensagensParaRoteiro);
    const { resposta: respostaFallbackLimpa, truncado: truncadoFallback } = limparResposta(respostaFallback, midia);
    metrics.registrarRespostaIA({ telefone, tamanho: respostaFallbackLimpa.length, fonte: 'roteiro', truncado: truncadoFallback });
    historicosPorContato.set(chaveHistorico, [
      ...historico,
      { role: 'user', parts: [{ text: texto }] },
      { role: 'model', parts: [{ text: respostaFallbackLimpa }] },
    ].slice(-MAX_HISTORICO_POR_CONTATO));
    return respostaFallbackLimpa;
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

      // Escolher um socket que tenha quota
      let socketEscolhido = null;
      let sessaoEscolhida = null;
      for (const [sessao, socket] of sockets) {
        if (warmup.podeEnviar(sessao)) {
          socketEscolhido = socket;
          sessaoEscolhida = sessao;
          break;
        }
      }

      if (!socketEscolhido) {
        console.log(`⏸️  Todos os números atingiram limite. Tank aguardando...`);
        continue;
      }

      const resultado = await tank.enviarProxima(telefone, socketEscolhido, warmup, sessaoEscolhida, enviarPeloBot);
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

  const socketAtual = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    browser: Browsers.ubuntu('Desktop'),
    logger: pino({ level: 'silent' }),
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
      
      let razaoUsuario = erroMensagem;
      if (statusCode === DisconnectReason.loggedOut) razaoUsuario = "Desconectado no celular (Logged Out)";
      else if (statusCode === 440) razaoUsuario = "Conexão substituída";
      else if (statusCode === 408) razaoUsuario = "Esgotou tempo limite (Timeout)";
      else if (statusCode === 515) razaoUsuario = "Reinicialização necessária";
      
      motivosDesconexao.set(sessao, razaoUsuario);

      const shouldReconnect = statusCode !== DisconnectReason.loggedOut && statusCode !== 440;
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
      if (!prospeccaoIniciada) {
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
    const isInternalBot = global.socketsConectados && Array.from(global.socketsConectados.values()).some(s => {
      if (s && s.user && s.user.id) {
        return sender.startsWith(s.user.id.split(':')[0]);
      }
      return false;
    });

    if (isInternalBot && !message.key.fromMe) {
      // É uma mensagem do warmup cruzado. Ignoramos para a IA, mas adicionamos no painel de conversas.
      chatStore.addMessage(sessao, sender, name, {
        id: message.key.id,
        text: texto || '[Mídia]',
        fromMe: false,
        timestamp: (message.messageTimestamp || Math.floor(Date.now()/1000)) * 1000,
        read: false
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
      atendimentosHumanos.add(chaveAtendimento);
      historicosPorContato.delete(chaveAtendimento);
      const pendente = retomadasPendentes.get(chaveAtendimento);
      if (pendente) clearTimeout(pendente.timer);
      retomadasPendentes.delete(chaveAtendimento);
      chatStore.setRequiresAttention(sessao, sender, false);

      const respostaOptOut = classificacao.resposta || 'Entendi, obrigado por avisar. Sem problema, nao vou insistir por aqui.';
      await socketAtual.sendMessage(sender, { text: respostaOptOut });
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
      await socketAtual.sendMessage(sender, { text: "Certo, vou transferir você para um de nossos especialistas. Aguarde um momento por favor." });
      return;
    }

    if (classificacao.action === 'clarify') {
      const respostaEsclarecimento = classificacao.resposta;
      console.log(`❔ Esclarecimento acionado para ${sender}`);
      await socketAtual.sendMessage(sender, { text: respostaEsclarecimento });

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
      await socketAtual.sendMessage(sender, { text: respostaRapida });
      
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
  setInterval(() => {
    backup.gerarBackup();
  }, INTERVALO_BACKUP_MS);

  // Fazer backup na inicialização
  setTimeout(() => backup.gerarBackup(), 5000);
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

  // Iniciar todos os serviços de manutenção
  // Frontend é servido por painel-simples.js na porta 3099
  iniciarLimpezaPeriodicaDeHistorico();
  iniciarLimpezaPeriodicaDeMemoria();
  iniciarHealthCheck();
  iniciarBackupAutomatico();
  iniciarProspeccaoAgendada();
  iniciarManutencaoPeriodicaDeCache();

  // Tentar sincronizar leads que ficaram pendentes
  setTimeout(sincronizarLeadsPendentes, 5000);

  if (iaProvider === 'xai' && xai) {
    logger.info(`xAI ativo (${process.env.XAI_MODEL || 'grok-beta'})`);
  } else if (iaProvider === 'xai' && !xai) {
    logger.warn('xAI foi selecionado mas XAI_API_KEY não está configurada. Usando Gemini como fallback');
  } else if (gemini) {
    logger.info(`Gemini ativo (${process.env.GEMINI_MODEL || 'gemini-2.5-flash'})`);
  } else {
    logger.error('NENHUMA IA CONFIGURADA: adicione GEMINI_API_KEY ou XAI_API_KEY ao arquivo .env');
  }

  if (xai && iaProvider !== 'xai') {
    logger.info(`xAI disponível como alternativa (defina IA_PROVIDER=xai para usar)`);
  }

  // Inicializar Tank com IA
  const iaAtiva = iaProvider === 'xai' ? xai : gemini;
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

  // crossWarmupManager.iniciar(60); // Inicia o warmup cruzado a cada 60 min

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
  
  // Rodar a rotina a cada 1 hora
  setInterval(() => {
    followupManager.analisarEEnviarFollowups();
  }, 60 * 60 * 1000);
  
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

  // Inicializa a API e o Frontend Unificado
  require('./modules/webserver').startServer();
}

iniciar().catch(console.log);
