/**
 * Sistema de Perguntas que Engajam
 * Objetivo: Fazer cliente RESPONDER (não abandonar conversa)
 * Técnica: Perguntas abertas que criam curiosidade + validação
 */

class EngagementQuestions {
  constructor() {
    // Perguntas por etapa que ENGAJAM (não são forçadas)
    this.perguntasAprofundamento = {
      apresentacao: [
        // Abertas, não yes/no
        `Como é seu processo agora quando precisa fechar uma venda?`,
        `Qual é seu maior desafio no momento?`,
        `Como você acompanha um cliente depois que manda a proposta?`,
        `Se você pudesse resolver UM problema agora, qual seria?`,
        `Como você sabe se um cliente tá perto de decidir ou se desistiu?`
      ],

      dor_some: [
        // Aprofundando o problema
        `Quando o cliente some, você consegue fazer follow-up ou fica tudo perdido?`,
        `Quantos clientes que desistem você consegue trazer de volta?`,
        `Se soubesse em tempo real quando o cliente tá lendo a proposta, mudaria sua estratégia?`,
        `Qual foi a venda que você QUASE fechou mas perdeu por não fazer follow-up na hora certa?`,
        `Você consegue medir quantas propostas vira vendas?`
      ],

      dor_desconto: [
        // Entender a dor de verdade
        `Quando o cliente pede desconto, você cede ou consegue vender o valor?`,
        `Qual é seu desconto máximo que você ainda fatura bem?`,
        `Você acha que o cliente pede desconto porque não vê valor ou por hábito?`,
        `Como muda para você se cliente para de pedir desconto?`,
        `Quantas vezes por mês você precisa fazer desconto?`
      ],

      volume_alto: [
        // Explorar oportunidade
        `Com esse volume, qual é sua maior dificuldade - tempo ou organização?`,
        `Você tem processo padronizado ou cada proposta é diferente?`,
        `Se você conseguisse fazer 10 propostas no tempo que faz 5 agora, o que muda?`,
        `Como você prioriza qual cliente acompanhar primeiro?`,
        `Qual é o seu ciclo médio de venda agora?`
      ],

      interesse_alto: [
        // Cliente já interessado - aprofundar
        `Qual é sua principal dúvida sobre como funciona?`,
        `Qual é a funcionalidade que você MAIS quer?`,
        `Quando você poderia testar? Próxima semana?`,
        `Se funcionasse como você espera, qual seria seu próximo passo?`,
        `O que ainda falta para você bater o botão?`
      ]
    };

    // Perguntas de validação (confirma o problema)
    this.perguntasValidacao = [
      `Tá, então deixa eu ver se entendi direito...`,
      `Basicamente o que você tá me falando é...`,
      `Se eu entendi bem, o problema é...`,
      `Ou seja, o desafio principal é...`,
      `Me confirma se tô certo...`
    ];

    // Perguntas de "descoberta" (curiosidade)
    this.perguntasDescoberta = [
      `Que estatística interessante que você compartilhasse o número exato?`,
      `Qual foi o maior prejuízo que você viu isso causar?`,
      `Se você pudesse mudar uma coisa no seu processo, qual seria?`,
      `Que resultado você gostaria de ter em 30 dias?`,
      `Como seria seu negócio ideal?`
    ];

    // Perguntas de rejeição (para qualificar)
    this.perguntasRejeicao = [
      `Qual é a sua real preocupação - é investimento, é mudança de processo, ou é algo mais?`,
      `Tá, e se eu resolvesse essa preocupação, você toparia testar?`,
      `Qual seria o cenário perfeito para você dizer "sim"?`,
      `O que te faz hesitar?`,
      `Se não for isso, qual é o real bloqueio?`
    ];

    // Sequências de perguntas (threading - uma leva à outra)
    this.threadingSequences = {
      volume: [
        { q: `Quantos orçamentos você manda por semana?`, next_trigger: 'resposta' },
        { q: `E desses, quantos se tornam vendas?`, next_trigger: 'resposta' },
        { q: `Qual é seu tempo médio de resposta do cliente?`, next_trigger: 'resposta' },
        { q: `Se reduzisse esse tempo pela metade, quanto a mais você fechava?`, next_trigger: 'reflexao' }
      ],
      seguimento: [
        { q: `Quando você faz follow-up, como você faz?`, next_trigger: 'resposta' },
        { q: `E o cliente costuma responder?`, next_trigger: 'resposta' },
        { q: `Qual é seu padrão - você liga, manda mensagem, ou espera ele responder?`, next_trigger: 'resposta' },
        { q: `Se você soubesse QUANDO fazer follow-up (não cego), mudava?`, next_trigger: 'reflexao' }
      ]
    };
  }

  /**
   * Seleciona pergunta baseado na etapa (não repetindo)
   */
  selecionarPerguntaAprofundamento(etapa, historico = []) {
    const perguntasDisponiveis = this.perguntasAprofundamento[etapa] || [];

    if (perguntasDisponiveis.length === 0) return null;

    // Filtra perguntas já feitas
    const usadas = historico.filter(h =>
      perguntasDisponiveis.some(p =>
        p.toLowerCase().includes(h.toLowerCase().substring(0, 30))
      )
    );

    const disponiveis = perguntasDisponiveis.filter(p =>
      !usadas.some(u => p.toLowerCase().includes(u.toLowerCase().substring(0, 30)))
    );

    if (disponiveis.length === 0) {
      // Se todas foram usadas, volta ao pool
      return perguntasDisponiveis[Math.floor(Math.random() * perguntasDisponiveis.length)];
    }

    return disponiveis[Math.floor(Math.random() * disponiveis.length)];
  }

  /**
   * Pergunta de validação com intenção
   */
  perguntarValidacao(resumoDoProblem) {
    const prefixo = this.perguntasValidacao[Math.floor(Math.random() * this.perguntasValidacao.length)];
    return `${prefixo} ${resumoDoProblem}?`;
  }

  /**
   * Pergunta que cria FOMO/curiosidade
   */
  perguntarCuriosidade(tema) {
    const descoberta = this.perguntasDescoberta[Math.floor(Math.random() * this.perguntasDescoberta.length)];

    if (tema === 'volume') {
      return `${descoberta} Porque se você tá mandando 30 propostas por mês mas só fecha 5, tá perdendo dinheiro em 25 propostas ruins.`;
    }
    if (tema === 'seguimento') {
      return `${descoberta} Porque cliente que some depois de proposta = dinheiro na mesa que você não vê.`;
    }

    return descoberta;
  }

  /**
   * Pergunta para qualificar objeção
   */
  qualificarObjecao(objecao) {
    const pergunta = this.perguntasRejeicao[Math.floor(Math.random() * this.perguntasRejeicao.length)];
    return pergunta;
  }

  /**
   * Sequência de threading (uma pergunta leva a outra)
   */
  obterProximaPerguntaThreading(tema, indiceAtual = 0) {
    const sequencia = this.threadingSequences[tema];
    if (!sequencia || indiceAtual >= sequencia.length) return null;
    return sequencia[indiceAtual];
  }

  /**
   * Validação de engajamento - cliente está respondendo bem?
   */
  validarEngajamento(historico) {
    if (!historico || historico.length < 2) return 0;

    let score = 0;

    // Conta respostas do cliente
    const respostasCliente = historico.filter(m => !m.fromMe);
    score += respostasCliente.length * 0.15;

    // Tamanho médio das respostas
    const tamanhoMedio = respostasCliente.reduce((sum, m) => sum + (m.text?.length || 0), 0) / respostasCliente.length;
    if (tamanhoMedio > 30) score += 0.2; // Respostas maiores = mais engajado

    // Perguntas do cliente = sinal de interesse
    const perguntasCliente = respostasCliente.filter(m => m.text?.includes('?')).length;
    score += perguntasCliente * 0.15;

    // Palavras-chave positivas
    const positivas = ['sim', 'isso', 'exatamente', 'verdade', 'legal', 'interessante', 'quero', 'como'];
    const temPositivas = respostasCliente.some(m => positivas.some(p => m.text?.toLowerCase().includes(p)));
    if (temPositivas) score += 0.3;

    return Math.min(score, 1);
  }

  /**
   * Recomendação de próximo passo baseado em engajamento
   */
  recomendarProximoPasso(engajamento, etapa) {
    if (engajamento > 0.7) {
      return {
        acao: 'oferecer_cta',
        urgencia: 'alta',
        mensagem: 'Cliente está muito engajado - oferecer link/demonstração agora'
      };
    }

    if (engajamento > 0.4) {
      return {
        acao: 'aprofundar',
        urgencia: 'media',
        mensagem: 'Cliente interessado mas precisa entender mais - fazer mais perguntas'
      };
    }

    return {
      acao: 'reengajar',
      urgencia: 'alta',
      mensagem: 'Cliente desengajado - mudar tática, usar curiosidade/validação social'
    };
  }
}

module.exports = new EngagementQuestions();
