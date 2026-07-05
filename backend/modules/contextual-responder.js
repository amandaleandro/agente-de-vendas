/**
 * Gerador de Respostas Contextuais
 * Objetivo: Responder baseado NO QUE foi dito, não em template
 * Cada resposta é ÚNICA para aquela situação
 */

const semanticAnalyzer = require('./semantic-analyzer');

class ContextualResponder {
  constructor() {
    this.URL_DIAG = 'https://fechapro.com.br/diagnostico';
  }

  /**
   * Gera resposta totalmente contextual
   * Não é template, é construída dinamicamente
   */
  async gerarRespostaDinamica(textoCliente, historico = [], contextoCliente = {}) {
    // 1. ANALISAR o que cliente disse
    const analise = semanticAnalyzer.analisarTexto(textoCliente);
    const { estrategia, insights } = semanticAnalyzer.recomendarEstrategia(analise);

    // 2. DECIDIR que tipo de resposta dar
    let resposta = '';

    // ============================================
    // TIPOS DE RESPOSTA CONTEXTUALIZADAS
    // ============================================

    // Checa os sinais ESPECÍFICOS primeiro (o que o cliente disse) e só cai no
    // genérico se nada casar — assim "meus clientes somem" ou "30 por mês" viram
    // resposta contextual, não um pedido de detalhe genérico.

    // TIPO C: problema/dor específica (prioridade máxima — é o gancho de venda)
    if (analise.problema) {
      resposta = this.respostaParaProblema(analise, textoCliente);
    }
    // TIPO B: mencionou número/volume
    else if (analise.volume) {
      resposta = this.respostaParaVolume(analise, historico.length);
    }
    // TIPO D: mencionou ferramenta/concorrente
    else if (analise.ferramenta) {
      resposta = this.respostaParaFerramenta(analise);
    }
    // TIPO E: fez uma pergunta
    else if (analise.fezPergunta) {
      resposta = this.respostaParaPergunta(textoCliente, analise);
    }
    // TIPO F: mostrou frustração
    else if (analise.temNegativo) {
      resposta = this.respostaParaFrustracao(analise);
    }
    // TIPO G: mostrou interesse/positivo
    else if (analise.temPositivo) {
      resposta = this.respostaParaInteresse(analise);
    }
    // TIPO A: genérico de verdade -> pedir detalhe
    else if (analise.especificidade < 0.3) {
      resposta = this.respostaParaGenerico(analise);
    }
    // DEFAULT: aprofundar baseado em insights
    else {
      resposta = this.respostaDefault(insights);
    }

    return resposta;
  }

  /**
   * TIPO A: Cliente foi muito genérico - pedir detalhes específicos
   */
  respostaParaGenerico(analise) {
    // Não usa template, faz pergunta real baseado no que disse (ou não disse)
    const opcoes = [
      `Deixa eu entender melhor: o que é EXATAMENTE seu desafio agora? Me dá um exemplo concreto?`,
      `Ok, e qual é o impacto disso pra você - em números, quantas vendas você tá deixando de fazer?`,
      `Certo, qual é aquele detalhe que te tira sono à noite?`,
      `E qual é a tarefa que mais tira seu tempo?`
    ];
    return opcoes[Math.floor(Math.random() * opcoes.length)];
  }

  /**
   * TIPO B: Cliente mencionou volume - fazer contas
   */
  respostaParaVolume(analise) {
    const vol = parseInt(analise.volume) || 0;
    const periodo = analise.periodo || 'mês';

    // Resposta ESPECÍFICA baseada no número que ele falou
    if (vol > 50) {
      return `Uau, ${vol} por ${periodo}! Esse volume é considerável. Se você melhorasse em só 15%, seria ${Math.floor(vol * 0.15)} a mais. Quanto seria em receita?`;
    }

    if (vol > 20) {
      return `${vol} por ${periodo} é bom volume. Quantas delas viram vendas? Porque melhorar em 30% mudaria bastante.`;
    }

    if (vol > 10) {
      return `${vol} por ${periodo} é um bom começo. Das ${vol}, qual é a taxa de fechamento agora?`;
    }

    if (vol > 0) {
      return `${vol} é um volume interessante. Me diz: qual é o maior problema nesse processo?`;
    }

    return `Que volume você estava mencionando?`;
  }

  /**
   * TIPO C: Cliente mencionou problema ESPECÍFICO - validar e aprofundar
   */
  respostaParaProblema(analise, textoOriginal) {
    const problema = analise.problema;

    // Resposta ÚNICA para aquele problema específico
    if (problema.includes('cliente') && (problema.includes('some') || problema.includes('não responde'))) {
      return `Então o cliente some depois que você manda proposta. E quando ele suma, você tenta fazer follow-up ou fica perdido? Porque isso é o ponto-chave.`;
    }

    if (problema.includes('precio') || problema.includes('caro') || problema.includes('desconto')) {
      return `Cliente pede desconto. E quando pede, você consegue manter o preço ou cede? Porque dependendo disso muda completamente a estratégia.`;
    }

    if (problema.includes('tempo') || problema.includes('rápid')) {
      return `Então falta tempo. Especificamente, qual é a tarefa que mais tira tempo: fazer proposta, seguir cliente, ou organizar?`;
    }

    if (problema.includes('organiza') || problema.includes('processo') || problema.includes('sistema')) {
      return `Então é desorganização. Você não consegue controlar propostas, acompanhamento, ou as duas? Porque a solução é diferente.`;
    }

    // Default: validar o problema com seus próprios termos
    return `Então "${problema}" é o gargalo. Quando isso acontece, qual é o impacto direto pra você?`;
  }

  /**
   * TIPO D: Cliente mencionou ferramenta/concorrente
   */
  respostaParaFerramenta(analise) {
    const ferramenta = analise.ferramenta;

    // Resposta ESPECÍFICA para aquela ferramenta
    const comparacoes = {
      pipedrive: `Pipedrive é bom pro CRM, mas a dificuldade dele costuma ser o acompanhamento depois da proposta. Como você controla isso hoje?`,
      hubspot: `HubSpot é poderoso, mas pesado. O que você sente que falta nele?`,
      google: `Google Docs/Sheets é gratuito mas manual. Quanto tempo você gasta formatando?`,
      excel: `Excel é prático, mas consome muito tempo pra atualizar e acompanhar. É por aí?`
    };

    // Se tem comparação específica, usa
    for (const [ferr, resp] of Object.entries(comparacoes)) {
      if (ferramenta.toLowerCase().includes(ferr)) {
        return resp;
      }
    }

    // Default: entender insatisfação
    return `${ferramenta} tá ajudando, mas o que falta é... o quê exatamente?`;
  }

  /**
   * TIPO E: Cliente fez pergunta - responder REALMENTE a pergunta
   */
  respostaParaPergunta(textoOriginal, analise) {
    // Identifica o tipo de pergunta
    if (textoOriginal.includes('como')) {
      if (textoOriginal.includes('funciona')) {
        return `Simples: você manda proposta em 1 minuto, cliente vê no celular, assina ou nega. Você vê tudo - quem abriu, quanto leu, quando. Aí você sabe QUANDO fazer follow-up.`;
      }
      if (textoOriginal.includes('preço') || textoOriginal.includes('custa') || textoOriginal.includes('valor')) {
        return `Depende do volume que você faz. Antes de falar valor: seu gargalo hoje é montar a proposta ou o retorno do cliente depois?`;
      }
      return `Que pergunta específica você quer que eu responda?`;
    }

    if (textoOriginal.includes('quanto')) {
      return `Que quantidade você quer saber - propostas, custo, tempo, oportunidade?`;
    }

    if (textoOriginal.includes('funciona') && textoOriginal.includes('mesmo')) {
      return `Funciona sim. Em vez de eu te prometer, prefiro te mostrar na prática. Quer fazer um teste rápido?`;
    }

    return `Boa pergunta. Me detalha um pouco mais o que você quer saber?`;
  }

  /**
   * TIPO F: Cliente mostrou frustração - validar emoção
   */
  respostaParaFrustracao(analise) {
    const opcoes = [
      `Entendo sua frustração, isso é chato mesmo. Deixa eu tentar ajudar.`,
      `Faz total sentido se sentir assim. Boa parte de quem vende passa por isso.`,
      `Essa frustração que você tá sentindo, vem mais de qual parte: proposta, retorno do cliente ou fechamento?`,
      `Entendo. Me conta o que mais tá pesando aí que a gente vê junto.`
    ];
    return opcoes[Math.floor(Math.random() * opcoes.length)];
  }

  /**
   * TIPO G: Cliente mostrou interesse - acelerar
   */
  respostaParaInteresse(analise) {
    return `Show! Então você tá aberto a testar. Que tal você ver na prática? Aqui é rápido: ${this.URL_DIAG}`;
  }

  /**
   * DEFAULT: Usar insights para gerar pergunta
   */
  respostaDefault(insights) {
    if (insights.length === 0) {
      return `Me conta mais: qual é seu maior desafio no dia a dia?`;
    }

    // Gera pergunta baseado no insight mais relevante
    const insight = insights[0];

    switch (insight.tipo) {
      case 'volume_alto':
        return `Com esse volume (${insight.valor}), qual é a métrica mais importante pra você - taxa de conversão ou velocidade?`;

      case 'problema_especifico':
        return `Então "${insight.valor}" é o core. Se resolvesse só isso, quanto mudava pra você?`;

      case 'considerando_trocar':
        return `${insight.valor} não tá 100% certo? Qual é exatamente a parte que deixa a desejar?`;

      case 'orientado_por_metricas':
        return `${insight.valor}% é uma métrica importante. Como você chegou nesse número?`;

      case 'track_record':
        return `Você já ${insight.valor}? Qual é seu próximo objetivo?`;

      default:
        return `Entendi seu contexto. Qual é o próximo passo que você gostaria de dar?`;
    }
  }

  /**
   * Gera seguimento contextual - próxima pergunta já sabe o histórico
   */
  gerarSeguimento(textoCliente, historico = []) {
    const analise = semanticAnalyzer.analisarTexto(textoCliente);
    const perguntas = semanticAnalyzer.gerarPerguntas(analise);

    if (perguntas.length > 0) {
      return perguntas[0];
    }

    return 'E qual é seu próximo passo?';
  }

  /**
   * Gera resposta de CTA baseado no que cliente disse (não genérica)
   */
  gerarCTAContextual(analise, historico = []) {
    const volume = analise.volume ? parseInt(analise.volume) : 0;
    const temProblema = !!analise.problema;

    // Se cliente foi bem específico, CTA direto
    if (analise.especificidade > 0.7 && temProblema) {
      return `Então deixa eu resolver isso pra você. Testa aqui em 3 minutos: ${this.URL_DIAG}`;
    }

    // Se tem volume alto, apelar pro número
    if (volume > 30) {
      const ganho = Math.floor(volume * 0.3);
      return `Se você melhorasse em 30%, seriam ${ganho} a mais. Vale a pena testar: ${this.URL_DIAG}`;
    }

    // Se foi frustrado, CTA empático
    if (analise.temNegativo) {
      return `Deixa eu tirar esse peso. Vamos resolver isso: ${this.URL_DIAG}`;
    }

    // Default
    return `Vamos na prática ver como funciona: ${this.URL_DIAG}`;
  }
}

module.exports = new ContextualResponder();
