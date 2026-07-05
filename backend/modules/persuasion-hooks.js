/**
 * Sistema de Hooks Persuasivos
 * Objetivo: Capturar atenção cliente nos primeiros 2-3 turnos
 * Técnica: AIDA (Atenção → Interesse → Desejo → Ação)
 */

class PersuasionHooks {
  constructor() {
    // Fase 1: Atenção (primeiras mensagens)
    this.hooksAtencao = [
      // Gap de dor + pergunta
      {
        gatilho: 'apresentacao_novo',
        hooks: [
          `Deixa eu ser honesto: a maioria das pessoas que vende online tá deixando 30-40% de grana na mesa todo mês. Quer saber se você tá nesse grupo?`,
          `Tem uma coisa que descobre muito rápido quando você negocia: cliente que recebe proposta bem feita fecha 3x mais rápido. Você envia propostas como?`,
          `Aqui tá o padrão que vejo: venda perde não por preço, perde porque cliente não vê valor. Como é no seu caso?`
        ]
      }
    ];

    // Fase 2: Interesse (aprofundamento)
    this.hooksInteresse = [
      {
        tema: 'dor_some',
        hooks: [
          `Espera, deixa eu mapear seu problema: cliente some depois da proposta, certo? Isso tira quanto de você por mês em vendas perdidas?`,
          `Tá, então basicamente seu problema é: cliente não vê a urgência. Quantas vezes por semana isso acontece?`
        ]
      },
      {
        tema: 'dor_desconto',
        hooks: [
          `Entendo. Mas deixa eu virar a mesa: ao invés de cliente pedir desconto, e se ele IMPLORASSE pra contratar você? Como muda sua vida?`,
          `Aqui tá a real: cliente que pede desconto tá com dúvida. Manda bem na apresentação que some com desconto.`
        ]
      },
      {
        tema: 'volume_alto',
        hooks: [
          `Com seu volume, até 1% de melhoria no ciclo de venda dá quanto por mês? Vamos contar...`,
          `Se você conseguisse fechar só 2 vendas a mais por semana, quanto você faturava a mais no ano?`
        ]
      }
    ];

    // Fase 3: Desejo (visualizar resultado)
    this.hooksDesejo = [
      {
        trigger: 'tem_dor',
        hooks: [
          `Imagina só: você manda uma proposta, VIRA em tempo real saber quem abriu, quanto tempo leu, se tá perto de decidir... E você consegue fazer follow-up ANTES que ele desista.`,
          `Pensa comigo: qual seria seu faturamento mensal se 70% das propostas que você manda tivessem resposta?`,
          `Tem cliente que tá lendo sua proposta AGORA e você não sabe. É tipo deixar dinheiro na mesa mesmo.`
        ]
      }
    ];

    // Fase 4: Ação (CTA com urgência)
    this.hooksCTA = [
      {
        urgencia: 'alta',
        hooks: [
          `Bora testar? Tem um diagnóstico que leva 3 minutos e você vê exatamente quanto tá deixando de ganhar. ${this.URL_DIAGNOSTICO}`,
          `Testa aqui e depois a gente conversa: ${this.URL_DIAGNOSTICO}`,
          `Quer ver? Manda só seu melhor email aqui que eu gero um diagnóstico customizado pra você.`
        ]
      },
      {
        urgencia: 'media',
        hooks: [
          `Deixa eu te enviar um diagnóstico. Você vê onde tá perdendo grana e a gente conversa depois.`,
          `Quer testar como funciona? Aqui tem um exemplo que leva 2 minutos: ${this.URL_DIAGNOSTICO}`
        ]
      }
    ];

    this.URL_DIAGNOSTICO = 'https://fechapro.com.br/diagnostico';
    this.contador = new Map(); // Rastreia qual hook foi usado por telefone
  }

  /**
   * Seleciona hook baseado na fase e contexto
   */
  selecionarHook(fase, contexto = {}) {
    let hooksDisponiveis = [];

    switch (fase) {
      case 'apresentacao':
        hooksDisponiveis = this.hooksAtencao[0]?.hooks || [];
        break;
      case 'interesse':
        const temaEspecifico = contexto.tema || 'generico';
        const hooksTema = this.hooksInteresse.find(h => h.tema === temaEspecifico);
        hooksDisponiveis = hooksTema?.hooks || this.hooksInteresse[0].hooks;
        break;
      case 'desejo':
        hooksDisponiveis = this.hooksDesejo[0]?.hooks || [];
        break;
      case 'acao':
        const urgencia = contexto.urgencia || 'media';
        const hooksUrg = this.hooksCTA.find(h => h.urgencia === urgencia);
        hooksDisponiveis = hooksUrg?.hooks || this.hooksCTA[0].hooks;
        break;
    }

    if (hooksDisponiveis.length === 0) return null;

    // Rotaciona para não repetir
    const indice = Math.floor(Math.random() * hooksDisponiveis.length);
    return hooksDisponiveis[indice];
  }

  /**
   * Hook baseado em "Gap de Dor" - mostra o problema antes de vender
   * Técnica: Problema → Dor → Solução (não vende direto)
   */
  construirGapDeDor(problema, quantidadeEstimada) {
    const textoDor = `Deixa eu fazer uma contas rápida:

Se você tá perdendo ${quantidadeEstimada} vendas por mês por isso...
E cada venda te dá R$ 2.000...
Você tá deixando de ganhar ${quantidadeEstimada * 2000} por mês (${quantidadeEstimada * 2000 * 12} por ano).

Tá caro um sistema que custa R$ 297/mês né?`;

    return textoDor;
  }

  /**
   * Hook de curiosidade - faz cliente QUERER saber
   */
  criarCuriosidade(tema) {
    const curiosidades = {
      dor_some: `Sabe o que é engraçado? 73% dos clientes que desistem de uma proposta GOSTARIAM de ter comprado. Eles só perderam interesse no meio do processo.`,
      dor_desconto: `Aqui tá a real: cliente que negocia preço tá testando você. Se você ceder, ele SABE que o valor é menor.`,
      volume_alto: `Com seu volume, cada 1% de melhoria no fechamento = mais dinheiro que um funcionário novo ganhando.`,
      generico: `Tem um padrão que vejo em 90% dos vendedores que crescem: eles PARAM de mandar proposta cega. Entram em contato diferente.`
    };

    return curiosidades[tema] || curiosidades.generico;
  }

  /**
   * Hook de validação social - mostra que outros estão resolvendo
   */
  validacaoSocial() {
    const opcoes = [
      `Já ajudei mais de 500 vendedores a aumentar fechamento. A maioria percebe diferença em 7 dias.`,
      `Clientes dizem que é a mudança mais simples que fizeram e que mais impactou.`,
      `Tem gente usando que tava na mesma situação sua 90 dias atrás.`
    ];
    return opcoes[Math.floor(Math.random() * opcoes.length)];
  }

  /**
   * Hook de urgência - sem ser agressivo
   */
  criarUrgencia(tipo) {
    const urgencias = {
      temporal: `Cada dia que passa sem isso é um dia que você tá deixando grana na mesa.`,
      oportunidade: `Essa é a janela que você tem. Depois fica mais caro ou mais complicado.`,
      social: `Seus concorrentes já estão fazendo isso. Se esperar muito, eles saem na frente.`,
      valor: `Quanto mais tempo espera, mais vendas perde. Faz as contas.`
    };
    return urgencias[tipo] || urgencias.temporal;
  }

  /**
   * Sequência de hook para primeiras 3 mensagens (a mais crítica!)
   */
  sequenciaBoasVindas() {
    return {
      msg1: `Opa! Aqui é a Amanda. Rápido: quando você manda uma proposta, o cliente costuma responder rápido ou fica no silêncio?`,
      msg2_resposta_positiva: `Entendo. Basicamente você fecha a maioria? Se fosse 50% a mais rápido, quanto mudava pra você?`,
      msg2_resposta_negativa: `Pois é, comum demais. Deixa eu te mostrar algo que tá ajudando vendedor a fechar 40% mais rápido.`,
      cta: `Testa aqui que leva 3 min e você vê exatamente onde tá perdendo grana: ${this.URL_DIAGNOSTICO}`
    };
  }
}

module.exports = new PersuasionHooks();
