/**
 * Analisador Semântico Avançado
 * Objetivo: ENTENDER realmente o que cliente está dizendo
 * Extrai informações específicas e contextuais
 */

class SemanticAnalyzer {
  constructor() {
    // Padrões de extração
    this.patterns = {
      // Negócio/Profissão
      negocio: /(?:sou|trabalho|faço|tenho|gerencio|administro)\s+(?:uma\s+)?([a-záàâãéèêíïóôõöúçñ\s]+?)(?:\.|,|mas|e|que)/i,

      // Números/Volumes — pega "mando uns 30", "30 orçamentos por mês", "uns 20 por semana"
      volume: /(?:(?:mando|faço|envio|realizo|processo|vendo|fecho|tenho)\s+(?:uns|umas|aproximadamente|cerca de|mais de|menos de)?\s*(\d+))|(?:\b(\d+)\s+(?:propostas|orçamentos|orcamentos|vendas|leads|clientes|contratos|obras)\b)/i,

      // Período de tempo
      periodo: /(?:por\s+)?(?:dia|semana|mês|ano)s?/i,

      // Problema específico
      problema: /(?:problema|dificuldade|desafio|gargalo|dor|issue|empecilho|obstáculo|duvida)\s+(?:é|tá|está)\s+([a-záàâãéèêíïóôõöúçñ\s]+?)(?:\.|,|mas|\?)?/i,

      // Taxa/Percentual
      taxa: /(\d+)(?:%|porcento|por\s+cento)/i,

      // Valor/Investimento
      valor: /(?:custa|vale|preço|investimento|quanto|cobram)\s+(?:uns\s+)?(?:R\$\s+)?(\d+[.,]\d+|\d+)/i,

      // Ferramenta/Concorrente — pula artigo (o/a/um) e captura o nome real da ferramenta
      ferramenta: /(?:uso|tenho|usamos|usando)\s+(?:o|a|um|uma)?\s*(excel|planilhas?|pipedrive|hubspot|rd station|google\s+\w+|notion|trello|crm|caderno|whatsapp|agenda|word)\b/i,

      // Métrica de sucesso
      resultado: /(?:fechei?|vendi|conquistei|consegui)\s+(?:uns|cerca de|aproximadamente|mais de)?\s*(\d+)(?:\s+)?(?:vendas|clientes|leads|deals)/i,

      // Tempo/Processo
      duracao: /(?:leva|demora|gasta|toma)\s+(?:uns\s+)?(\d+)(?:\s+)?(?:minutos|horas|dias|semanas)/i,

      // Satisfação/Emoção
      satisfacao: /(?:gosto|amo|adoro|bom|legal|ótimo|perfeito|excelente)/i,
      insatisfacao: /(?:odeio|chato|ruim|horrível|péssimo|frustra|cansado|irritado|problema)/i
    };

    // Dores comuns ditas em linguagem natural (sem "problema é ..."), mapeadas para uma dor canônica
    this.doresComuns = [
      { re: /\bcliente(s)?\s+(some|somem|sumiu|sumem|desaparece|desaparecem)\b/i, dor: 'cliente some depois do orçamento' },
      { re: /\b(não|nao|nunca)\s+(responde|respondem|retorna|retornam|da retorno|dá retorno)\b/i, dor: 'cliente não responde' },
      { re: /\b(perco|perdi|perde|perdemos)\s+(venda|vendas|cliente|clientes)\b/i, dor: 'perde venda por falta de retorno' },
      { re: /\b(fica|ficam|fico)\s+(no vácuo|no vacuo|sem resposta)\b/i, dor: 'cliente some depois do orçamento' },
      { re: /\b(demora|demoro|lento|devagar|muito tempo)\b/i, dor: 'demora no processo' },
      { re: /\b(desorganiz|bagunç|bagunc|perdido|sem controle)\w*/i, dor: 'processo desorganizado' },
      { re: /\b(follow[\s-]?up|acompanha\w*)\b/i, dor: 'dificuldade de acompanhamento' }
    ];
  }

  detectarDorComum(texto) {
    for (const item of this.doresComuns) {
      if (item.re.test(texto)) return item.dor;
    }
    return null;
  }

  detectarPeriodo(texto) {
    const m = String(texto || '').match(/\b(dia|semana|m[eê]s|ano)s?\b/i);
    if (!m) return null;
    const p = m[1].toLowerCase();
    return p.startsWith('m') ? 'mês' : p;
  }

  /**
   * Análise completa do texto do cliente
   */
  analisarTexto(texto) {
    if (!texto) return { original: texto, analise: {} };

    const analise = {
      texto_original: texto,
      tamanho: texto.length,
      palavras: texto.split(/\s+/).length,

      // Extrações
      negocio: this.extrairPadrao(texto, 'negocio'),
      volume: this.extrairVolume(texto),
      periodo: this.detectarPeriodo(texto),
      // problema: regex clássico OU dor comum dita em linguagem natural
      problema: this.extrairPadrao(texto, 'problema') || this.detectarDorComum(texto),
      taxa: this.extrairPadrao(texto, 'taxa'),
      valor: this.extrairPadrao(texto, 'valor'),
      ferramenta: this.extrairPadrao(texto, 'ferramenta'),
      resultado: this.extrairPadrao(texto, 'resultado'),
      duracao: this.extrairPadrao(texto, 'duracao'),

      // Sentimento
      temPositivo: this.patterns.satisfacao.test(texto),
      temNegativo: this.patterns.insatisfacao.test(texto) || this.detectarDorComum(texto) !== null,

      // Indicadores de interesse
      fezPergunta: texto.includes('?'),
      citouNumeros: /\d+/.test(texto)
    };

    // Qualidade de resposta esperada — depende dos sinais fortes já extraídos
    analise.especificidade = this.calcularEspecificidade(analise);
    analise.explicouProblem = analise.problema !== null;

    return analise;
  }

  // Extrai o número de volume de qualquer um dos grupos do regex
  extrairVolume(texto) {
    const m = String(texto || '').match(this.patterns.volume);
    if (!m) return null;
    return (m[1] || m[2] || '').trim() || null;
  }

  /**
   * Extrai padrão do texto
   */
  extrairPadrao(texto, tipo) {
    const pattern = this.patterns[tipo];
    if (!pattern) return null;

    const match = texto.match(pattern);
    if (!match) return null;

    return match[1]?.trim() || match[0]?.trim() || null;
  }

  /**
   * Calcula quão específica é a mensagem do cliente (0 = genérica, 1 = muito específica).
   * Recebe a análise já extraída e dá PESO a sinais fortes: um único sinal claro
   * (dor, volume, ferramenta, valor) já deixa a mensagem "específica".
   */
  calcularEspecificidade(analise) {
    let score = 0;
    if (analise.problema) score += 0.5;
    if (analise.volume) score += 0.4;
    if (analise.ferramenta) score += 0.3;
    if (analise.valor) score += 0.3;
    if (analise.resultado) score += 0.3;
    if (analise.taxa) score += 0.2;
    if (analise.negocio) score += 0.2;
    if (analise.duracao) score += 0.2;
    // Mensagens muito curtas e sem sinal continuam genéricas
    if (score === 0 && (analise.palavras || 0) >= 8) score = 0.2;
    return Math.min(score, 1);
  }

  /**
   * Gera perguntas de acompanhamento baseado no que foi dito
   */
  gerarPerguntas(analise) {
    const perguntas = [];

    // Se mencionou volume
    if (analise.volume) {
      perguntas.push(`E desses ${analise.volume} ${analise.periodo || 'orçamentos'}, quantos viram vendas?`);
    }

    // Se mencionou problema
    if (analise.problema) {
      perguntas.push(`Quando isso acontece (${analise.problema}), qual é o impacto pra você?`);
      perguntas.push(`Isso acontece sempre ou em alguns casos específicos?`);
    }

    // Se mencionou ferramenta/concorrente
    if (analise.ferramenta) {
      perguntas.push(`O ${analise.ferramenta} resolve bem esse problema ou deixa a desejar?`);
    }

    // Se mencionou valor/investimento
    if (analise.valor) {
      perguntas.push(`Investir R$ ${analise.valor} faria sentido se resolvesse seu problema?`);
    }

    // Se mencionou taxa/percentual
    if (analise.taxa) {
      perguntas.push(`Isso de ${analise.taxa}% te impacta muito ou é menos relevante?`);
    }

    return perguntas;
  }

  /**
   * Construir resposta contextual baseada na análise
   */
  construirRespostaContextual(analise) {
    let resposta = '';

    // Se cliente foi específico, validar
    if (analise.problema) {
      resposta += `Então deixa eu confirmar: o seu problema principal é "${analise.problema}". `;
    }

    // Se mencionou volume, aprofundar
    if (analise.volume) {
      resposta += `Com ${analise.volume} ${analise.periodo || 'orçamentos'} por período, `;
      resposta += `uma melhoria de 20% seria ${parseInt(analise.volume) * 0.2} a mais. `;
      resposta += `Como isso muda sua vida?`;
    }

    // Se mencionou ferramenta, comparar
    if (analise.ferramenta) {
      resposta += `${analise.ferramenta} é legal, mas o que falta pra você é... `;
      if (analise.problema) {
        resposta += `resolver "${analise.problema}"?`;
      } else {
        resposta += `um acompanhamento melhor?`;
      }
    }

    // Se foi genérico, pedir mais detalhes
    if (analise.especificidade < 0.4) {
      resposta = `Entendi. Deixa eu entender melhor: qual é EXATAMENTE seu maior desafio?`;
    }

    return resposta.trim();
  }

  /**
   * Extrai "insights" do que cliente está dizendo
   * (informações valiosas para venda)
   */
  extrairInsights(analise) {
    const insights = [];

    // Insight 1: Volume = Oportunidade
    if (analise.volume && parseInt(analise.volume) > 5) {
      insights.push({
        tipo: 'volume_alto',
        valor: parseInt(analise.volume),
        impacto: `Cliente com ${analise.volume} por período = grande oportunidade`
      });
    }

    // Insight 2: Problema claro = fácil vender
    if (analise.problema) {
      insights.push({
        tipo: 'problema_especifico',
        valor: analise.problema,
        impacto: 'Cliente identificou problema = metade do caminho vendido'
      });
    }

    // Insight 3: Mencionou concorrente = considerando trocar
    if (analise.ferramenta) {
      insights.push({
        tipo: 'considerando_trocar',
        valor: analise.ferramenta,
        impacto: 'Cliente insatisfeito com solução atual'
      });
    }

    // Insight 4: Taxa/percentual mencionada = métricas importantes
    if (analise.taxa) {
      insights.push({
        tipo: 'orientado_por_metricas',
        valor: analise.taxa,
        impacto: 'Cliente pensa em números = falar em ROI/impacto'
      });
    }

    // Insight 5: Resultado mencionado = já tem track record
    if (analise.resultado) {
      insights.push({
        tipo: 'track_record',
        valor: analise.resultado,
        impacto: 'Cliente já vende = qualificado, não precisa convencer de necessidade'
      });
    }

    return insights;
  }

  /**
   * Recomenda estratégia baseado na análise
   */
  recomendarEstrategia(analise) {
    const insights = this.extrairInsights(analise);

    let estrategia = {
      tom: 'neutro',
      foco: 'entender_mais',
      proximo_passo: 'fazer_pergunta'
    };

    // Se muito específico, já pode oferecer
    if (analise.especificidade > 0.6 && analise.problema) {
      estrategia.tom = 'direto';
      estrategia.foco = 'resolver_problema';
      estrategia.proximo_passo = 'oferecer_solucao';
    }

    // Se mencionou múltiplos dados, está engajado
    if (analise.citouNumeros && analise.fezPergunta) {
      estrategia.tom = 'especialista';
      estrategia.foco = 'aprofundar_números';
      estrategia.proximo_passo = 'calcular_impacto';
    }

    // Se tem frustração, validar primeiro
    if (analise.temNegativo) {
      estrategia.tom = 'empático';
      estrategia.foco = 'validar_sentimento';
      estrategia.proximo_passo = 'entender_raiz';
    }

    return { estrategia, insights };
  }

  /**
   * Gera "micro-resumo" do que cliente disse
   * Útil para montar contexto de conversa
   */
  gerarResumoMicro(analise) {
    const partes = [];

    if (analise.negocio) partes.push(`Trabalha com: ${analise.negocio}`);
    if (analise.volume) partes.push(`Volume: ${analise.volume}/${analise.periodo || 'período'}`);
    if (analise.problema) partes.push(`Principal dor: ${analise.problema}`);
    if (analise.resultado) partes.push(`Resultado atual: ${analise.resultado}`);
    if (analise.ferramenta) partes.push(`Usa: ${analise.ferramenta}`);

    return partes.join(' | ');
  }
}

module.exports = new SemanticAnalyzer();
