// Estratégia inteligente de vendas - Reconhece sinais e leva ao fechamento
class SalesStrategy {
  constructor() {
    this.sinaisCompra = {
      PERGUNTA_PRECO: {
        palavras: ['quanto', 'custa', 'preço', 'valor', 'investimento', 'acha que é caro', 'quanto é'],
        acao: 'APRESENTAR_PRECO',
        resposta: `Temos 2 planos:\n\n🟢 **PRESENÇA** (Proposta + Acompanhamento)\nR$ 109,90/mês ou R$ 697 (vitalício)\n\n🔥 **PERFORMANCE** (Tudo + Implantação Completa)\nR$ 347,90/mês ou R$ 2.597 (vitalício)\n\nQual faz mais sentido?`
      },
      PERGUNTA_COMO_FUNCIONA: {
        palavras: ['como funciona', 'como é', 'me mostra', 'como seria', 'funciona como'],
        acao: 'MOSTRAR_FUNCIONAMENTO',
        resposta: `O FechaPro é simples:\n1️⃣ Você cadastra seus serviços\n2️⃣ Cria propostas profissionais por link\n3️⃣ Acompanha quem abriu e quando\n4️⃣ Organiza o follow-up\n5️⃣ Fecha online\n\nMuito melhor que WhatsApp solto. Quer ver um plano em ação?`
      },
      QUAL_PLANO: {
        palavras: ['qual plano', 'qual é melhor', 'qual recomenda', 'qual escolho', 'qual combina'],
        acao: 'RECOMENDAR_PLANO',
        resposta: `Temos 2 planos:\n\n🟢 **PRESENÇA** (R$ 109,90/mês ou R$ 697 vitalício)\nPropostas por link + acompanhamento + histórico de clientes\n\n🔥 **PERFORMANCE** (R$ 347,90/mês ou R$ 2.597 vitalício)\nTudo + implantação COMPLETA pela nossa equipe\n\nQual faz mais sentido?`
      },
      PRONTO_COMPRAR: {
        palavras: ['topa', 'topada', 'topa sim', 'vou pegar', 'vou contratar', 'quero contratar', 'bora', 'manda', 'passa o link', 'quer dizer que'],
        acao: 'FECHAR_VENDA',
        resposta: `Perfeito! 🎉\n\n👉 Presença: https://fechapro.com.br/auth/signup?plan=presenca\n👉 Performance: https://fechapro.com.br/auth/signup?plan=performance\n\n✅ 7 dias de garantia. Reembolso integral se não gostar.`
      },
      PERGUNTA_PAGAMENTO: {
        palavras: ['como pago', 'pix', 'boleto', 'cartão', 'parcelado', 'forma de pagamento', 'aceita', 'como é pagamento', 'como funciona pagamento', 'pagamento', 'parcela'],
        acao: 'INFORMAR_PAGAMENTO',
        resposta: `Aceitamos:\n✅ Cartão de crédito\n✅ Pix\n✅ Transferência bancária\n\nTudo seguro no checkout.\n\nQual plano você prefere: Presença ou Performance?`
      }
    };
  }

  detectarSinal(texto) {
    if (!texto) return null;

    const textoNorm = String(texto)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9\s]/g, '');

    for (const [tipo, sinal] of Object.entries(this.sinaisCompra)) {
      for (const palavra of sinal.palavras) {
        if (textoNorm.includes(palavra.toLowerCase())) {
          return {
            tipo,
            acao: sinal.acao,
            resposta: sinal.resposta
          };
        }
      }
    }

    return null;
  }

  // Estratégia de transição entre etapas
  obterProximoPassoEstrategico(etapaAtual, leadData) {
    const estrategia = {
      'LEAD_NOVO': {
        passa_para: 'QUALIFICACAO',
        agressividade: 'ALTA',
        objetivo: 'Qualificar em 2-3 mensagens máximo'
      },
      'QUALIFICACAO': {
        passa_para: 'DIAGNOSTICO',
        agressividade: 'ALTA',
        objetivo: 'Se tem dor clara, ofereça diagnóstico'
      },
      'DIAGNOSTICO': {
        passa_para: 'PLANO_RECOMENDADO',
        agressividade: 'ALTA',
        objetivo: 'Recomende com confiança (não pergunte)'
      },
      'PLANO_RECOMENDADO': {
        passa_para: 'FECHAMENTO',
        agressividade: 'MUITO_ALTA',
        objetivo: 'Quando cliente interesse, VENDA SEM HESITAR'
      },
      'FECHAMENTO': {
        passa_para: 'CLIENTE',
        agressividade: 'EXTREMA',
        objetivo: 'Envie link. Feche. Pronto.'
      }
    };

    return estrategia[etapaAtual] || { agressividade: 'MEDIA', objetivo: 'Continuar' };
  }

  // Verifica se está na hora de vender
  deveVender(leadData, numeroMensagens) {
    const condicoes = [
      leadData.nome,
      leadData.segmento,
      leadData.principal_dor && leadData.principal_dor !== 'NAO_IDENTIFICADA',
      numeroMensagens >= 2  // Após 2-3 mensagens, se tem contexto, venda
    ];

    return condicoes.filter(c => c).length >= 3;
  }

  // Cria resposta agressiva focada em venda
  criarRespostaVendaAgressiva(leadData, objetivoAtual) {
    const dor = leadData.principal_dor;

    const mensagens = {
      'CLIENTE_DESAPARECE': `Você está perdendo vendas porque não acompanha. Ponto.\n\nPlano PRESENÇA (R$ 109,90/mês): mostra quem abriu, quando abriu, histórico completo. Você retorna certo.\n\nQuer começar?`,
      'FALTA_ORGANIZACAO': `Sua vida: receber → mandar preço → perder da memória.\n\nPlano PERFORMANCE (R$ 347,90/mês): nossa equipe configura TUDO. Fica profissional e organizado.\n\nBora?`,
      'DIFICULDADE_FECHAR': `Você qualifica bem mas não fecha.\n\nFechaPro organiza proposta, aceite, contrato e pagamento em UM lugar. Cliente clica e tá fechado.\n\nPerformance ou Presença?`,
      'AQUISICAO_CLIENTE': `Seu ticket é alto. Paga uma vez (vitalício) e rentabiliza rápido.\n\nPresença: R$ 697 (vitalício)\nPerformance: R$ 2.597 (vitalício)\n\nQual você escolhe?`
    };

    return mensagens[dor] || `FechaPro organiza sua venda do 1º contato ao pagamento.\n\nPresença (R$ 109,90/mês) ou Performance (R$ 347,90/mês)?`;
  }
}

module.exports = SalesStrategy;
