/**
 * Sistema de Timing de Oferta (CTA)
 * Objetivo: Oferecer no momento PERFEITO (nem cedo, nem tarde)
 * Técnica: Sinais de interesse + Prontidão para compra
 */

class ConversionTiming {
  constructor() {
    // Sinais de INTERESSE (quando começar a preparar)
    this.sinaisInteresse = {
      baixo: [
        'como funciona',
        'para que serve',
        'qual é o valor',
        'qual é o preço'
      ],
      medio: [
        'como você faz',
        'você consegue',
        'é possível',
        'funciona mesmo',
        'tô interessado'
      ],
      alto: [
        'quero testar',
        'manda o link',
        'como eu contrato',
        'quando começa',
        'preciso disso'
      ]
    };

    // Sinais de OBJEÇÃO (quando recuar, não oferecer)
    this.sinaisObjecao = [
      'não tenho tempo',
      'depois',
      'deixa pra depois',
      'vou pensar',
      'não sei se',
      'tô sem orçamento',
      'é caro'
    ];

    // Sinais de DESINTERESSE (quando parar)
    this.sinaisDesinteresse = [
      'não quero',
      'para aqui',
      'chega',
      'bloquear',
      'remover',
      'não serve',
      'já temos',
      'não preciso'
    ];

    // Sequência ideal de turnos até oferta
    this.sequenciaIdeal = [
      { turno: 1, acao: 'capture_attention', desc: 'Ganhar atenção com pergunta boa' },
      { turno: 2, acao: 'understand_problem', desc: 'Entender o problema específico' },
      { turno: 3, acao: 'validate_problem', desc: 'Validar que entendeu o problema' },
      { turno: 4, acao: 'show_value', desc: 'Mostrar por que isso importa (gap de dor)' },
      { turno: 5, acao: 'offer_cta', desc: 'Oferecer solução/link' }
    ];
  }

  /**
   * Avalia sinais de interesse do cliente
   */
  avaliarInteresse(texto) {
    const textoLower = texto.toLowerCase();

    // Verifica sinais de objeção
    if (this.sinaisObjecao.some(s => textoLower.includes(s))) {
      return { nivel: 'objecao', confianca: 0.8 };
    }

    // Verifica sinais de desinteresse
    if (this.sinaisDesinteresse.some(s => textoLower.includes(s))) {
      return { nivel: 'desinteresse', confianca: 0.9 };
    }

    // Verifica sinais de interesse alto
    if (this.sinaisInteresse.alto.some(s => textoLower.includes(s))) {
      return { nivel: 'alto', confianca: 0.85 };
    }

    // Verifica sinais de interesse médio
    if (this.sinaisInteresse.medio.some(s => textoLower.includes(s))) {
      return { nivel: 'medio', confianca: 0.7 };
    }

    // Verifica sinais de interesse baixo
    if (this.sinaisInteresse.baixo.some(s => textoLower.includes(s))) {
      return { nivel: 'baixo', confianca: 0.6 };
    }

    return { nivel: 'neutro', confianca: 0.3 };
  }

  /**
   * Calcula "Prontidão para Compra" (0-1)
   * Combinação de: interesse + etapa + histórico + engajamento
   */
  calcularProntidaoCompra(contexto = {}) {
    let score = 0;

    // Fator 1: Interesse (0-0.3)
    const nivelInteresse = contexto.nivelInteresse || 'neutro';
    const mapaInteresse = { alto: 0.3, medio: 0.2, baixo: 0.1, neutro: 0 };
    score += mapaInteresse[nivelInteresse] || 0;

    // Fator 2: Problema identificado (0-0.2)
    if (contexto.problemaIdentificado) score += 0.2;

    // Fator 3: Mensagens trocadas (0-0.2)
    if (contexto.numeroMensagens) {
      const turnos = Math.min(contexto.numeroMensagens / 10, 1); // Max 10 turnos
      score += Math.min(turnos * 0.2, 0.2);
    }

    // Fator 4: Engajamento do cliente (0-0.15)
    if (contexto.engajamento) {
      score += contexto.engajamento * 0.15;
    }

    // Fator 5: Validação social / Sinal urgência (0-0.15)
    if (contexto.temValidacaoSocial) score += 0.1;
    if (contexto.temUrgencia) score += 0.05;

    return Math.min(score, 1);
  }

  /**
   * ESTRATÉGIA DE CTA por nível de prontidão
   */
  obterEstrategiaCTA(prontidao, contexto = {}) {
    // TOO EARLY (< 0.4) - Não oferecer ainda
    if (prontidao < 0.4) {
      return {
        recomendacao: 'ESPERAR',
        mensagem: 'Ainda não é hora de oferecer',
        acao: 'Continuar aprofundando o problema / Fazer mais perguntas',
        exemplo: 'Como você acompanha esses clientes depois que manda a proposta?'
      };
    }

    // PREPARAR (0.4-0.6) - Começar a preparar para CTA
    if (prontidao < 0.6) {
      return {
        recomendacao: 'PREPARAR',
        mensagem: 'Começar a mostrar valor / criar gap de dor',
        acao: 'Mostrar impacto financeiro do problema / Curiosidade',
        exemplo: 'Se você fechasse 40% mais rápido, quanto você faturava a mais no ano?'
      };
    }

    // PRONTO (0.6-0.8) - Fazer CTA discreto
    if (prontidao < 0.8) {
      return {
        recomendacao: 'CTA_DISCRETO',
        mensagem: 'Oferecer de forma natural',
        acao: 'Oferecer diagnóstico/teste sem pressão',
        exemplo: `Deixa eu te enviar um diagnóstico rápido? Leva 3 minutos e você vê exatamente onde tá perdendo grana.`
      };
    }

    // MUITO PRONTO (> 0.8) - CTA agressivo
    return {
      recomendacao: 'CTA_AGRESSIVO',
      mensagem: 'Cliente muito interessado - fazer CTA forte',
      acao: 'Oferecer contração direto ou link de pagamento',
      exemplo: `Bora lá! Qual plano você quer começar com?`
    };
  }

  /**
   * Detecta o MELHOR momento para fazer CTA na conversa
   */
  detectarMelhorMomentoParaCTA(historico = []) {
    if (historico.length < 3) {
      return { momento: 'cedo_demais', turno: historico.length, recomendacao: 'Esperar mais' };
    }

    // Analisa últimas 3 trocas
    const ultimasTrocas = historico.slice(-3);
    const ultimaResposta = ultimasTrocas[ultimasTrocas.length - 1]?.text || '';

    // Sinais de prontidão
    const temPergunta = ultimaResposta.includes('?');
    const temPositivo = ultimaResposta.match(/sim|isso|certo|legal|interessant/i);
    const temNumero = ultimaResposta.match(/\d+/);

    // Scoring
    let scoreHorarioIdeal = 0;
    scoreHorarioIdeal += temPergunta ? 0.2 : 0;
    scoreHorarioIdeal += temPositivo ? 0.3 : 0;
    scoreHorarioIdeal += temNumero ? 0.2 : 0;

    if (scoreHorarioIdeal > 0.6) {
      return { momento: 'ideal', turno: historico.length, recomendacao: 'Fazer CTA AGORA' };
    }

    if (scoreHorarioIdeal > 0.3) {
      return { momento: 'bom', turno: historico.length, recomendacao: 'Fazer CTA em 1 turno' };
    }

    return { momento: 'aguardar', turno: historico.length, recomendacao: 'Não é o melhor momento' };
  }

  /**
   * Diferentes modelos de CTA por tipo de cliente
   */
  construirCTA(tipoCliente = 'generico', linkDiagnostico = '') {
    const CTAs = {
      generico: `Deixa eu te mostrar algo que pode mudar seu negócio. Testa aqui: ${linkDiagnostico}`,

      impaciente: `Saca só: ${linkDiagnostico}`,

      analista: `Aqui tem os dados: ${linkDiagnostico}. Você pode fazer suas próprias análises.`,

      descrente: `Sem compromisso. Só preenche lá e você vê o resultado. ${linkDiagnostico}`,

      premium: `Chama no vídeo call que eu gero um diagnóstico customizado? Pode ser hoje?`,

      procrastinador: `Abre agora que é rápido - 3 minutos mesmo. ${linkDiagnostico}`,

      ocupado: `Delega pra alguém: ${linkDiagnostico} (alguém do seu time consegue avaliar em 5 min)`
    };

    return CTAs[tipoCliente] || CTAs.generico;
  }

  /**
   * Validação: é seguro fazer CTA? Cliente vai abandonar?
   */
  ehSeguroFazerCTA(historico = [], contexto = {}) {
    const numeroMensagens = historico.length;
    const nivelInteresse = contexto.nivelInteresse || 'neutro';
    const engajamento = contexto.engajamento || 0;

    // Validações
    const temProblemaIdentificado = contexto.problemaIdentificado !== false;
    const clienteNaoDesinteressado = !contexto.temDesinteresse;
    const aPeloMenos3Turnos = numeroMensagens >= 3;
    const engajamentoOk = engajamento > 0.3;

    // Score
    let score = 0;
    if (temProblemaIdentificado) score += 1;
    if (clienteNaoDesinteressado) score += 1;
    if (aPeloMenos3Turnos) score += 1;
    if (engajamentoOk) score += 1;
    if (nivelInteresse !== 'neutro') score += 1;

    return {
      ehSeguro: score >= 3,
      score,
      validacoes: {
        temProblemaIdentificado,
        clienteNaoDesinteressado,
        aPeloMenos3Turnos,
        engajamentoOk,
        temInteresse: nivelInteresse !== 'neutro'
      }
    };
  }

  /**
   * Análise pós-abandono: por que cliente saiu?
   */
  analisarPorqueAbandonou(historico = []) {
    if (historico.length < 2) return { motivo: 'muito_cedo', dica: 'Cliente não teve chance' };

    const ultimaResposta = historico[historico.length - 1]?.text || '';
    const temObjec = this.sinaisObjecao.some(s => ultimaResposta.toLowerCase().includes(s));
    const temDesint = this.sinaisDesinteresse.some(s => ultimaResposta.toLowerCase().includes(s));

    if (temDesint) {
      return { motivo: 'desinteresse_explicito', dica: 'Cliente não quer - respeitar' };
    }

    if (temObjec) {
      return { motivo: 'objecao_nao_resolvida', dica: 'Havia objeção que não foi superada' };
    }

    // Se não respondeu mais
    return { motivo: 'timeout_silencio', dica: 'Cliente perdeu interesse no meio' };
  }
}

module.exports = new ConversionTiming();
