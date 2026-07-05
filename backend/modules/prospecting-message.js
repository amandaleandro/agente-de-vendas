const companyParser = require('./company-parser');

const QUESTION_BY_SEGMENT = [
  {
    match: ['ar condicionado', 'climatizacao', 'clima', 'refrigeracao'],
    question: 'quando um cliente pede orcamento, voces enviam so o valor ou ja mandam uma apresentacao com servicos, diferenciais e aceite?'
  },
  {
    match: ['fotografia', 'fotografa', 'fotografo', 'ensaio'],
    question: 'quando alguem pede os pacotes, voce envia tudo pelo WhatsApp ou ja usa uma proposta com portfolio, condicoes e confirmacao?'
  },
  {
    match: ['eletric', 'hidraulic', 'pedreiro', 'construt', 'reforma', 'pintura', 'gesso', 'moveis', 'metalica', 'arquitet'],
    question: 'quando chega um pedido de orcamento, voces apresentam so o valor ou tambem organizam portfolio, servicos incluidos e acompanhamento?'
  }
];

const GENERIC_QUESTIONS = [
  'como voces costumam apresentar o orcamento para novos clientes?',
  'quando um cliente pede orcamento, voces mandam apenas os valores ou tambem mostram diferenciais e proximos passos?',
  'hoje voces fazem o acompanhamento dos orcamentos pelo WhatsApp mesmo ou ja tem alguma estrutura para isso?',
  'depois que voces enviam um orcamento, da pra saber se o cliente chegou a abrir?',
  'quando o cliente recebe o valor e some, voces retomam o contato ou fica por conta dele?',
  'voces costumam mandar so o preco ou tambem uma apresentacao com o que esta incluso?',
  'como voces organizam o retorno pra quem pediu orcamento e ainda nao respondeu?',
  'hoje voces conseguem medir quantos orcamentos viram fechamento?',
  'quando alguem pede uma proposta, ela sai padronizada ou voces montam do zero cada vez?',
  'voces costumam dar um segundo toque em quem recebeu o orcamento e ficou quieto?'
];

// ===== Fragmentos para montagem aleatoria (milhares de combinacoes) =====
// Regras mantidas: sem link, sem preco, sem citar o produto, uma unica pergunta.

const SAUDACOES_SEM_NOME = [
  'Oi, tudo bem?',
  'Ola, tudo bem?',
  'Oi! Tudo certo?',
  'Ola!',
  'Oi, como vai?',
  'Opa, tudo certo?',
  'Ola, tudo certo por ai?',
  'Oi, bom te encontrar por aqui!'
];

function saudacaoComNome(nome, seed = '') {
  const modelos = [
    `Oi, ${nome}! Tudo bem?`,
    `Ola, ${nome}, tudo certo?`,
    `Oi ${nome}! Como vai?`,
    `Opa ${nome}, tudo bem?`,
    `${nome}, tudo certo por ai?`,
    `Ola ${nome}! Tudo tranquilo?`
  ];
  return seed ? pickSeeded(modelos, seed, 'saudacao-nome') : randItem(modelos);
}

// Conectivos que introduzem a pergunta (variando o "tom")
const PONTES_PERGUNTA = [
  'Fiquei com uma duvida:',
  'Deixa eu te perguntar uma coisa:',
  'Uma curiosidade rapida:',
  'Posso te perguntar uma coisa?',
  'Queria entender uma coisa:',
  'Me tira uma duvida:',
  'So pra eu entender melhor:',
  'Ah, e uma pergunta:'
];

// Fechos opcionais (as vezes vazio, pra variar tamanho)
const FECHOS = [
  '',
  '',
  '',
  'Sem compromisso.',
  'Pode responder quando puder.'
];

const MICRO_CONVITES = [
  'Posso te mandar uma ideia rapida?',
  'Posso te mostrar uma forma simples de melhorar isso?',
  'Posso te enviar um exemplo rapido?',
  'Quer que eu te mande uma sugestao em 1 minuto?',
  'Posso te passar um caminho simples?',
  'Quer ver uma ideia que pode ajudar nisso?',
  'Posso te mandar uma dica objetiva?',
  'Quer que eu te mostre como algumas empresas resolvem isso?',
  'Posso te explicar rapidinho?',
  'Te mando uma ideia sem compromisso?'
];

const FORMATOS_CONVERSA = [
  'observacao_pergunta_convite',
  'observacao_convite',
  'pergunta_convite',
  'curioso_convite'
];

function randItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function pick(items, seed = '') {
  const text = String(seed || '');
  const total = text.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return items[total % items.length];
}

function seedFromLead(lead = {}, identity = {}) {
  return [
    lead.telefone,
    lead.nome,
    lead.empresa,
    lead.categoria,
    lead.segmento,
    identity.sessao,
    identity.nome
  ].filter(Boolean).join('|');
}

function pickSeeded(items, seed, salt = '') {
  return pick(items, `${seed}|${salt}`);
}

function normalize(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .toLowerCase()
    .trim();
}

function firstValue(lead, keys) {
  for (const key of keys) {
    const value = lead[key];
    if (value && String(value).trim()) return String(value).trim();
  }

  const wanted = keys.map(normalize);
  for (const [key, value] of Object.entries(lead || {})) {
    if (value && wanted.includes(normalize(key))) return String(value).trim();
  }

  return '';
}

function splitName(name) {
  const clean = String(name || '').trim();
  if (!clean) return { company: '', contact: '' };

  const withoutCity = clean.replace(/\s+-\s+.*$/, '').trim();
  const words = withoutCity.split(/\s+/).filter(Boolean);
  const contact = words.length <= 2 ? words[0] : '';
  return { company: clean, contact };
}

function inferSegment(lead) {
  const explicit = firstValue(lead, ['segmento', 'categoria', 'tipo', 'industry', 'category']);
  if (explicit) return explicit;

  const source = normalize(`${lead.nome || ''} ${lead.empresa || ''}`);
  const rules = [
    ['eletric', 'eletrica'],
    ['hidraulic', 'hidraulica'],
    ['pedreiro', 'reformas e obras'],
    ['construt', 'construcao e reformas'],
    ['reforma', 'reformas'],
    ['pintura', 'pintura'],
    ['gesso', 'gesso'],
    ['moveis', 'moveis planejados ou manutencao'],
    ['metalica', 'estruturas metalicas'],
    ['arquitet', 'arquitetura']
  ];

  const found = rules.find(([needle]) => source.includes(needle));
  return found ? found[1] : '';
}

function inferCity(lead) {
  const explicit = firstValue(lead, ['cidade', 'city', 'localidade']);
  if (explicit) return explicit;

  const address = firstValue(lead, ['endereco', 'address', 'local']);
  if (address) return address;

  const name = normalize(lead.nome || lead.empresa || '');
  const cities = ['uberaba', 'uberlandia', 'sorocaba', 'belo horizonte', 'ribeirao preto'];
  return cities.find(city => name.includes(city)) || '';
}

function collectEvidence(lead, segment, city) {
  const evidences = [];
  if (segment) evidences.push({ label: 'segmento', value: segment });
  if (city) evidences.push({ label: 'cidade', value: city });

  const site = firstValue(lead, ['site', 'website', 'url', 'link']);
  if (site) evidences.push({ label: 'site', value: site });

  const instagram = firstValue(lead, ['instagram', 'insta', 'perfil_instagram']);
  if (instagram) evidences.push({ label: 'instagram', value: instagram });

  const servico = firstValue(lead, ['servico', 'servicos', 'servico_observado', 'servico observado', 'atividade']);
  if (servico) evidences.push({ label: 'servico', value: servico });

  const positivo = firstValue(lead, ['ponto_positivo', 'ponto positivo', 'positivo', 'diferencial']);
  if (positivo) evidences.push({ label: 'ponto positivo', value: positivo });

  return evidences;
}

function inferOpportunity(lead, evidences) {
  const explicit = firstValue(lead, ['oportunidade', 'oportunidade_identificada', 'oportunidade identificada', 'gargalo', 'diagnostico']);
  if (explicit) return explicit;

  const labels = evidences.map(e => e.label);
  if (labels.includes('site') || labels.includes('instagram')) {
    return 'apresentar orcamento, diferenciais e acompanhamento de forma mais organizada';
  }
  return 'entender como o orcamento e apresentado e acompanhado hoje';
}

function buildQuestion(segment, lead) {
  const normalized = normalize(segment);
  const rule = QUESTION_BY_SEGMENT.find(item => item.match.some(term => normalized.includes(term)));
  if (rule) return rule.question;
  return pick(GENERIC_QUESTIONS, `${lead.telefone || ''}${lead.nome || ''}${segment}`);
}

function validateProspectingContext({ company, segment, city, evidences }) {
  if (!company) return { ok: false, reason: 'sem nome da empresa' };
  if (!segment && !city && evidences.length < 2) {
    return { ok: false, reason: 'dados insuficientes para mensagem contextual' };
  }
  if (!segment && evidences.length < 2) {
    return { ok: false, reason: 'sem segmento ou evidencias suficientes' };
  }
  return { ok: true };
}

function createProspectingMessage(lead, identity = {}) {
  const rawName = firstValue(lead, ['empresa', 'nome', 'company', 'business']) || lead.nome;
  if (!rawName || !String(rawName).trim()) {
    const error = new Error('sem nome da empresa');
    error.code = 'PROSPECTING_CONTEXT_INSUFFICIENT';
    throw error;
  }

  // Fatos ESPECÍFICOS extraídos do nome da própria empresa (serviços, cidade, pessoa, profissão)
  const fatos = companyParser.parseEmpresa(rawName);

  // Enriquecer com quaisquer colunas extras da planilha (se existirem no futuro)
  const cidade = fatos.cidade || inferCity(lead);
  const responsavel = firstValue(lead, ['responsavel', 'nome do responsavel', 'contato', 'nome_responsavel']) || fatos.pessoa;
  const servicos = fatos.servicos.length ? fatos.servicos : (inferSegment(lead) ? [inferSegment(lead)] : []);
  const seed = seedFromLead(lead, identity);

  // Saudação: nome da pessoa > nome comercial > neutra
  const saudacao = responsavel
    ? saudacaoComNome(responsavel.split(' ')[0], seed)
    : (pickSeeded([true, false], seed, 'saudacao-tipo') ? saudacaoComEmpresa(fatos.empresaCurta, seed) : pickSeeded(SAUDACOES_SEM_NOME, seed, 'saudacao-neutra'));

  // Observação ancorada nos serviços/cidade/posicionamento REAIS da empresa
  const observation = buildFactObservation({ ...fatos, cidade, servicos }, seed);

  // Pergunta específica ao serviço principal (cada segmento gera uma pergunta diferente)
  const question = buildFactQuestion(servicos, fatos, seed);

  const ponte = pickSeeded(PONTES_PERGUNTA, seed, 'ponte');
  const fecho = pickSeeded(FECHOS, seed, 'fecho');
  const convite = pickSeeded(MICRO_CONVITES, seed, 'convite');
  const formato = pickSeeded(FORMATOS_CONVERSA, seed, 'formato');

  const corpos = {
    observacao_pergunta_convite: `${saudacao} ${observation} ${ponte} ${question} ${convite}`,
    observacao_convite: `${saudacao} ${observation} ${convite}`,
    pergunta_convite: `${saudacao} ${ponte} ${question} ${convite}`,
    curioso_convite: `${saudacao} ${observation} Tenho uma ideia simples pra esse tipo de atendimento. ${convite}`
  };

  const corpo = corpos[formato] || corpos.observacao_pergunta_convite;

  const message = (fecho ? `${corpo} ${fecho}` : corpo).replace(/\s+/g, ' ').trim();

  const riqueza = servicos.length + (cidade ? 1 : 0) + (responsavel ? 1 : 0);
  return {
    message,
    confidence: riqueza >= 3 ? 'alto' : riqueza >= 1 ? 'medio' : 'baixo',
    evidence: { servicos, cidade, pessoa: responsavel || '' },
    opportunity: inferOpportunity(lead, servicos.map(s => ({ label: 'servico', value: s }))),
    personalizationLevel: riqueza >= 2 ? 'intermediaria' : 'basica'
  };
}

// ===== Observação baseada nos fatos reais da empresa =====
function buildFactObservation(fatos, seed = '') {
  const { empresaCurta, servicos, cidade, posicionamento } = fatos;
  const emCidade = cidade ? ` em ${cidade}` : '';

  // 1+ serviços conhecidos: menciona explicitamente (é o que diferencia empresa a empresa)
  if (servicos.length) {
    const listaServicos = listarNatural(servicos.slice(0, 3));
    const variantes = [
      `Vi que a ${empresaCurta} trabalha com ${listaServicos}${emCidade}.`,
      `Encontrei a ${empresaCurta} e reparei que voces atuam com ${listaServicos}${emCidade}.`,
      `Cheguei ate voces pesquisando quem faz ${listaServicos}${emCidade}.`,
      `Vi o trabalho de voces com ${listaServicos}${emCidade}.`,
      `Reparei que a ${empresaCurta} e forte em ${listaServicos}${emCidade}.`
    ];
    if (posicionamento) {
      variantes.push(`Vi que a ${empresaCurta} tem um ${posicionamento} em ${listaServicos}${emCidade}.`);
    }
    return seed ? pickSeeded(variantes, seed, 'observacao-servico') : randItem(variantes);
  }

  // Sem serviço identificado, mas com cidade
  if (cidade) {
    const variantesCidade = [
      `Encontrei a ${empresaCurta} pesquisando empresas em ${cidade}.`,
      `Cheguei ate a ${empresaCurta} olhando negocios de ${cidade}.`
    ];
    return seed ? pickSeeded(variantesCidade, seed, 'observacao-cidade') : randItem(variantesCidade);
  }

  // Fallback mínimo: só o nome
  const variantesFallback = [
    `Encontrei a ${empresaCurta} numa pesquisa aqui.`,
    `Achei o contato da ${empresaCurta} e resolvi chamar.`,
    `Vi a ${empresaCurta} e fiquei curioso pra entender melhor o trabalho de voces.`
  ];
  return seed ? pickSeeded(variantesFallback, seed, 'observacao-fallback') : randItem(variantesFallback);
}

// ===== Pergunta específica ao serviço principal =====
// Cada tipo de serviço tem perguntas próprias — reforça a diferença entre empresas.
const PERGUNTA_POR_SERVICO = {
  'estruturas metálicas': [
    'quando um cliente pede orcamento de uma estrutura, voces mandam so o valor ou um projeto com prazos e etapas?',
    'como voces apresentam o orcamento de uma estrutura hoje: so o preco ou com desenho e cronograma?'
  ],
  'móveis planejados': [
    'quando alguem pede um projeto de moveis, voces enviam so o valor ou uma proposta com o projeto e as condicoes?',
    'hoje o cliente que pede orcamento de planejados recebe so o preco ou uma apresentacao completa?'
  ],
  'projetos de arquitetura': [
    'quando chega um pedido de projeto, voces mandam so o valor da hora ou uma proposta com escopo e etapas?',
    'como voces apresentam a proposta de um projeto novo pro cliente?'
  ],
  'design de interiores': [
    'quando alguem pede um projeto de interiores, voces enviam so o valor ou um material com referencias e etapas?'
  ],
  'climatização': [
    'quando um cliente pede orcamento de instalacao, voces mandam so o valor ou uma apresentacao com o servico e a garantia?'
  ],
  'assessoria imobiliária': [
    'quando um cliente chega interessado, voces conseguem acompanhar quem ainda nao respondeu a proposta?'
  ],
  'venda de materiais de construção': [
    'quando um cliente pede um orcamento de materiais, voces mandam so a lista de precos ou ja organizam condicoes e prazos?'
  ],
  'gesso e drywall': [
    'quando chega um pedido de orcamento de forro ou drywall, voces enviam so o valor ou uma proposta com o servico detalhado?'
  ],
  'pintura': [
    'quando um cliente pede orcamento de pintura, voces mandam so o valor ou tambem o que esta incluso e o prazo?'
  ],
  'confecção sob medida': [
    'quando uma cliente pede um orcamento, voce manda so o valor ou tambem fotos e as condicoes de forma organizada?'
  ]
};

function buildFactQuestion(servicos, fatos, seed = '') {
  // Se algum serviço tem pergunta dedicada, usa (escolhe entre os serviços encontrados)
  for (const s of servicos) {
    if (PERGUNTA_POR_SERVICO[s]) return capitalize(seed ? pickSeeded(PERGUNTA_POR_SERVICO[s], seed, `pergunta-${s}`) : randItem(PERGUNTA_POR_SERVICO[s]));
  }
  // Serviços de obra/reforma/construção/manutenção -> perguntas de obra
  const obra = ['reformas', 'construção e obras', 'manutenção predial', 'alvenaria', 'parte hidráulica', 'parte elétrica', 'pisos e revestimentos', 'carpintaria', 'impermeabilização', 'terraplanagem', 'revestimento em ACM'];
  if (servicos.some(s => obra.includes(s))) {
    const perguntasObra = [
      'quando chega um pedido de orcamento pra uma obra, voces mandam so o valor ou uma apresentacao com as etapas e o que esta incluso?',
      'depois que voces passam o orcamento de uma obra, da pra saber se o cliente chegou a abrir?',
      'quando o cliente recebe o orcamento da obra e some, voces retomam o contato ou fica por conta dele?'
    ];
    return capitalize(seed ? pickSeeded(perguntasObra, seed, 'pergunta-obra') : randItem(perguntasObra));
  }
  // Genérica
  return capitalize(seed ? pickSeeded(GENERIC_QUESTIONS, seed, 'pergunta-generica') : randItem(GENERIC_QUESTIONS));
}

// Junta itens em linguagem natural: "a, b e c"
function listarNatural(itens) {
  if (itens.length <= 1) return itens[0] || '';
  return `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`;
}

function saudacaoComEmpresa(empresa, seed = '') {
  const modelos = [
    `Oi, pessoal da ${empresa}! Tudo bem?`,
    `Ola, time da ${empresa}, tudo certo?`,
    `Oi! Falo com a ${empresa}?`,
    `Ola, ${empresa}! Tudo bem por ai?`
  ];
  return seed ? pickSeeded(modelos, seed, 'saudacao-empresa') : randItem(modelos);
}

function capitalize(text) {
  const t = String(text || '').trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
}

module.exports = {
  createProspectingMessage,
  inferSegment,
  inferCity,
  validateProspectingContext
};
