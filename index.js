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
const WarmupManager = require('./warmup');
const MessageTank = require('./tank');
const MetricsManager = require('./metrics');
const SecurityManager = require('./security');
const { lerCsv } = require('./csv');
const logger = require('./logger');
const HealthCheck = require('./healthcheck');
const backup = require('./backup');
const CacheManager = require('./cache');
const ratelimiter = require('./ratelimit');
const DiagnosticoManager = require('./diagnostico-manager');
const DiagnosticoPrompt = require('./diagnostico-prompt');
require('dotenv').config();

let sock;
const socketsConectados = new Map();
const qrPorSessao = new Map();
let qrGenerated = false;

// Exportar para global para que server-api.js possa acessar
global.socketsConectados = socketsConectados;
global.qrPorSessao = qrPorSessao;
const etapasPorContato = new Map();
const historicosPorContato = new Map();
const atendimentosHumanos = new Set();
const retomadasPendentes = new Map();
const enviosBotEmAndamento = new Set();
const mensagensEnviadasPeloBot = new Map();
let bancoIndisponivelAte = 0;
let baseConhecimento = '';
let prospeccaoIniciada = false;
const warmup = new WarmupManager();
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

async function enviarPeloBot(socketAtual, destinatario, conteudo, sessao = 1) {
  const chave = `${destinatario}`;
  enviosBotEmAndamento.add(chave);
  try {
    const enviada = await socketAtual.sendMessage(destinatario, conteudo);
    const id = enviada?.key?.id;
    if (id) {
      mensagensEnviadasPeloBot.set(id, Date.now());
      setTimeout(() => mensagensEnviadasPeloBot.delete(id), 60_000);
    }
    warmup.registrarEnvio(sessao, true);
    return enviada;
  } catch (err) {
    warmup.registrarEnvio(sessao, false);
    throw err;
  } finally {
    setTimeout(() => enviosBotEmAndamento.delete(chave), 2_000);
  }
}

const gemini = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

const xai = process.env.XAI_API_KEY
  ? new OpenAI({ apiKey: process.env.XAI_API_KEY, baseURL: 'https://api.x.ai/v1' })
  : null;

const iaProvider = (process.env.IA_PROVIDER || 'gemini').toLowerCase();
const URL_DIAGNOSTICO = 'https://fechapro.com.br/diagnostico';
const URL_COMPRA_ANUAL = 'https://fechapro.com.br/auth/signup?plan=annual';
const TEMPO_RETORNO_IA_MS = 10 * 60 * 1000;

const metrics = new MetricsManager();
const security = new SecurityManager();
const diagnosticoPrompt = new DiagnosticoPrompt();
let diagnosticoManager = null; // Será inicializado após pool estar pronto

const INSTRUCOES_GEMINI = `Você é Fezinha, assistente comercial do FechaPro. Seu objetivo é UMA COISA: fechar vendas com naturalidade.

MENTALIDADE COMERCIAL:
- Cada interação é uma chance de avançar a venda ou perder o cliente.
- Não existe “apenas informação”: toda resposta deve aproximar do fechamento.
- Sinais de compra (dúvida sobre preço, plano, como começar) = RESPONDA E VENDA IMEDIATAMENTE.
- Objeções NÃO encerram conversas. Você resolve e continua vendendo.
- O cliente chegou até você = ele tem interesse. Sua missão é ativar esse interesse.

ESTRATÉGIA DE VENDAS POR ETAPA:

1️⃣ ABERTURA - Se nunca conversou com você:
   - Apresente em UMA frase quem é e o que resolve (ex: “Ajudo prestadores de serviço a organizar propostas e fechar mais vendas”)
   - Faça UMA pergunta de qualificação simples que o comprometa
   - NÃO fale sobre FechaPro. Fale sobre o PROBLEMA dele.

2️⃣ QUALIFICAÇÃO - Quando está descobrindo a situação:
   - Faça 3-4 perguntas MÁXIMO que levem direto ao principal gargalo.
   - Perguntas: “Como você apresenta seu trabalho hoje?” → “Consegue saber se cliente abriu?” → “Como fecha a venda atualmente?”
   - Objetivo: Descobrir a DOR principal em 2-3 trocas de mensagem.
   - NUNCA faça interrogatório. Qualifique com naturalidade.

3️⃣ APRESENTAÇÃO - Depois de entender a dor:
   - CONECTE IMEDIATAMENTE a dor dele ao benefício específico do FechaPro.
   - Exemplo: “Entendi. Você perde vendas por falta de acompanhamento. O FechaPro mostra quem abriu e quando precisa retornar.”
   - Ofereça o diagnóstico para validar ou convide para ver como funciona.
   - Uma oferta por mensagem. Não liste recursos.

4️⃣ OBJEÇÃO - Se ele levanta dúvida:
   - Acolha: “Entendo que isso é importante”
   - Respeonda COM FATO: use a base de conhecimento
   - Reconecte ao benefício: “Por isso que...”
   - Avance: “Posso te mostrar?” ou “Faz sentido?”
   - NUNCA fique em objeção. Resolva e siga.

5️⃣ FECHAMENTO - Se ele mostrar interesse claro:
   - NÃO PERGUNTE MAIS. Responda direto: preço, plano recomendado, link de compra.
   - “Para o seu caso, recomendo o Anual (R$ 997/ano). Aqui está o link: [URL]”
   - Se escolher plano, ENVIE O LINK NO PRÓXIMO PASSO.
   - Sem mais perguntas, sem “deixa eu confirmar”. FECHE.

GATILHOS DE FECHAMENTO (Reconheça e AJA):
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
- Diagnóstico é sua arma quando falta contexto: “Vamos fazer um diagnóstico rápido para eu entender melhor? ${URL_DIAGNOSTICO}”
- Se o cliente recusar explicitamente (“não quero”, “não serve”, “não tenho interesse”), respeite. Mas desafie 1-2x antes com uma objeção respondida.
- Em conversa casual, seja breve e humano. Mas se houver mínimo interesse, NUNCA encerre sem oferecer um próximo passo.
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
Sempre que está em dúvida se deve fazer nova pergunta ou oferecer/vender: VENDA. Se errar, o cliente avisa. Nunca deixe oportunidade em aberto.`;


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
  const iaAtiva = iaProvider === 'xai' ? xai : gemini;

  // ==================== FALLBACK PARA ROTEIRO ====================
  const fallbackRoteiro = () => {
    const categoria = (lead.categoria || 'serviços profissionais').toLowerCase();
    const nomeEmpresa = lead.nome || 'essa empresa';

    const mensagensRoteiro = [
      `Oi! Tudo bem? Aqui é ${identidade.nome}, do FechaPro. 👋 Vi que você trabalha com ${categoria} e achei que poderíamos ajudar a tornar seus orçamentos mais profissionais e rápidos. Como você envia propostas hoje?`,
      `Oi ${nomeEmpresa}! Aqui é ${identidade.nome} do FechaPro. 🚀 Você já recebeu feedback de cliente que desapareceu após mandar orçamento? A gente ajuda a criar propostas que FECHAM. Quer conhecer?`,
      `Oi! Tudo bem? Sou ${identidade.nome}, do FechaPro. Trabalho com empresas como a sua pra aumentar o fechamento de vendas. Você manda muitos orçamentos por semana?`,
      `Oi ${nomeEmpresa}! Aqui é ${identidade.nome}. 👋 Estou entrando em contato porque a maioria que trabalha com ${categoria} enfrenta o mesmo problema: cliente some após a proposta. Temos a solução! Quer conversar?`,
      `Oi! Sou ${identidade.nome}, do FechaPro. 💼 Notei que você é ${lead.categoria || 'prestador de serviços'}. Estou ajudando empresas do seu segmento a triplicar a taxa de fechamento. Te interessa?`,
    ];

    return mensagensRoteiro[Math.floor(Math.random() * mensagensRoteiro.length)];
  };

  if (!iaAtiva) return fallbackRoteiro();

  const prompt = `Crie uma primeira mensagem de prospecção para WhatsApp em nome de ${identidade.nome}, com estilo ${identidade.estilo}. Dados reais: empresa=${lead.nome}; categoria=${lead.categoria || 'não informada'}; endereço=${lead.endereco || 'não informado'}; site=${lead.site || 'não informado'}. Apresente ${identidade.nome} como pessoa do FechaPro, sem afirmar que digitou pessoalmente nem negar automação. Personalize sem inventar. Termine com uma pergunta e permita recusar mensagens. Português do Brasil, humano, sem lista, até 320 caracteres.`;

  let mensagem = '';

  try {
    if (iaProvider === 'xai') {
      const resultado = await xai.messages.create({
        model: process.env.XAI_MODEL || 'grok-beta',
        max_tokens: 180,
        temperature: 0.8,
        messages: [{ role: 'user', content: prompt }],
      });
      mensagem = resultado.content[0]?.text?.trim() || '';
    } else {
      const resultado = await gemini.models.generateContent({
        model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { temperature: 0.8, maxOutputTokens: 180, thinkingConfig: { thinkingBudget: 0 } },
      });
      mensagem = resultado.text?.trim() || '';
    }

    if (!mensagem) throw new Error('IA retornou resposta vazia');
    return mensagem.slice(0, 500);
  } catch (err) {
    console.log(`⚠️  IA falhou em criarMensagemProspeccao: ${err.message}. Usando roteiro...`);
    return fallbackRoteiro();
  }
}

function registrarProspeccao(registro) {
  fs.appendFileSync('prospeccao_resultados.jsonl', `${JSON.stringify({ ...registro, data: new Date().toISOString() })}\n`, 'utf8');
}

async function executarProspeccao() {
  const arquivo = process.env.PROSPECCAO_CSV;
  if (!arquivo) return;
  const leads = carregarProspectos(path.resolve(arquivo));
  console.log(`\nProspecção: ${leads.length} contatos válidos encontrados em ${arquivo}`);
  console.log('Prévia:', leads.slice(0, 3).map(({ nome, telefone, categoria }) => ({ nome, telefone, categoria })));
  if (process.env.PROSPECCAO_ATIVA !== 'true') { console.log('Prospecção em modo de prévia. Defina PROSPECCAO_ATIVA=true para enviar.\n'); return; }

  // NOVO: Carregar histórico de envios anteriores para evitar duplicatas
  const contatosJaEnviados = new Set();
  const arquivoResultados = 'prospeccao_resultados.jsonl';
  if (fs.existsSync(arquivoResultados)) {
    try {
      const linhas = fs.readFileSync(arquivoResultados, 'utf8').split('\n').filter(l => l.trim());
      linhas.forEach(linha => {
        const resultado = JSON.parse(linha);
        if (resultado.telefone) {
          contatosJaEnviados.add(resultado.telefone);
        }
      });
      console.log(`✅ Carregado histórico: ${contatosJaEnviados.size} contatos já prospectados`);
    } catch (err) {
      console.log('⚠️  Erro ao carregar histórico:', err.message);
    }
  }

  // Filtrar leads que já foram enviados
  const leadsNovos = leads.filter(lead => !contatosJaEnviados.has(lead.telefone));
  console.log(`📞 Enviando apenas para ${leadsNovos.length} contatos novos (${contatosJaEnviados.size} já foram prospectados)\n`);

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

  const intervalo = Math.max(180000, Number(process.env.PROSPECCAO_INTERVALO_MS) || 180000);
  let indiceSocket = 0;
  for (const lead of leadsNovos) {
    const sockets = [...socketsConectados.entries()];
    if (!sockets.length) throw new Error('Nenhum número de WhatsApp conectado');

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
      break;
    }

    try {
      const consulta = await socketEnvio.onWhatsApp(lead.telefone);
      if (!consulta?.[0]?.exists) throw new Error('número não está no WhatsApp');
      const identidade = identidadeDaSessao(sessao);
      const mensagem = await criarMensagemProspeccao(lead, identidade);
      await enviarPeloBot(socketEnvio, `${lead.telefone}@s.whatsapp.net`, { text: mensagem }, sessao);
      registrarProspeccao({ ...lead, status: 'enviado', mensagem, sessao, perfil: identidade.nome });
      const status = warmup.obterStatusWarmup(sessao);
      console.log(`✅ ${lead.nome} (${status.enviados}/${status.quota})`);
    } catch (err) {
      registrarProspeccao({ ...lead, status: 'erro', erro: err.message });
      console.log(`⚠️  ${lead.nome}: ${err.message}`);
    }
    await new Promise(resolve => setTimeout(resolve, intervalo));
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
function gerarRespostaRoteiro(texto, telefone, identidade = identidadeDaSessao(1)) {
  const t = texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const apenasSaudacao = /^(oi+|ola|bom dia|boa tarde|boa noite)[!.? ]*$/.test(t.trim());

  if (etapasPorContato.get(telefone) === 'aguardando_mensagem' && /^(sim|quero|pode|claro|manda|por favor)[!.? ]*$/.test(t.trim())) {
    etapasPorContato.delete(telefone);
    return "Claro! Você pode enviar:\n\n‘Oi! Vi que você trabalha com prestação de serviços. Você já perdeu algum cliente depois de mandar um orçamento? O FechaPro ajuda a criar propostas profissionais e acompanhar o fechamento de forma simples. Posso te mostrar como funciona?’";
  }

  if (apenasSaudacao) {
    return `Oi, tudo bem? Aqui é ${identidade.nome}, do FechaPro 🚀 Qual tipo de serviço você oferece?`;
  }

  // ==================== OBJEÇÕES - DESINTERESSE ====================
  if (['nao tenho interesse', 'nao quero', 'nao me interessa', 'nao agora', 'sem tempo', 'ocupado'].some(w => t.includes(w))) {
    return `Tranquilo, respeito sua agenda! 😊 Só deixa eu avisar: o FechaPro já ajudou centenas a fechar 3x mais vendas com menos trabalho. Quando tiver 2 minutos, vê este diagnóstico rápido: ${URL_DIAGNOSTICO}\n\nE se mudar de ideia, é só chamar!`;
  }

  // ==================== OBJEÇÕES - JÁ TEM SOLUÇÃO ====================
  if (['ja tenho', 'ja uso', 'uso outro', 'tenho outro', 'sistema similar'].some(w => t.includes(w))) {
    return `Ótimo que já tem algo! Mas a maioria que muda pro FechaPro fala que é bem mais simples. Quer fazer uma comparação rápida? Leva 2 min: ${URL_DIAGNOSTICO}\n\nSem compromisso, só pra você conhecer as diferenças.`;
  }

  // ==================== OBJEÇÕES - MUITO CARO ====================
  if (['caro', 'muito caro', 'nao posso pagar', 'nao tenho grana', 'sem dinheiro', 'preco alto'].some(w => t.includes(w))) {
    return `Entendo! A maioria começa com o plano mensal (R$ 97/mês) que já traz retorno rápido. Com 5-10 propostas profissionais, você já recupera o valor. Quer fazer um teste primeiro? ${URL_DIAGNOSTICO}`;
  }

  // ==================== OBJEÇÕES - PRECISA PENSAR ====================
  if (['preciso pensar', 'vou pensar', 'devo pensar', 'vou analisar', 'depois eu vejo', 'agora nao posso'].some(w => t.includes(w))) {
    return `Claro! Isso é importante mesmo. Enquanto pensa, deixa eu te enviar um diagnóstico rápido pra você analisar com calma: ${URL_DIAGNOSTICO}\n\nDaí quando decidir, a gente conversa. Combinado?`;
  }

  // ==================== OBJEÇÕES - NÃO PRECISA ====================
  if (['nao preciso', 'nao necessito', 'ta bom assim', 'nao tenho problema'].some(w => t.includes(w))) {
    return `Entendo! Mas deixa eu te mostrar uma coisa... você manda em média quantos orçamentos por semana que desaparecem? Ou clientes que pedem desconto? O FechaPro resolve exatamente isso: ${URL_DIAGNOSTICO}`;
  }

  // ==================== TESTES - BOT VS HUMANO ====================
  if (['voce e bot', 'voce e automatico', 'voce e robo', 'e um robo', 'atendimento automatico'].some(w => t.includes(w))) {
    return `Que pergunta interessante! 🤖 Sou um assistente inteligente aqui do FechaPro. O que importa é que estou aqui pra ajudar você a vender mais e ganhar tempo. Posso fazer isso?`;
  }

  // ==================== OFF-TOPIC - NEGATIVIDADE ====================
  if (['voce e burro', 'voce e idiota', 'que resposta ruim', 'que m', 'p#@!', 'isso nao funciona'].some(w => t.includes(w))) {
    return `Desculpa se algo não ficou claro! Às vezes é difícil entender tudo por mensagem. Posso tentar melhor? Qual sua principal dificuldade em fechar vendas hoje?`;
  }

  // ==================== OFF-TOPIC - PERGUNTAS ALEATÓRIAS ====================
  if (['qual e a previsao', 'que horas sao', 'qual e seu nome', 'como voce', 'quem sao voces', 'de onde voces'].some(w => t.includes(w))) {
    return `Ótima pergunta! 😄 Mas deixa eu ser honesto: o meu foco é ajudar você a vender mais com o FechaPro. E é nisso que sou bom! Qual seu maior desafio pra fechar uma venda hoje?`;
  }

  if (['fechapro', 'fecha pro'].some(w => t.includes(w))) {
    // Respostas específicas para perguntas sobre o FechaPro
    if (['como funciona', 'como usar', 'como comecar', 'serve para qu', 'pra qu', 'para quem'].some(w => t.includes(w))) {
      return `Para que eu recomende a forma certa de usar o FechaPro pro seu tipo de negócio, vamos começar com um diagnóstico rápido? É só 2 min:\n\n${URL_DIAGNOSTICO}\n\nDaí eu vejo exatamente o que você pode ganhar.`;
    }
    if (['duvida', 'nao entendo', 'confuso', 'confusa'].some(w => t.includes(w))) {
      return `Deixa eu simplificar. O FechaPro ajuda prestadores de serviço a: ✓ Criar orçamentos profissionais ✓ Aceitar online ✓ Receber pagamento.\n\nQuer ver na prática? ${URL_DIAGNOSTICO}`;
    }
    if (['valor', 'custa', 'quanto custa', 'caro'].some(w => t.includes(w))) {
      return "Temos opções acessíveis: mensal R$ 97, anual R$ 997 ou vitalício R$ 1.397. Qual modelo faz mais sentido pro seu faturamento? Ou prefere ver primeiro no diagnóstico: " + URL_DIAGNOSTICO;
    }
    if (['nao sei', 'sou novo', 'primeiro'].some(w => t.includes(w))) {
      return `Tranquilo, a gente começa do zero. Primeiro você responde algumas coisas sobre sua empresa, e eu mostro exatamente o que pode melhorar:\n\n${URL_DIAGNOSTICO}`;
    }
    // Resposta padrão quando menciona FechaPro mas sem contexto específico
    return "Que legal! O FechaPro é uma solução completa pra criar propostas profissionais e fechar mais vendas. Qual sua principal dúvida sobre ele? Ou posso te mostrar um diagnóstico rápido: " + URL_DIAGNOSTICO;
  }

  // ==================== RECONHECIMENTO DE OPORTUNIDADE ====================
  if (['vendi', 'fiz uma venda', 'fechei', 'consegui um', 'conquistei'].some(w => t.includes(w))) {
    return `Parabéns! 🎉 Que legal! Agora imagina se você conseguisse fechar 2 ou 3 MAIS por semana? É exatamente o que o FechaPro faz. Quer ver?`;
  }

  if (['encontrar cliente', 'achar cliente', 'conseguir cliente', 'fechar a venda', 'fechar venda'].some(w => t.includes(w))) {
    return "Entendi. Para encontrar clientes e fechar mais vendas, o primeiro passo é explicar o valor do FechaPro de forma simples. Quando você apresenta a ferramenta, o que sente mais dificuldade para explicar?";
  }

  if (['muito tecnico', 'explico tecnico', 'explicar tecnico', 'nao sei explicar', 'dificuldade para explicar'].some(w => t.includes(w))) {
    etapasPorContato.set(telefone, 'aguardando_mensagem');
    return "Isso tem solução 😊 Em vez de explicar funções técnicas, diga assim: ‘O FechaPro ajuda prestadores de serviço a criar propostas profissionais, acompanhar o cliente e fechar vendas com mais facilidade.’ Quer que eu prepare uma mensagem curta para você abordar seus clientes?";
  }

  if (['quero', 'pode', 'prepare', 'manda', 'sim'].some(w => t.includes(w)) && ['mensagem', 'abord', 'cliente', 'texto'].some(w => t.includes(w))) {
    return "Claro! Você pode enviar: \n\n‘Oi! Vi que você trabalha com prestação de serviços. Você já perdeu algum cliente depois de mandar um orçamento? O FechaPro ajuda a criar propostas profissionais e acompanhar o fechamento de forma simples. Posso te mostrar como funciona?’";
  }

  if (['fotograf', 'buffet', 'eletric', 'limpez', 'estet', 'marcen', 'cermon', 'ar-cond', 'servico'].some(w => t.includes(w))) {
    return "Ótimo! E hoje, como você manda seus orçamentos?\nWhatsApp, Word, PDF, Canva ou outro?";
  }

  if (['whatsapp', 'word', 'pdf', 'canva', 'email', 'manual'].some(w => t.includes(w))) {
    return "Entendi. E depois que você manda o orçamento, o que mais acontece?\n1️⃣ Cliente visualiza e some\n2️⃣ Cliente pede desconto\n3️⃣ Cliente demora pra responder";
  }

  if (['some', 'desconto', 'demora', 'tempo', 'perde'].some(w => t.includes(w))) {
    if (t.includes('some')) {
      return "É comum demais. Com o FechaPro você manda proposta com PDF, aceite e vê quando visualiza.\nTe interessa?";
    } else if (t.includes('desconto')) {
      return "Isso é por falta de apresentação. Com FechaPro você mostra portfólio, depoimentos, recibo.\nTe interessa?";
    } else {
      return "Esse tempo é ouro perdido. Com FechaPro você cria propostas muito mais rápido.\nTe interessa?";
    }
  }

  // ==================== INTERESSE - COMPRADORES ====================
  if (['sim', 'interesse', 'legal', 'show', 'perfeito', 'bacana', 'gostei', 'me interesse', 'quero saber mais'].some(w => t.includes(w)) && !['nao', 'mas', 'porém'].some(w => t.includes(w))) {
    return `Boa! 🚀 Quantos orçamentos você manda por semana?\n1️⃣ 1 a 3\n2️⃣ 4 a 10\n3️⃣ Mais de 10\n4️⃣ Depende da época`;
  }

  // ==================== VOLUME ====================
  if (['1', '2', '3', '4', '5', '10', 'poucos', 'muitos', 'muito', 'bastante', 'varios'].some(w => t.includes(w)) && !['nao', 'nunca'].some(w => t.includes(w))) {
    return `Entendi! Com esse volume, você consegue recuperar o investimento em 1-2 semanas. Quer começar hoje ou prefere conhecer melhor primeiro?`;
  }

  // ==================== URGÊNCIA - COMPRADOR QUENTE ====================
  if (['hoje', 'agora', 'ja', 'rápido', 'rapido', 'pronto', 'imediato', 'urgente'].some(w => t.includes(w))) {
    return `Perfeito! Para quem quer começar HOJE, recomendo o plano anual (R$ 997/ano - melhor custo).\n\nClica aqui e cria sua conta: ${URL_COMPRA_ANUAL}\n\nSe preferir mensal (R$ 97) ou vitalício (R$ 1.397), me avisa!`;
  }

  // ==================== INDECISÃO ====================
  if (['nao sei', 'estou em duvida', 'nao tenho certeza', 'preciso ter certeza', 'sou indeciso'].some(w => t.includes(w))) {
    return `Isso é super normal! Por isso existe o diagnóstico: ${URL_DIAGNOSTICO}\n\nVocê responde 5 perguntas rápidas e vê EXATAMENTE quanto você pode ganhar com o FechaPro. Aí fica fácil decidir.`;
  }

  // ==================== COMEÇANDO NEGÓCIO ====================
  if (['sou novo', 'comeco', 'começando', 'primeiro negocio', 'primeira venda', 'estou comecando'].some(w => t.includes(w))) {
    return `Que legal começar do jeito certo! 👏 O FechaPro é perfeito pra quem tá começando porque você já PARECE grande.\n\nVamos começar com um diagnóstico: ${URL_DIAGNOSTICO}\n\nAí eu te mostro o passo-a-passo.`;
  }

  if (['preço', 'valor', 'cust', 'caro'].some(w => t.includes(w))) {
    return "Temos o mensal por R$ 97/mês, o anual por R$ 997/ano e o vitalício por R$ 1.397 uma única vez. O anual costuma ter o melhor equilíbrio. Qual combina mais com você?";
  }

  if (['dúvida', 'como funciona', 'serve'].some(w => t.includes(w))) {
    return "Claro! O FechaPro:\n✓ Cria propostas profissionais\n✓ Cliente aceita online\n✓ Recebe via Pix\n\nTe manda o link?";
  }

  if (['tudo', 'todas', 'comeco', 'começando', 'nao entendo', 'não entendo', 'nada'].some(w => t.includes(w))) {
    return "Fica tranquila, no começo é normal parecer muita coisa ao mesmo tempo. Vamos por uma etapa: qual serviço sua empresa oferece?";
  }

  if (t.includes('indicacao')) {
    return "Indicação é um ótimo começo, mas não precisa ser seu único canal. O próximo passo pode ser abordar empresas do seu público com uma mensagem curta e personalizada. Você já sabe qual tipo de cliente quer procurar primeiro?";
  }

  if (t.includes('alucin') || t.includes('repet') || t.includes('ja respondi')) {
    return "Você tem razão, eu repeti uma pergunta que já estava respondida. Vamos retomar: hoje seus clientes chegam por indicação; posso te ajudar a criar uma segunda forma de conseguir clientes. Qual público você quer alcançar?";
  }

  // ==================== REPETIÇÕES E AJUSTES ====================
  if (['alucin', 'repet', 'ja respondi', 'ja perguntou', 'mesma pergunta'].some(w => t.includes(w))) {
    return `Você tem toda razão e peço desculpas! 😅 Vamos retomar do ponto que a gente estava. Qual era a sua dúvida ou o próximo passo que você queria?`;
  }

  // ==================== MENÇÃO A CLIENTES/VENDAS ====================
  if (['cliente', 'venda', 'faturamento', 'receita', 'lucro', 'ganho'].some(w => t.includes(w))) {
    if (['ja tenho', 'muitos'].some(w => t.includes(w))) {
      return `Legal demais! Então você já está vendendo bem. A questão é: quer MULTIPLICAR isso? O FechaPro ajuda você a triplicar as vendas sem triplicar o trabalho.`;
    }
    return `Entendi. Vamos simplificar: qual sua maior dificuldade AGORA pra conseguir mais clientes ou fechar mais vendas?`;
  }

  // ==================== PADRÕES CONFUSOS ====================
  if (['tudo', 'todas', 'comeco', 'começando', 'nao entendo', 'não entendo', 'nada', 'sem ideia'].some(w => t.includes(w))) {
    return `Fica tranquila! 😊 No começo parece muita coisa, mas é simples. Deixa o diagnóstico fazer a magia: ${URL_DIAGNOSTICO}\n\nEm 2 minutos fica tudo claro.`;
  }

  // ==================== INDICAÇÕES ====================
  if (t.includes('indicacao') || t.includes('indicação')) {
    return `Indicação é ouro! Mas você sabe o que é ainda melhor? Indicação + prospecção ativa. O FechaPro te ajuda com os dois. Quer aprender?`;
  }

  // ==================== PROPOSTAS/ORÇAMENTOS ====================
  if (['proposta', 'orcamento', 'orçamento', 'como faz'].some(w => t.includes(w))) {
    return `Ótimo! Você tá no ponto certo. O FechaPro serve EXATAMENTE pra isso: proposta profissional que o cliente aceita online.\n\nQuer ver como funciona? ${URL_DIAGNOSTICO}`;
  }

  // ==================== FOLLOW-UP ====================
  if (etapasPorContato.get(telefone) === 'ja_qualificado') {
    return `Oi de novo! 👋 Que legal você voltou! Já pensou sobre aquele diagnóstico? ${URL_DIAGNOSTICO}\n\nOu tem alguma dúvida que posso responder?`;
  }

  // ==================== FALLBACK ROBUSTO - ÚLTIMA TENTATIVA ====================
  return `Ótimo! Você mencionou algo importante. Deixa eu ser direto: o FechaPro ajuda prestadores de serviço a:\n✓ Fechar 3x mais vendas\n✓ Em 1/3 do tempo\n✓ Sem complicações técnicas\n\nQuer conhecer? ${URL_DIAGNOSTICO}\n\nOu qual sua PRINCIPAL dúvida agora?`;
}

function limparResposta(resposta, midia = null) {
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

  const iaAtiva = iaUsando === 'xai' ? xai : gemini;
  if (!iaAtiva) return gerarRespostaRoteiro(texto, telefone, identidade);

  const chaveHistorico = `${identidade.sessao}:${telefone}`;
  let historico = historicosPorContato.get(chaveHistorico) || [];
  if (!Array.isArray(historico)) historico = [];
  historico._ultimoAcesso = Date.now();

  // Construir system instruction com contexto de diagnóstico se disponível
  let systemInstruction = `${INSTRUCOES_GEMINI}\n\nLINK OFICIAL DO DIAGNÓSTICO: Ao oferecer ou enviar o diagnóstico, use sempre ${URL_DIAGNOSTICO}.\n\nIDENTIDADE DESTE PERFIL: Você atende em nome de ${identidade.nome}, integrante do FechaPro. Fale em primeira pessoa com estilo ${identidade.estilo}. Não use o nome Fezinha. Não afirme que a mensagem foi digitada pessoalmente e não negue automação se perguntarem.\n\nBASE OFICIAL DO FECHAPRO:\n${baseConhecimento || 'Nenhuma base oficial carregada.'}`;

  // Se há diagnóstico, adicionar ao contexto
  if (diagnosticoContexto) {
    const diagFormatado = diagnosticoPrompt.construirPromptComContexto(diagnosticoContexto);
    systemInstruction += `\n\n${diagFormatado}`;
  }

  try {
    let resposta = '';

    if (iaProvider === 'xai') {
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
    const respostaFallback = gerarRespostaRoteiro(texto, telefone, identidade);
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
  const { state, saveCreds } = await useMultiFileAuthState(sessao === 1 ? 'auth_info' : `auth_info_${sessao}`);

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
      console.log(`Conexão encerrada (${statusCode || 'sem código'}): ${lastDisconnect?.error?.message || 'motivo desconhecido'}`);

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
    const message = m.messages[0];

    if (!message.message) return;

    const sender = message.key.remoteJid;
    const infoMidia = extrairMidia(message);
    const texto = message.message.conversation ||
                  message.message.extendedTextMessage?.text ||
                  infoMidia?.texto || '';
    if (message.key.fromMe) {
      const foiEnviadaPeloBot = mensagensEnviadasPeloBot.has(message.key.id) || enviosBotEmAndamento.has(sender);
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

      const resposta = await gerarResposta(texto, sender, midia, identidade, 0, diagnosticoContexto);
      await salvarLead(sender, texto, resposta);

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
  console.log('');
  const quantidadeNumeros = Math.max(1, Math.min(10, Number(process.env.WHATSAPP_NUMEROS) || 1));
  for (let sessao = 1; sessao <= quantidadeNumeros; sessao++) await conectar(sessao);

  // Inicializa a API e o Frontend Unificado
  require('./webserver').startServer();
}

iniciar().catch(console.log);
