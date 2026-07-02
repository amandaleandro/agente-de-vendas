// Pool de frases variadas para gerar mensagens únicas e personalizadas

const phrasesPool = {
  // Aberturas por perfil
  openings: {
    consolidated: [
      "Achei incrível seu trabalho aqui no Google",
      "Vi que vocês tão mandando bem",
      "Pesquisei vocês e achei muito legal",
      "Notei que vocês têm presença forte aqui",
      "Wow, que reputação impressionante"
    ],
    established: [
      "Opa, vi vocês aqui com ótimas referências",
      "Achei interessante o movimento que vocês têm",
      "Pesquisei e vocês têm bom posicionamento",
      "Vi que tá crescendo bem por lá",
      "Notei que vocês tão se destacando"
    ],
    emerging: [
      "Vi que vocês estão começando a aparecer",
      "Achei legal que tão crescendo",
      "Pesquisei e vocês têm potencial",
      "Notei que tá decolando aí",
      "Vi boas avaliações da galera"
    ],
    needs_improvement: [
      "Notei que vocês têm muita demanda",
      "Vi que o volume de clientes é bem grande",
      "Pesquisei e vocês tão com bastante movimento",
      "Achei interessante o tamanho da base de clientes",
      "Vi que têm muita procura"
    ],
    struggling: [
      "Pesquisei e vi que tá um pouco desafiador aí",
      "Notei que estão numa fase de transição",
      "Achei que seria interessante conversar",
      "Vi que tem espaço pra melhorar",
      "Pesquisei e acho que podemos ajudar"
    ],
    invisible: [
      "Opa, achei vocês pesquisando",
      "Vi que estão começando a jornada",
      "Pesquisei e gostaria de entender melhor",
      "Encontrei vocês por aqui",
      "Achei que seria legal conversar"
    ],
    critical: [
      "Pesquisei e identifiquei uma oportunidade",
      "Vi que esse é um momento importante",
      "Achei que seria bom explorar mudanças",
      "Notei que precisa de um novo direcionamento",
      "Vi que talvez seja hora de inovar"
    ]
  },

  // Corpo da mensagem - dados específicos
  dataPoints: {
    consolidated: [
      "com {{reviews}} avaliações e {{rating}} ⭐",
      "{{reviews}} clientes satisfeitos dando {{rating}} ⭐",
      "Só aqui no Google: {{reviews}} reviews com {{rating}} ⭐",
      "{{reviews}} pessoas confiando em vocês ({{rating}} ⭐)"
    ],
    established: [
      "{{reviews}} avaliações com {{rating}} ⭐ de nota",
      "{{reviews}} clientes confiando em vocês",
      "com {{rating}} ⭐ e {{reviews}} reviews",
      "{{reviews}} pessoas já validaram o trabalho ({{rating}} ⭐)"
    ],
    emerging: [
      "você conseguiu {{reviews}} avaliações com {{rating}} ⭐",
      "{{reviews}} pessoas já deram 5 ⭐ pra vocês",
      "já têm {{reviews}} clientes satisfeitos",
      "{{rating}} ⭐ de média com {{reviews}} reviews"
    ],
    needs_improvement: [
      "mas você tá com {{reviews}} avaliações no Google",
      "o volume é de {{reviews}} clientes, a avaliação tá em {{rating}} ⭐",
      "tem {{reviews}} clientes, mas a satisfação tá em {{rating}} ⭐",
      "{{reviews}} pessoas já passaram por vocês, {{rating}} ⭐ de média"
    ],
    struggling: [
      "você tá com {{reviews}} avaliações mas a média é {{rating}} ⭐",
      "o feedback tá em {{rating}} ⭐ com {{reviews}} clientes",
      "{{reviews}} avaliações, mas só {{rating}} ⭐ de média",
      "{{reviews}} pessoas avaliaram mas resultado é {{rating}} ⭐"
    ],
    invisible: [
      "focando em {{category}}",
      "na área de {{category}}",
      "atuando em {{category}}",
      "especializados em {{category}}"
    ]
  },

  // Observações contextualizadas
  observations: {
    consolidated: [
      "Isso mostra que vocês realmente fazem a diferença",
      "Quer dizer que a galera tá muito satisfeita mesmo",
      "Isso é prova de excelência no trabalho de vocês",
      "É o resultado de um trabalho consistente"
    ],
    established: [
      "Mostra que vocês tão no caminho certo",
      "Quer dizer que a qualidade tá vindo bem",
      "Prova de que estão crescendo de verdade",
      "Resultado de um trabalho sério"
    ],
    emerging: [
      "Que é um bom começo pra base",
      "Que indica que estão crescendo",
      "Que mostra que tá decolando",
      "Que é um bom ponto de partida"
    ],
    needs_improvement: [
      "Mas acho que a comunicação com eles não tá sendo tão boa",
      "Só que acho que falta melhorar o acompanhamento",
      "Mas aparentemente falta algo na experiência deles",
      "Parece que tem um gap entre oferta e satisfação"
    ],
    struggling: [
      "Mas acho que talvez falte estrutura de comunicação",
      "E parece que a experiência não tá sendo tão legal",
      "Mas a satisfação deveria ser maior",
      "Indica que algo precisa mudar na abordagem"
    ],
    invisible: [
      "Mas vocês não tão aproveitando o potencial online",
      "Mas a presença digital não tá tão forte",
      "Parece que o Google não tá sendo usado ainda",
      "Mas digital tá meio invisível"
    ]
  },

  // Propostas de solução
  solutions: {
    consolidated: [
      "Posso ajudar a vocês a escalar essa base de clientes com automação",
      "Posso ajudar a manter essa excelência enquanto crescem",
      "Posso ajudar a vocês a não deixar ninguém sem resposta",
      "Posso ajudar a consolidar ainda mais essa reputação"
    ],
    established: [
      "Posso ajudar a vocês a crescer ainda mais rápido",
      "Posso ajudar a manter qualidade enquanto escala",
      "Posso ajudar a não deixar lead escapar",
      "Posso ajudar a melhorar ainda mais a satisfação"
    ],
    emerging: [
      "Posso ajudar a vocês a crescer de verdade",
      "Posso ajudar a consolidar essa base",
      "Posso ajudar a não perder leads nesse crescimento",
      "Posso ajudar a escalar sem perder qualidade"
    ],
    needs_improvement: [
      "Posso ajudar a vocês a melhorar essa relação com os clientes",
      "Posso ajudar a transformar volume em satisfação",
      "Posso ajudar a vocês a responder melhor cada cliente",
      "Posso ajudar a melhorar a experiência deles"
    ],
    struggling: [
      "Posso ajudar a mudar esse cenário com comunicação melhor",
      "Posso ajudar a vocês a reverter essa avaliação",
      "Posso ajudar a estruturar melhor o atendimento",
      "Posso ajudar a transformar essa situação"
    ],
    invisible: [
      "Posso ajudar vocês a aparecer e crescer aqui",
      "Posso ajudar a vocês a existir digitalmente",
      "Posso ajudar a mudar essa invisibilidade",
      "Posso ajudar a vocês a começar forte"
    ]
  },

  // Chamada para ação (CTA)
  ctas: {
    consolidated: [
      "Quer conversar sobre como a gente pode crescer junto?",
      "Bora explorar como a gente se ajuda?",
      "Você tá aberto pra discutir parcerias que escalam?",
      "Posso enviar um projeto? Quer ver?",
      "Tá interessado em conversar sobre isso?"
    ],
    established: [
      "Quer que a gente explore essa oportunidade?",
      "Posso enviar um projeto personalizado?",
      "Você se importaria de conhecer como funciona?",
      "Tá disponível pra uma conversa rápida?",
      "Você abre uma brecha pra gente conversar?"
    ],
    emerging: [
      "Quer que a gente bata um papo sobre isso?",
      "Posso enviar detalhes e vocês veem?",
      "Tá interessado em explorar?",
      "Quer conversar sobre o próximo passo?",
      "Posso marcar um papo rápido?"
    ],
    needs_improvement: [
      "Quer que a gente explore como melhorar isso?",
      "Posso apresentar uma solução?",
      "Você se importaria de ouvir uma proposta?",
      "Quer conhecer como outros fazem?",
      "Bora conversar sobre isso?"
    ],
    struggling: [
      "Quer que a gente explore uma saída?",
      "Posso apresentar um projeto pra reversão?",
      "Você tá aberto a ouvir uma solução?",
      "Quer conversar sobre como virar o jogo?",
      "Posso enviar uma proposta pra vocês?"
    ],
    invisible: [
      "Quer conversar sobre como começar forte?",
      "Posso enviar um projeto inicial?",
      "Você se importaria de explorar uma estratégia?",
      "Quer ver como a gente pode ajudar?",
      "Bora conversar sobre o primeiro passo?"
    ]
  },

  // Encerro (closing)
  closings: [
    "Fico no aguardo! 🙌",
    "Deixo aqui meu contato qualquer dúvida!",
    "Que tal a gente conversa? 📱",
    "Fico na torcida pra gente trabalhar junto!",
    "Bora transformar isso em crescimento? 🚀",
    "Fico por aqui, mas quer conversar só chamar!"
  ]
};

// Funções helper
function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function replaceVariables(text, data) {
  return text
    .replace(/{{reviews}}/g, data.reviews)
    .replace(/{{rating}}/g, data.rating.toFixed(1))
    .replace(/{{category}}/g, data.category);
}

function selectPhrase(profile, type) {
  const phrases = phrasesPool[type];
  if (!phrases[profile]) {
    return getRandomItem(phrases.stable || phrases.established || []);
  }
  return getRandomItem(phrases[profile]);
}

module.exports = {
  phrasesPool,
  getRandomItem,
  replaceVariables,
  selectPhrase
};
