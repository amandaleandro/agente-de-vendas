/**
 * Sistema de Contexto Inteligente para Conversas
 * - Resume conversas longas mantendo informações críticas
 * - Detecta tema principal e etapa real da conversa
 * - Mantém cache de perfil do cliente
 */

class ConversationContext {
  constructor() {
    this.clientProfiles = new Map(); // telefone -> { nome, problema, interesse, sentimento, etc }
    this.conversationSummaries = new Map(); // telefone -> { resumo, tema, etapa_real }
  }

  /**
   * Analisa mensagens e extrai perfil do cliente
   */
  analisarMensagensParaExtractPerfil(mensagens, telefone) {
    const perfil = this.clientProfiles.get(telefone) || {
      nome: null,
      problema: null,
      interesse: null,
      sentimento: 'neutro',
      objeccoes: [],
      tags: [],
      ultimaInteracao: null
    };

    for (const msg of mensagens) {
      if (!msg.fromMe && msg.text) {
        const texto = msg.text.toLowerCase();

        // Extrair nome se mencionado (padrões comuns)
        if (texto.match(/meu nome é|meu nome e|me chamo|sou o|sou a/i)) {
          const match = msg.text.match(/(?:meu nome é|meu nome e|me chamo|sou (?:o|a))\s+([A-Za-záàâãéèêíïóôõöúçñ\s]+)/i);
          if (match) perfil.nome = match[1].trim().split(/\s+/)[0]; // Primeiro nome
        }

        // Detectar sentimento
        if (texto.includes('frustrad') || texto.includes('cansad') || texto.includes('problema')) {
          perfil.sentimento = 'frustrado';
        } else if (texto.includes('bom') || texto.includes('legal') || texto.includes('interessant')) {
          perfil.sentimento = 'positivo';
        }

        // Detectar objeções
        if (texto.includes('caro') || texto.includes('custa')) perfil.objeccoes.push('preço');
        if (texto.includes('tempo') || texto.includes('ocupad')) perfil.objeccoes.push('tempo');
        if (texto.includes('não preciso') || texto.includes('já temos')) perfil.objeccoes.push('já_tem_solução');

        // Detectar interesse
        if (texto.includes('quero testar') || texto.includes('manda o link') || texto.includes('como funciona')) {
          perfil.interesse = 'alto';
        }
      }
      perfil.ultimaInteracao = new Date();
    }

    this.clientProfiles.set(telefone, perfil);
    return perfil;
  }

  /**
   * Resume conversa longa mantendo contexto crítico
   */
  construirResumoContextual(mensagens, telefone) {
    if (!mensagens || mensagens.length === 0) return '';

    const perfil = this.analisarMensagensParaExtractPerfil(mensagens, telefone);

    // Últimas 6 mensagens para contexto imediato
    const ultimasMsgs = mensagens.slice(-6).map(msg => {
      const quem = msg.fromMe ? 'bot' : 'cliente';
      const texto = (msg.text || '').substring(0, 80);
      return `${quem}: ${texto}`;
    }).join('\n');

    // Montar resumo
    let resumo = `=== CONTEXTO DA CONVERSA ===\n`;
    if (perfil.nome) resumo += `Cliente: ${perfil.nome}\n`;
    if (perfil.problema) resumo += `Problema Principal: ${perfil.problema}\n`;
    resumo += `Sentimento: ${perfil.sentimento}\n`;
    if (perfil.objeccoes.length > 0) resumo += `Objeções: ${perfil.objeccoes.join(', ')}\n`;
    if (perfil.interesse) resumo += `Nível Interesse: ${perfil.interesse}\n`;
    resumo += `\n=== ÚLTIMAS MENSAGENS ===\n${ultimasMsgs}`;

    return resumo;
  }

  /**
   * Detecta tema principal da conversa
   */
  detectarTemaPrincipal(mensagens) {
    if (!mensagens || mensagens.length === 0) return 'geral';

    const textoTotal = mensagens.map(m => m.text || '').join(' ').toLowerCase();

    const temas = {
      'preço': ['caro', 'preço', 'valor', 'custa', 'investimento', 'cobram'],
      'funcionamento': ['como funciona', 'para que serve', 'o que faz', 'como usa', 'explica'],
      'cliente_some': ['cliente some', 'desaparece', 'não responde', 'vácuo', 'retorno'],
      'desconto': ['desconto', 'barato', 'promoção', 'reduzido'],
      'urgência': ['agora', 'hoje', 'imediatamente', 'rápido', 'logo'],
      'concorrência': ['concorrente', 'outra plataforma', 'já uso', 'tenho outro']
    };

    let temaEncontrado = 'geral';
    let maiorOcorrencia = 0;

    for (const [tema, palavras] of Object.entries(temas)) {
      const ocorrencias = palavras.filter(p => textoTotal.includes(p)).length;
      if (ocorrencias > maiorOcorrencia) {
        maiorOcorrencia = ocorrencias;
        temaEncontrado = tema;
      }
    }

    return temaEncontrado;
  }

  /**
   * Detecta qual é a ETAPA REAL da conversa (não baseado em máquina de estados, mas no histórico)
   */
  detectarEtapaReal(mensagens, telefone) {
    if (!mensagens || mensagens.length < 2) return 'apresentacao';

    const textoTotal = mensagens.map(m => m.text || '').join(' ').toLowerCase();
    const perfil = this.clientProfiles.get(telefone);

    // Se cliente já mencionou o problema específico
    if (textoTotal.includes('cliente') && (textoTotal.includes('some') || textoTotal.includes('não responde'))) {
      return 'dor_identificada';
    }

    // Se cliente perguntou sobre funcionamento
    if (textoTotal.includes('como funciona') || textoTotal.includes('para que serve')) {
      return 'entendendo_produto';
    }

    // Se cliente tem objeção de preço
    if (perfil?.objeccoes?.includes('preço')) {
      return 'tratando_objecao';
    }

    // Se cliente mostrou interesse
    if (perfil?.interesse === 'alto') {
      return 'venda_possivel';
    }

    // Default
    return 'exploracao';
  }

  /**
   * Limpar perfil quando conversa termina
   */
  limparPerfil(telefone) {
    this.clientProfiles.delete(telefone);
    this.conversationSummaries.delete(telefone);
  }

  /**
   * Obter perfil completo do cliente
   */
  obterPerfil(telefone) {
    return this.clientProfiles.get(telefone) || null;
  }

  /**
   * Atualizar perfil manualmente
   */
  atualizarPerfil(telefone, atualizacoes) {
    const perfil = this.clientProfiles.get(telefone) || {};
    const atualizado = { ...perfil, ...atualizacoes };
    this.clientProfiles.set(telefone, atualizado);
    return atualizado;
  }
}

module.exports = new ConversationContext();
