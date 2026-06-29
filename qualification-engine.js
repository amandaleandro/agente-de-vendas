// Engine de Qualificação Inteligente e Agressiva
class QualificationEngine {
  constructor() {
    this.perguntas = {
      COMO_VENDE: {
        ordem: 1,
        pergunta: `Como seus clientes normalmente chegam até você?\n\n1️⃣ Google/buscas\n2️⃣ Instagram/redes sociais\n3️⃣ Indicação de amigos\n4️⃣ Ligação/WhatsApp direto`,
        palavrasCodigo: ['google', 'busca', 'instagram', 'rede', 'indicação', 'amigo', 'whatsapp', 'ligação']
      },
      COMO_ENVIA_ORCAMENTO: {
        ordem: 2,
        pergunta: `Quando o cliente quer saber mais sobre o serviço, você:\n\n1️⃣ Manda preço direto no WhatsApp\n2️⃣ Faz uma proposta em Word/PDF\n3️⃣ Já usa algum sistema\n4️⃣ Marca uma reunião pessoalmente`,
        palavrasCodigo: ['whatsapp', 'word', 'pdf', 'sistema', 'reunião', 'pessoal', 'link']
      },
      TICKET_MEDIO: {
        ordem: 3,
        pergunta: `E qual é o valor médio de uma venda sua?\n\n1️⃣ Até R$ 1 mil\n2️⃣ R$ 1-5 mil\n3️⃣ R$ 5-20 mil\n4️⃣ Acima de R$ 20 mil`,
        palavrasCodigo: ['1000', '1k', '5000', '5k', '10000', '10k', '20000', '20k', 'mil']
      },
      PRINCIPAL_DIFICULDADE: {
        ordem: 4,
        pergunta: `Qual é seu MAIOR problema agora?\n\n1️⃣ Propostas que mando ficam perdidas\n2️⃣ Não consigo saber quem tem interesse\n3️⃣ Dificuldade em fechar a venda\n4️⃣ Muita desorganização`,
        palavrasCodigo: ['perdidas', 'interesse', 'fechar', 'organização', 'sabe', 'interesse', 'proposta']
      }
    };

    this.urgencia = {
      MUITO_ALTA: {
        minutos: 1, // Respondeu imediatamente
        comportamento: ['topa', 'topada', 'passa', 'manda', 'link', 'como funciona', 'tá bom'],
        estrategia: 'FECHE IMEDIATAMENTE'
      },
      ALTA: {
        minutos: 5, // Respondeu rápido
        comportamento: ['qual', 'preço', 'como', 'quanto', 'serve', 'funciona'],
        estrategia: 'RECOMENDE E OFEREÇA LINK'
      },
      MEDIA: {
        minutos: 30, // Respondeu em tempo normal
        comportamento: ['entendi', 'legal', 'interessante', 'talvez', 'vou pensar'],
        estrategia: 'OFEREÇA DIAGNÓSTICO'
      },
      BAIXA: {
        minutos: 120, // Respondeu lento ou curto
        comportamento: ['ok', 'tá', 'pode ser', 'depois', 'vou ver'],
        estrategia: 'OFEREÇA DEMO + ENVIE LINK'
      }
    };
  }

  // Detecta qual pergunta fazer baseado no que já sabe
  obterProximaPergunta(leadData) {
    const perguntas = Object.values(this.perguntas)
      .sort((a, b) => a.ordem - b.ordem);

    for (const p of perguntas) {
      // Se já tem essa info, pula
      const chave = p.ordem === 1 ? 'como_encontra' :
                    p.ordem === 2 ? 'como_envia_orcamento' :
                    p.ordem === 3 ? 'ticket_medio' :
                    'principal_dor';

      if (!leadData[chave] || leadData[chave] === 'NAO_IDENTIFICADA') {
        return p;
      }
    }

    return null; // Já qualificou tudo
  }

  // LÓGICA CRÍTICA: Reconhece urgência e ajusta estratégia
  reconhecerUrgencia(texto, tempoRespostaMs) {
    const textoLower = String(texto || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');

    // Quanto mais rápido responde, mais urgência
    let urgencia = 'MEDIA';

    if (tempoRespostaMs && tempoRespostaMs < 2 * 60 * 1000) { // Menos de 2 min
      urgencia = 'MUITO_ALTA';
    } else if (tempoRespostaMs && tempoRespostaMs < 10 * 60 * 1000) { // Menos de 10 min
      urgencia = 'ALTA';
    } else if (tempoRespostaMs && tempoRespostaMs > 60 * 60 * 1000) { // Mais de 1 hora
      urgencia = 'BAIXA';
    }

    // Palavras-chave aumentam urgência
    const palavrasAltaUrgencia = ['topa', 'passa', 'link', 'manda', 'agora', 'rápido', 'já', 'urgente'];
    if (palavrasAltaUrgencia.some(p => textoLower.includes(p))) {
      urgencia = 'MUITO_ALTA';
    }

    // Palavras que diminuem urgência
    const palavrasBaixaUrgencia = ['depois', 'pensar', 'vou ver', 'não agora', 'talvez', 'pode ser'];
    if (palavrasBaixaUrgencia.some(p => textoLower.includes(p))) {
      urgencia = 'BAIXA';
    }

    return urgencia;
  }

  // Baseado em URGÊNCIA, retorna estratégia diferente
  obterEstrategiaVendaPorUrgencia(urgencia, leadData) {
    const estrategias = {
      MUITO_ALTA: {
        acao: 'FECHAR_IMEDIATAMENTE',
        mensagem: `Perfeito! Vou mandar o link agora.\n\n👉 ${this.obterLinkPorTicket(leadData.ticket_medio)}\n\nTem 7 dias de garantia!`,
        proximoContato: null
      },
      ALTA: {
        acao: 'RECOMENDAR_E_OFERECER_LINK',
        mensagem: null, // Vem do chatbot-manager
        proximoContato: 30 * 60 * 1000 // Se não responder em 30 min, retorna
      },
      MEDIA: {
        acao: 'OFERECER_DIAGNOSTICO',
        mensagem: `Entendi. Antes de indicar um plano, vamos descobrir onde seu processo está travando.\n\n👉 Diagnóstico gratuito (3 min): https://fechapro.com.br/diagnostico`,
        proximoContato: 2 * 60 * 60 * 1000 // 2 horas
      },
      BAIXA: {
        acao: 'SEGURAR_E_RETOMAR',
        mensagem: `Tudo bem! Qualquer dúvida, é só chamar. Temos uma demo curta que vale a pena ver.`,
        proximoContato: 24 * 60 * 60 * 1000 // 24 horas
      }
    };

    return estrategias[urgencia] || estrategias.MEDIA;
  }

  // Qualificar ticket e determinar melhor plano
  qualificarTicket(texto) {
    const textoLower = String(texto || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');

    if (textoLower.includes('1000') || textoLower.includes('1k') || textoLower.includes('mil')) {
      return 'ATE_1K';
    }
    if (textoLower.includes('5000') || textoLower.includes('5k')) {
      return 'ATE_5K';
    }
    if (textoLower.includes('10000') || textoLower.includes('10k') ||
        textoLower.includes('20000') || textoLower.includes('20k')) {
      return 'ATE_20K';
    }
    if (textoLower.includes('acima') || textoLower.includes('maior') ||
        textoLower.includes('mais de 20')) {
      return 'ACIMA_20K';
    }

    return null;
  }

  // Recomenda plano baseado no TICKET
  obterPlanoRecomendado(ticket, dor) {
    // Ticket alto = PERFORMANCE sempre
    if (ticket === 'ACIMA_20K' || ticket === 'ATE_20K') {
      return {
        plano: 'PERFORMANCE',
        preco: 'R$ 347,90/mês ou R$ 2.597 (vitalício)',
        motivo: 'Seu ticket alto rentabiliza rápido com a estrutura completa.'
      };
    }

    // Ticket médio = PRESENÇA é bom também
    if (ticket === 'ATE_5K') {
      return {
        plano: 'PRESENÇA',
        preco: 'R$ 109,90/mês ou R$ 697 (vitalício)',
        motivo: 'Você recupera 1 venda e já paga 6 meses.'
      };
    }

    // Default baseado em dor
    if (dor === 'FALTA_ORGANIZACAO' || dor === 'DIFICULDADE_FECHAR') {
      return {
        plano: 'PERFORMANCE',
        preco: 'R$ 347,90/mês',
        motivo: 'Você precisa de estrutura completa + implantação.'
      };
    }

    return {
      plano: 'PRESENÇA',
      preco: 'R$ 109,90/mês',
      motivo: 'Ótimo para começar.'
    };
  }

  obterLinkPorTicket(ticket) {
    // Ticket alto = Performance
    if (ticket === 'ACIMA_20K' || ticket === 'ATE_20K') {
      return 'https://fechapro.com.br/auth/signup?plan=performance';
    }
    // Default = Presença
    return 'https://fechapro.com.br/auth/signup?plan=presenca';
  }

  // Determina quando fazer follow-up
  agendaFollowUp(leadData, ultimaResposta, urgencia) {
    const agora = Date.now();
    const tempoSemResposta = agora - ultimaResposta;

    const followUps = {
      MUITO_ALTA: null, // Fechar agora, sem follow-up
      ALTA: tempoSemResposta > 30 * 60 * 1000 ? {
        tipo: 'REATIVACAO',
        mensagem: `Oi! Só pra confirmar: recebeu a recomendação anterior? Ficou alguma dúvida?`
      } : null,
      MEDIA: tempoSemResposta > 2 * 60 * 60 * 1000 ? {
        tipo: 'LEMBRETE_DIAGNOSTICO',
        mensagem: `E aí? Conseguiu fazer o diagnóstico? Se tiver dúvida, posso analisar junto com você.`
      } : null,
      BAIXA: tempoSemResposta > 24 * 60 * 60 * 1000 ? {
        tipo: 'RETOMADA',
        mensagem: `Opa! Espera aí, antes você demonstrou interesse. Qual foi a maior dúvida? Posso resolver agora.`
      } : null
    };

    return followUps[urgencia];
  }
}

module.exports = QualificationEngine;
