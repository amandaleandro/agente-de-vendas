/**
 * Analisador de Sentimento e Padrões de Resposta Bem-Sucedida
 * - Detecta emoção do cliente
 * - Rastreia quais respostas funcionam melhor
 * - Sugere respostas baseado em padrões históricos
 */

const fs = require('fs');
const path = require('path');

class SentimentAnalyzer {
  constructor() {
    this.sentimentosCliente = new Map(); // telefone -> { sentimento, frustracaoLevel, engajamento }
    this.padroesDeSucesso = new Map(); // tema -> [ { resposta, taxa_sucesso, contexto } ]
    this.carregarPadroesDeSucesso();
  }

  /**
   * Analisa sentimento da mensagem do cliente
   */
  analisarSentimento(texto) {
    const textoLower = texto.toLowerCase();
    const comprimento = texto.length;

    // Pontuação indicativa de emoção
    const mayusculasExcessivas = (texto.match(/[A-Z]{3,}/g) || []).length > 0;
    const pontuacaoExcessiva = (texto.match(/!{2,}|\?{2,}/g) || []).length > 0;
    const risadas = (texto.match(/kkk|kkkk|haha|rsrs/i) || []).length > 0;

    let sentimento = 'neutro';
    let frustracaoLevel = 0;
    let engajamento = 0.5;

    // Detectar frustração
    const palavrasFrustracao = ['frustrad', 'cansad', 'irritad', 'estress', 'problema', 'chato', 'não aguento', 'burro', 'idiota', 'ridículo'];
    const frustracaoDetectada = palavrasFrustracao.some(p => textoLower.includes(p));
    if (frustracaoDetectada) {
      frustracaoLevel = 0.8;
      sentimento = 'frustrado';
    }

    // Detectar positividade
    const palavrasPositivas = ['legal', 'bom', 'ótimo', 'perfeito', 'adorei', 'amo', 'top', 'show', 'massa', 'interessant', 'gostei'];
    const positivoDetectado = palavrasPositivas.some(p => textoLower.includes(p));
    if (positivoDetectado) {
      sentimento = 'positivo';
      engajamento = 0.9;
    }

    // Detectar entediante (respostas muito curtas)
    if (comprimento < 5 && !risadas) {
      engajamento = 0.3;
      sentimento = 'desengajado';
    }

    // Maiúsculas e pontuação aumentam intensidade
    if (mayusculasExcessivas || pontuacaoExcessiva) {
      frustracaoLevel = Math.min(frustracaoLevel + 0.3, 1);
    }

    // Risadas normalmente indicam bom humor
    if (risadas) {
      sentimento = 'positivo';
      engajamento = 0.8;
    }

    return {
      sentimento,
      frustracaoLevel,
      engajamento,
      indicadores: { mayusculasExcessivas, pontuacaoExcessiva, risadas }
    };
  }

  /**
   * Registra resultado de uma resposta (sucesso ou fracasso)
   */
  registrarResultadoResposta(tema, resposta, resultado, contexto = {}) {
    if (!this.padroesDeSucesso.has(tema)) {
      this.padroesDeSucesso.set(tema, []);
    }

    const padroesDoTema = this.padroesDeSucesso.get(tema);
    const respostaNormalizada = this.normalizarResposta(resposta);

    // Procura se essa resposta já existe
    let padrao = padroesDoTema.find(p => p.respostaNormalizada === respostaNormalizada);

    if (!padrao) {
      padrao = {
        resposta: resposta.substring(0, 150),
        respostaNormalizada,
        sucessos: 0,
        fracassos: 0,
        contexto,
        primeiraUso: new Date()
      };
      padroesDoTema.push(padrao);
    }

    // Atualizar contadores
    if (resultado === 'sucesso') {
      padrao.sucessos++;
    } else if (resultado === 'fracasso') {
      padrao.fracassos++;
    }

    // Salvar padrões atualizados
    this.salvarPadroesDeSucesso();
  }

  /**
   * Sugere resposta baseado em padrões de sucesso
   */
  sugerirRespostaPorPadrao(tema, contextoAtual = {}) {
    if (!this.padroesDeSucesso.has(tema)) return null;

    const padroesDoTema = this.padroesDeSucesso.get(tema);

    // Ordena por taxa de sucesso (sucessos / total)
    const padroesOrdenados = padroesDoTema
      .filter(p => (p.sucessos + p.fracassos) > 0) // Apenas com histórico
      .sort((a, b) => {
        const taxaA = a.sucessos / (a.sucessos + a.fracassos);
        const taxaB = b.sucessos / (b.sucessos + b.fracassos);
        return taxaB - taxaA;
      });

    // Retorna a resposta com melhor taxa de sucesso
    if (padroesOrdenados.length > 0) {
      const melhorPadrao = padroesOrdenados[0];
      const taxaSucesso = melhorPadrao.sucessos / (melhorPadrao.sucessos + melhorPadrao.fracassos);

      return {
        resposta: melhorPadrao.resposta,
        taxaSucesso: (taxaSucesso * 100).toFixed(1) + '%',
        padrao: melhorPadrao
      };
    }

    return null;
  }

  /**
   * Recomenda estratégia conforme sentimento
   */
  recomendarEstrategia(sentimento, frustracaoLevel, engajamento) {
    let estrategia = {
      tom: 'neutro',
      urgencia: 'normal',
      foco: 'problema'
    };

    if (frustracaoLevel > 0.7) {
      estrategia.tom = 'empático';
      estrategia.foco = 'validação'; // Primeiro validar sentimento, depois resolver
      estrategia.aviso = '⚠️ Cliente frustrado - usar abordagem de validação emocional primeiro';
    }

    if (sentimento === 'positivo') {
      estrategia.tom = 'entusiasmado';
      estrategia.urgencia = 'alta'; // Cliente interesse = oferecer logo
      estrategia.foco = 'oportunidade';
    }

    if (engajamento < 0.4) {
      estrategia.foco = 're-engajar'; // Cliente desengajado = fazer perguntas abertas
      estrategia.aviso = '⚠️ Cliente desengajado - usar perguntas abertas para re-engajar';
    }

    return estrategia;
  }

  /**
   * Normaliza resposta para comparação
   */
  normalizarResposta(resposta) {
    return resposta
      .toLowerCase()
      .replace(/[?.!,;]/g, '')
      .trim()
      .substring(0, 100);
  }

  /**
   * Salvar padrões em arquivo
   */
  salvarPadroesDeSucesso() {
    const arquivo = path.join(__dirname, '../conhecimento/padroes_resposta.json');
    try {
      const dados = {};
      for (const [tema, padroes] of this.padroesDeSucesso) {
        dados[tema] = padroes;
      }
      fs.writeFileSync(arquivo, JSON.stringify(dados, null, 2));
    } catch (err) {
      console.error('Erro ao salvar padrões:', err.message);
    }
  }

  /**
   * Carregar padrões do arquivo
   */
  carregarPadroesDeSucesso() {
    const arquivo = path.join(__dirname, '../conhecimento/padroes_resposta.json');
    try {
      if (fs.existsSync(arquivo)) {
        const dados = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
        for (const [tema, padroes] of Object.entries(dados)) {
          this.padroesDeSucesso.set(tema, padroes);
        }
        console.log('✅ Padrões de resposta carregados');
      }
    } catch (err) {
      console.warn('Padrões de resposta não encontrados ou inválidos - começando do zero');
    }
  }

  /**
   * Obter estatísticas de um tema
   */
  obterEstatisticas(tema) {
    if (!this.padroesDeSucesso.has(tema)) return null;

    const padroes = this.padroesDeSucesso.get(tema);
    const totalTentativas = padroes.reduce((sum, p) => sum + p.sucessos + p.fracassos, 0);
    const totalSucessos = padroes.reduce((sum, p) => sum + p.sucessos, 0);

    return {
      tema,
      totalPadroes: padroes.length,
      totalTentativas,
      taxaSucessoGeral: totalTentativas > 0 ? ((totalSucessos / totalTentativas) * 100).toFixed(1) + '%' : '0%',
      padroesMelhores: padroes
        .filter(p => (p.sucessos + p.fracassos) > 0)
        .sort((a, b) => (b.sucessos / (b.sucessos + b.fracassos)) - (a.sucessos / (a.sucessos + a.fracassos)))
        .slice(0, 3)
        .map(p => ({
          resposta: p.resposta,
          taxa: ((p.sucessos / (p.sucessos + p.fracassos)) * 100).toFixed(1) + '%'
        }))
    };
  }
}

module.exports = new SentimentAnalyzer();
