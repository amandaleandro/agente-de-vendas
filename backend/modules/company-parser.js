// Extrai fatos ESPECÍFICOS de cada empresa a partir do nome (única informação
// disponível nas planilhas: "Empresa/Nome" + "Telefone"). É o que permite gerar
// mensagens genuinamente diferentes de empresa pra empresa, sem depender de IA.

function normalize(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Serviço/especialidade -> frase canônica. Ordem importa (mais específico primeiro).
const SERVICOS = [
  { termos: ['estrutura metalica', 'estruturas metalicas', 'serralher', 'metalica'], frase: 'estruturas metálicas' },
  { termos: ['moveis planejados', 'planejados', 'marcenaria', 'marceneiro', 'moveis'], frase: 'móveis planejados' },
  { termos: ['ar condicionado', 'climatiz', 'refrigerac', 'refrigeracao'], frase: 'climatização' },
  { termos: ['assessoria imobiliaria', 'imobiliaria', 'imobiliario'], frase: 'assessoria imobiliária' },
  { termos: ['interiores', 'design de interiores'], frase: 'design de interiores' },
  { termos: ['arquitet'], frase: 'projetos de arquitetura' },
  { termos: ['impermeabiliz'], frase: 'impermeabilização' },
  { termos: ['terraplan'], frase: 'terraplanagem' },
  { termos: ['hidraulic'], frase: 'parte hidráulica' },
  { termos: ['eletric'], frase: 'parte elétrica' },
  { termos: ['alvenaria'], frase: 'alvenaria' },
  { termos: ['pintura', 'pinturas', 'pintor'], frase: 'pintura' },
  { termos: ['gesso', 'drywall'], frase: 'gesso e drywall' },
  { termos: ['acm'], frase: 'revestimento em ACM' },
  { termos: ['piso', 'porcelanato', 'revestimento'], frase: 'pisos e revestimentos' },
  { termos: ['carpinteiro', 'carpintaria'], frase: 'carpintaria' },
  { termos: ['materiais para construcao', 'materiais p construcao', 'material de construcao', 'materiais de construcao'], frase: 'venda de materiais de construção' },
  { termos: ['manutenc'], frase: 'manutenção predial' },
  { termos: ['reforma'], frase: 'reformas' },
  { termos: ['costura', 'atelie', 'alta costura'], frase: 'confecção sob medida' },
  { termos: ['engenharia'], frase: 'engenharia' },
  { termos: ['construt', 'construc', 'obras'], frase: 'construção e obras' }
];

// Profissões (usadas para saudação e para detectar nome de pessoa)
const PROFISSOES = [
  'eletricista', 'pedreiro', 'pintor', 'arquiteta', 'arquiteto', 'engenheiro', 'engenheira',
  'gesseiro', 'encanador', 'marceneiro', 'serralheiro', 'carpinteiro'
];

// Cidades comuns nas listas (MG/SP interior)
const CIDADES = [
  'uberaba', 'uberlandia', 'sorocaba', 'ribeirao preto', 'sao jose do rio preto', 'rio preto',
  'belo horizonte', 'franca', 'aracatuba', 'bauru', 'jundiai', 'campinas', 'votorantim',
  'aracoiaba', 'aracoiaba da serra', 'aracatuba', 'itu', 'salto', 'aracaju'
];

// Palavras que sinalizam posicionamento (usadas como "diferencial")
const POSICIONAMENTO = [
  { termos: ['alto padrao'], frase: 'trabalho de alto padrão' },
  { termos: ['especializ'], frase: 'atuação especializada' },
  { termos: ['premium'], frase: 'proposta premium' }
];

const STOPWORDS_EMPRESA = new Set([
  'ltda', 'me', 'epp', 'eireli', 'sa', 'cia', 'e', 'de', 'da', 'do', 'dos', 'das', 'em', 'para',
  'p', 'geral', 'gerais', 'servico', 'servicos', 'servicos', 'regiao', 'sp', 'mg'
]);

function detectarServicos(norm) {
  const achados = [];
  for (const s of SERVICOS) {
    if (s.termos.some(t => norm.includes(t)) && !achados.includes(s.frase)) {
      achados.push(s.frase);
    }
  }
  return achados;
}

// Forma de exibição com acento para cidades que precisam
const CIDADE_DISPLAY = {
  'uberlandia': 'Uberlândia',
  'ribeirao preto': 'Ribeirão Preto',
  'sao jose do rio preto': 'São José do Rio Preto',
  'jundiai': 'Jundiaí',
  'aracatuba': 'Araçatuba',
  'aracoiaba': 'Araçoiaba',
  'aracoiaba da serra': 'Araçoiaba da Serra'
};

function detectarCidade(norm) {
  // Prioriza cidade com nome composto (match mais longo primeiro)
  const ordenadas = [...CIDADES].sort((a, b) => b.length - a.length);
  const achada = ordenadas.find(c => norm.includes(c));
  if (!achada) return '';
  if (CIDADE_DISPLAY[achada]) return CIDADE_DISPLAY[achada];
  return achada.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function detectarProfissao(norm) {
  return PROFISSOES.find(p => norm.split(' ').includes(p)) || '';
}

function detectarPosicionamento(norm) {
  for (const p of POSICIONAMENTO) {
    if (p.termos.some(t => norm.includes(t))) return p.frase;
  }
  return '';
}

// Tenta extrair nome de pessoa quando o nome comercial claramente é de alguém.
// Conservador: só retorna quando o padrão é forte (profissão + nome único).
function detectarPessoa(nomeOriginal, norm) {
  const tokens = nomeOriginal.split(/[\s\-|]+/).filter(Boolean);
  const tokensNorm = norm.split(' ');
  const idxProf = tokensNorm.findIndex(t => PROFISSOES.includes(t));

  // Padrão "Profissao Nome" (ex.: ELETRICISTA RODOLFO, Pedreiro webert)
  if (idxProf === 0 && tokens[1] && /^[a-zA-ZÀ-ú]{3,}$/.test(tokens[1]) && !ehPalavraComum(tokensNorm[1])) {
    return capitalizarNome(tokens[1]);
  }
  // Padrão "Nome Profissao" (ex.: Davi Eletricista, Tomé Pinturas via pintor? não)
  if (idxProf === 1 && tokens[0] && /^[a-zA-ZÀ-ú]{3,}$/.test(tokens[0]) && !ehPalavraComum(tokensNorm[0])) {
    return capitalizarNome(tokens[0]);
  }
  return '';
}

function ehPalavraComum(tokenNorm) {
  return STOPWORDS_EMPRESA.has(tokenNorm) ||
    SERVICOS.some(s => s.termos.some(t => t === tokenNorm)) ||
    tokenNorm.length < 3;
}

function capitalizarNome(nome) {
  return nome.charAt(0).toUpperCase() + nome.slice(1).toLowerCase();
}

// Nome comercial limpo (sem cidade/serviços/sufixos jurídicos) para saudar a empresa
function nomeComercialCurto(nomeOriginal) {
  // Corta na primeira ocorrência de separador de "descrição": | / ou hífen (com/sem espaço) ou vírgula
  let base = String(nomeOriginal || '').split(/\s*[|\/,]\s*|\s*-\s*|-\s+/)[0].trim();
  // Remove sufixos jurídicos no fim
  base = base.replace(/\b(ltda|me|epp|eireli|s\.?a\.?)\b\.?$/gi, '').trim();
  // Title case leve (mantém siglas curtas em caixa alta)
  base = base.split(/\s+/).map(w => {
    if (w.length <= 3 && w === w.toUpperCase()) return w; // siglas: RP, WM, ACM
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  }).join(' ');
  return base || nomeOriginal;
}

/**
 * Extrai todos os fatos disponíveis do nome da empresa.
 * Retorna { empresa, empresaCurta, pessoa, profissao, servicos[], cidade, posicionamento }
 */
function parseEmpresa(nomeOriginal) {
  const empresa = String(nomeOriginal || '').trim();
  const norm = normalize(empresa);

  return {
    empresa,
    empresaCurta: nomeComercialCurto(empresa),
    pessoa: detectarPessoa(empresa, norm),
    profissao: detectarProfissao(norm),
    servicos: detectarServicos(norm),
    cidade: detectarCidade(norm),
    posicionamento: detectarPosicionamento(norm),
    norm
  };
}

module.exports = { parseEmpresa, detectarServicos, detectarCidade, normalize };
