/**
 * Roteiro Dinâmico e Adaptativo
 * - Se adapta baseado em sentimento, contexto e etapa REAL (não máquina de estado)
 * - Oferece respostas baseadas em padrões que funcionam
 * - Muda tom conforme frustração do cliente
 */

const conversationContext = require('./conversation-context');
const sentimentAnalyzer = require('./sentiment-analyzer');
const learningManager = require('./learning-manager');
const persuasionHooks = require('./persuasion-hooks');
const engagementQuestions = require('./engagement-questions');
const conversionTiming = require('./conversion-timing');
const semanticAnalyzer = require('./semantic-analyzer');
const contextualResponder = require('./contextual-responder');

class RoteiroDinamico {
  constructor() {
    this.ultimasRespostasPorContato = new Map();
    this.URL_DIAGNOSTICO = 'https://fechapro.com.br/diagnostico';
    this.URL_COMPRA_ANUAL = 'https://fechapro.com.br/auth/signup?plan=annual';
  }

  async gerarRespostaDinamica(texto, telefone, identidade = { nome: 'Amanda' }, historicMensagens = []) {
    // 1. ANALISAR CONTEXTO ATUAL
    const analise = sentimentAnalyzer.analisarSentimento(texto);
    const perfil = conversationContext.analisarMensagensParaExtractPerfil(historicMensagens, telefone);
    const etapaReal = conversationContext.detectarEtapaReal(historicMensagens, telefone);
    const tema = conversationContext.detectarTemaPrincipal(historicMensagens);

    // 2. ANALISAR INTERESSE E TIMING
    const interesse = conversionTiming.avaliarInteresse(texto);
    const engajamentoScore = engagementQuestions.validarEngajamento(historicMensagens);
    const prontidaoCompra = conversionTiming.calcularProntidaoCompra({
      nivelInteresse: interesse.nivel,
      problemaIdentificado: perfil?.problema !== null,
      numeroMensagens: historicMensagens.length,
      engajamento: engajamentoScore,
      temValidacaoSocial: perfil?.objeccoes?.length > 0
    });

    // 3. VALIDAR SENTIMENTO E AJUSTAR RESPOSTA
    const estrategia = sentimentAnalyzer.recomendarEstrategia(
      analise.sentimento,
      analise.frustracaoLevel,
      analise.engajamento
    );

    // Se cliente frustrado, começar com validação
    if (analise.frustracaoLevel > 0.7) {
      const respostasValidacao = [
        `${perfil.nome ? `${perfil.nome}, ` : ''}entendo sua frustração. Realmente é chato quando isso acontece.`,
        `Eu entendo, isso é realmente complicado mesmo. Deixa eu ajudar você.`,
        `Faz total sentido se sentir frustrado com isso. Vamos resolver juntos.`
      ];
      const resposta = respostasValidacao[Math.floor(Math.random() * respostasValidacao.length)];
      learningManager.registrarInteracao(telefone, texto, 'resposta_validacao', resposta, 'validacao_emocional');
      return resposta;
    }

    // 3. ANALISAR SEMANTICAMENTE O QUE O CLIENTE DISSE (prioridade sobre qualquer template)
    const analiseSematica = semanticAnalyzer.analisarTexto(texto);
    let resposta = '';

    // PRIORIDADE 1: Se o cliente foi específico, responder ao que ele DISSE (mais natural).
    // Isso vem antes dos "padrões de sucesso" pra não devolver saudação genérica no meio da conversa.
    if (analiseSematica.especificidade > 0.4) {
      resposta = await contextualResponder.gerarRespostaDinamica(texto, historicMensagens, perfil);
    }
    // PRIORIDADE 2: Mensagem vaga -> usar padrão de sucesso conhecido (se houver e não repetir)
    else {
      const sugestao = sentimentAnalyzer.sugerirRespostaPorPadrao(tema);
      if (sugestao && sugestao.padrao.sucessos > 2 && !this.ehRespostaRepetida(telefone, sugestao.resposta)) {
        resposta = sugestao.resposta;
      } else if (historicMensagens.length <= 1 && etapaReal === 'apresentacao') {
        // Primeira mensagem: hook de boas-vindas
        resposta = persuasionHooks.sequenciaBoasVindas().msg1;
      } else {
        // Mesmo vaga, tentar contextual (pede detalhe de forma natural)
        resposta = await contextualResponder.gerarRespostaDinamica(texto, historicMensagens, perfil);
      }
    }

    // Garantir que não repete resposta
    if (this.ehRespostaRepetida(telefone, resposta)) {
      resposta = this.respostaGenericaFlexivel(perfil, analise);
    }

    this.registrarResposta(telefone, resposta);
    learningManager.registrarInteracao(telefone, texto, tema, resposta, etapaReal);

    return resposta;
  }

  respostaApresentacao(perfil, analise) {
    const opcoes = [
      `Opa! Aqui é ${perfil.nome || 'Amanda'}, do time do FechaPro. Qual é seu maior desafio no momento?`,
      `E aí! Qual é seu principal problema - é captar cliente, fazer proposta, ou fechar a venda mesmo?`,
      `Oi! O que mais te tira sono à noite no seu negócio?`
    ];
    return opcoes[Math.floor(Math.random() * opcoes.length)];
  }

  respostaExploracao(perfil, analise, tema) {
    if (analise.engajamento > 0.7) {
      return `Entendo. Você consegue me contar mais sobre como isso impacta seu negócio?`;
    } else if (analise.engajamento < 0.4) {
      return `Hmm, parece que não ficou claro. Qual é exatamente o seu maior gargalo?`;
    }
    return `E qual é o principal obstáculo - é o volume de propostas, o acompanhamento, ou fechar mais rápido?`;
  }

  respostaDorIdentificada(perfil, analise) {
    const opcoes = [
      `Então basicamente é isso - cliente some depois da proposta. Quantos orçamentos você costuma mandar por semana?`,
      `Entendo. Você consegue acompanhar quem abriu ou fica muito na mão mesmo?`,
      `Faz sentido. E você consegue saber em que ponto exatamente o cliente desiste?`
    ];
    return opcoes[Math.floor(Math.random() * opcoes.length)];
  }

  respostaEntendendoProduto(perfil, analise, textoOriginal) {
    const querExplicacao = textoOriginal.toLowerCase().includes('como');

    if (querExplicacao) {
      return `Simples: você cria propostas profissionais em 1 minuto. O cliente recebe, assina (ou nega). E você vê TUDO - quem abriu, quanto tempo leu, se assinou. Aí você sabe exatamente quando fazer follow-up.\n\nTesta aqui: ${this.URL_DIAGNOSTICO}`;
    }

    return `Basicamente resolve 3 coisas: propostas mais profissionais, acompanhamento automático, menos "vou pensar". Quer ver na prática? ${this.URL_DIAGNOSTICO}`;
  }

  respostaTratandoObjecao(perfil, analise) {
    // Se preço
    if (perfil.objeccoes?.includes('preço')) {
      return `Entendo que o investimento é consideração. Mas quantas vendas você deixa de fazer por mês por falta de acompanhamento? Geralmente o valor é bem menor.`;
    }

    // Se tempo
    if (perfil.objeccoes?.includes('tempo')) {
      return `Totalmente. Por isso o diagnóstico demora só 3 minutos. Depois você vê se vale a pena. ${this.URL_DIAGNOSTICO}`;
    }

    // Se já tem solução
    if (perfil.objeccoes?.includes('já_tem_solução')) {
      return `Faz sentido usar o que já tem. Mas quanto tempo por dia você gasta com acompanhamento? Porque a maioria das ferramentas foca em criar proposta, não em fechar a venda.`;
    }

    return `Qual é especificamente a barreira - é o valor, o tempo, ou você já tem uma solução?`;
  }

  respostaVendaPossivel(perfil, analise) {
    // Usa estratégia de CTA conforme tipo de cliente
    if (analise.engajamento < 0.4) {
      // Cliente tímido/desengajado
      return `Sem pressão nenhuma. Quer testar agora? ${this.URL_DIAGNOSTICO}`;
    }

    if (analise.frustracaoLevel > 0.6) {
      // Cliente com urgência/frustração
      return `Então bora resolver isso! Como você prefere - contrata agora ou quer testar primeiro?`;
    }

    // Cliente normal/positivo
    const opcoes = [
      `Show! Vamos nessa. ${this.URL_DIAGNOSTICO}`,
      `Perfeito! Qual plano você quer começar?`,
      `Ótimo! Quer testar ou já contrata?`
    ];
    return opcoes[Math.floor(Math.random() * opcoes.length)];
  }

  respostaGenericaFlexivel(perfil, analise) {
    // Se cliente tem interesse mas não comprou ainda
    if (analise.sentimento === 'positivo' && analise.engajamento > 0.6) {
      return `${perfil.nome ? `${perfil.nome}, ` : ''}qual é o próximo passo que você gostaria de dar?`;
    }

    // Se cliente desengajado
    if (analise.engajamento < 0.4) {
      return `Desculpa se estou chato demais. Qual é exatamente o seu maior problema agora?`;
    }

    // Default
    return `Entendi. E qual é a parte que mais te preocupa - é vender mais ou acompanhar melhor?`;
  }

  ehRespostaRepetida(telefone, resposta) {
    const historico = this.ultimasRespostasPorContato.get(telefone) || [];
    const respostaNormalizada = resposta
      .toLowerCase()
      .replace(/[?.!,;]/g, '')
      .trim()
      .substring(0, 80);

    return historico.some(r => {
      const rNormalizada = r
        .toLowerCase()
        .replace(/[?.!,;]/g, '')
        .trim()
        .substring(0, 80);
      return rNormalizada === respostaNormalizada;
    });
  }

  registrarResposta(telefone, resposta) {
    const historico = this.ultimasRespostasPorContato.get(telefone) || [];
    if (!this.ehRespostaRepetida(telefone, resposta)) {
      historico.push(resposta);
      if (historico.length > 50) historico.shift();
      this.ultimasRespostasPorContato.set(telefone, historico);
    }
  }

  limparHistorico(telefone) {
    this.ultimasRespostasPorContato.delete(telefone);
    conversationContext.limparPerfil(telefone);
  }
}

module.exports = new RoteiroDinamico();
