// Estruturas de mensagem SDR: observação real + uma pergunta fácil de responder.
// Regras: nada de pitch, link, preço, benchmark inventado ou crítica na primeira mensagem.
const { getRandomItem } = require('./phrases-pool');

// Saudações neutras — nunca usar o nome da empresa como se fosse pessoa
const SAUDACOES = [
  'Oi, tudo bem?',
  'Olá, tudo bem?',
  'Oi! Tudo certo?',
  'Olá!'
];

// Perguntas iniciais (uma por mensagem) — todas fáceis de responder e ligadas
// ao processo comercial que o FechaPro resolve
const PERGUNTAS = {
  apresentacao: [
    'Como vocês costumam apresentar o orçamento para novos clientes?',
    'Quando um cliente pede orçamento, vocês enviam só os valores ou uma apresentação com os serviços e condições?',
    'Hoje o orçamento de vocês vai direto pelo WhatsApp ou vocês usam alguma proposta mais estruturada?'
  ],
  acompanhamento: [
    'Depois que enviam um orçamento, vocês conseguem acompanhar quem ainda não respondeu?',
    'Quando o cliente recebe o orçamento e some, vocês costumam retomar o contato ou fica por conta dele?'
  ],
  prova_social: [
    'Vocês costumam aproveitar essas avaliações na hora de apresentar um orçamento?',
    'Quando enviam um orçamento, vocês mostram esses resultados e depoimentos ou vai só o valor?'
  ]
};

class MessageStructures {
  constructor() {
    // Evita repetir a mesma pergunta em sequência para empresas do mesmo segmento
    this.rotacaoPorSegmento = new Map();
  }

  // Escolhe pergunta rotacionando dentro do segmento
  escolherPergunta(tipo, segmento) {
    const pool = PERGUNTAS[tipo] || PERGUNTAS.apresentacao;
    const chave = `${tipo}:${(segmento || '').toLowerCase()}`;
    const indice = this.rotacaoPorSegmento.get(chave) || 0;
    this.rotacaoPorSegmento.set(chave, (indice + 1) % pool.length);
    return pool[indice % pool.length];
  }

  // Frase de contexto: como encontramos a empresa (só fatos dos dados)
  fraseEncontro(data) {
    const segmento = (data.category || '').toLowerCase();
    if (segmento && data.cidade) {
      return `Encontrei a ${data.nome} pesquisando ${segmento} em ${data.cidade}`;
    }
    if (segmento) {
      return `Encontrei a ${data.nome} pesquisando empresas de ${segmento} no Google`;
    }
    return `Encontrei a ${data.nome} no Google`;
  }

  // Gancho: uma única observação verdadeira, escolhida pelo dado mais forte
  definirGancho(data) {
    if (data.reviews >= 5 && data.rating >= 4.3) return 'avaliacoes_google';
    if (data.hasWebsite) return 'com_site';
    if (data.hasPhone && !data.hasWebsite) return 'sem_site';
    return 'basico';
  }

  // Gancho: boas avaliações reais no Google → pergunta sobre prova social ou apresentação
  ganchoAvaliacoes(data) {
    const observacoes = [
      `e vi que vocês têm ótimas avaliações no Google`,
      `e reparei que vocês têm uma avaliação muito boa dos clientes no Google`
    ];
    const tipoPergunta = getRandomItem(['prova_social', 'apresentacao']);
    return {
      observacao: `${this.fraseEncontro(data)} ${getRandomItem(observacoes)}.`,
      pergunta: this.escolherPergunta(tipoPergunta, data.category)
    };
  }

  // Gancho: tem site → pergunta como o orçamento é enviado
  ganchoComSite(data) {
    const observacoes = [
      `e vi que vocês têm site apresentando os serviços`,
      `e dei uma olhada no site de vocês`
    ];
    return {
      observacao: `${this.fraseEncontro(data)} ${getRandomItem(observacoes)}.`,
      pergunta: this.escolherPergunta(getRandomItem(['apresentacao', 'acompanhamento']), data.category)
    };
  }

  // Gancho: sem site, atendimento pelo WhatsApp → pergunta sobre apresentação
  ganchoSemSite(data) {
    return {
      observacao: `${this.fraseEncontro(data)}. Vi que o contato de vocês é direto pelo WhatsApp.`,
      pergunta: this.escolherPergunta('apresentacao', data.category)
    };
  }

  // Gancho básico: só nome + segmento (+ cidade)
  ganchoBasico(data) {
    return {
      observacao: `${this.fraseEncontro(data)}.`,
      pergunta: this.escolherPergunta('apresentacao', data.category)
    };
  }

  montar(data) {
    const gancho = this.definirGancho(data);
    const construtores = {
      avaliacoes_google: () => this.ganchoAvaliacoes(data),
      com_site: () => this.ganchoComSite(data),
      sem_site: () => this.ganchoSemSite(data),
      basico: () => this.ganchoBasico(data)
    };
    const { observacao, pergunta } = construtores[gancho]();

    const saudacao = data.responsavel
      ? `Oi, ${data.responsavel}! Tudo bem?`
      : getRandomItem(SAUDACOES);

    const mensagem = `${saudacao} ${observacao} ${pergunta}`;
    return { mensagem, gancho };
  }

  // Valida contra as regras de personalização antes de liberar
  validar(mensagem) {
    const problemas = [];
    if (/https?:\/\/|www\./i.test(mensagem)) problemas.push('contém link');
    if (/R\$\s?\d/.test(mensagem)) problemas.push('menciona preço');
    if ((mensagem.match(/\?/g) || []).length !== 1) problemas.push('deve ter exatamente uma pergunta');
    if (mensagem.length > 420) problemas.push('mensagem longa demais');
    if (/fechapro/i.test(mensagem)) problemas.push('menciona o produto na primeira mensagem');
    return problemas;
  }

  // API usada por smart-generator e webserver
  generate(profile, data) {
    const { mensagem, gancho } = this.montar(data);
    const problemas = this.validar(mensagem);
    if (problemas.length > 0) return null;
    return { mensagem, gancho };
  }

  generateVariations(profile, data, count = 3) {
    const variations = [];
    const vistas = new Set();
    for (let i = 0; i < count * 3 && variations.length < count; i++) {
      const gerada = this.generate(profile, data);
      if (gerada && !vistas.has(gerada.mensagem)) {
        vistas.add(gerada.mensagem);
        variations.push(gerada);
      }
    }
    return variations;
  }
}

module.exports = new MessageStructures();
