/**
 * Learning Manager - Sistema de aprendizado para o bot fallback
 * Persiste conversas, analisa padrões de sucesso e melhora o NLP
 */

const fs = require('fs');
const path = require('path');
const logger = require('./logger');
const nlpLocal = require('./nlp-local');

class LearningManager {
  constructor() {
    this.arquivoAprendizado = path.join(__dirname, '..', 'conhecimento', 'aprendizado_bot.jsonl');
    this.arquivoPatroes = path.join(__dirname, '..', 'conhecimento', 'padroes_sucesso.json');
    this.diretorioConhecimento = path.dirname(this.arquivoAprendizado);
    this.padroesSucesso = new Map(); // intencao -> { resposta, taxa_sucesso, vezes_usado }
    this.conversasEmProgresso = new Map(); // telefone -> { intencoes: [], respostas: [], etapa_atual, iniciado_em }

    this.inicializar();
  }

  inicializar() {
    // Criar diretório se não existir
    if (!fs.existsSync(this.diretorioConhecimento)) {
      fs.mkdirSync(this.diretorioConhecimento, { recursive: true });
    }

    // Carregar padrões de sucesso anterior
    this.carregarPatroesSucesso();

    logger.info('✅ Learning Manager inicializado');
  }

  /**
   * Registra início de uma conversa com o fallback
   */
  registrarInicio(telefone, identidade = { nome: 'Amanda' }) {
    if (!this.conversasEmProgresso.has(telefone)) {
      this.conversasEmProgresso.set(telefone, {
        intencoes: [],
        respostas: [],
        mensagensCliente: [],
        etapaAtual: 'apresentacao',
        iniciado_em: new Date(),
        identidade,
        resultado: null
      });
    }
  }

  /**
   * Registra cada interação (mensagem do cliente + resposta do bot)
   */
  registrarInteracao(telefone, mensagemCliente, intencaoDetectada, respostaBotGerada, etapa) {
    const conversa = this.conversasEmProgresso.get(telefone);
    if (!conversa) {
      this.registrarInicio(telefone);
      return this.registrarInteracao(telefone, mensagemCliente, intencaoDetectada, respostaBotGerada, etapa);
    }

    conversa.intencoes.push(intencaoDetectada);
    conversa.respostas.push(respostaBotGerada);
    conversa.mensagensCliente.push(mensagemCliente);
    conversa.etapaAtual = etapa;
  }

  /**
   * Marca o resultado final da conversa (sucesso/fracasso)
   */
  registrarResultado(telefone, resultado, motivoEncerramento = '') {
    const conversa = this.conversasEmProgresso.get(telefone);
    if (!conversa) return;

    conversa.resultado = resultado; // 'sucesso', 'fracasso', 'indeciso'
    conversa.motivoEncerramento = motivoEncerramento;
    conversa.duracao_ms = new Date() - conversa.iniciado_em;

    // Salvar conversa completa
    this.salvarConversa(telefone, conversa);

    // Atualizar padrões de sucesso
    if (resultado === 'sucesso') {
      this.atualizarPatroesSucesso(conversa);
    }

    // Limpar conversa
    this.conversasEmProgresso.delete(telefone);
  }

  /**
   * Salva conversa em arquivo JSONL para histórico
   */
  salvarConversa(telefone, conversa) {
    try {
      const registro = {
        telefone: telefone.split('@')[0],
        data: new Date().toISOString(),
        resultado: conversa.resultado,
        duracao_ms: conversa.duracao_ms,
        etapa_final: conversa.etapaAtual,
        intencoes: conversa.intencoes,
        respostas: conversa.respostas,
        mensagensCliente: conversa.mensagensCliente,
        motivoEncerramento: conversa.motivoEncerramento,
        identidade: conversa.identidade
      };

      const linha = JSON.stringify(registro) + '\n';
      fs.appendFileSync(this.arquivoAprendizado, linha, 'utf8');

      if (conversa.resultado === 'sucesso') {
        logger.info('✅ Conversa bem-sucedida registrada', {
          telefone: telefone.split('@')[0],
          duracao: `${conversa.duracao_ms}ms`,
          etapas: conversa.intencoes.length
        });
      }
    } catch (err) {
      logger.error('❌ Erro ao salvar conversa', { erro: err.message });
    }
  }

  /**
   * Atualiza padrões de sucesso com base em conversas bem-sucedidas
   */
  atualizarPatroesSucesso(conversa) {
    for (let i = 0; i < conversa.intencoes.length; i++) {
      const intencao = conversa.intencoes[i];
      const resposta = conversa.respostas[i];
      const chave = `${intencao}|${resposta.substring(0, 50)}`; // Use resposta curta como chave

      if (!this.padroesSucesso.has(chave)) {
        this.padroesSucesso.set(chave, {
          intencao,
          resposta,
          sucessos: 0,
          tentativas: 0,
          taxaSucesso: 0
        });
      }

      const padrao = this.padroesSucesso.get(chave);
      padrao.sucessos++;
      padrao.tentativas++;
      padrao.taxaSucesso = (padrao.sucessos / padrao.tentativas * 100).toFixed(1);
    }

    this.salvarPatroesSucesso();
  }

  /**
   * Salva padrões de sucesso em JSON para análise
   */
  salvarPatroesSucesso() {
    try {
      const padroes = Array.from(this.padroesSucesso.values())
        .sort((a, b) => b.taxaSucesso - a.taxaSucesso)
        .slice(0, 100); // Top 100

      fs.writeFileSync(
        this.arquivoPatroes,
        JSON.stringify(padroes, null, 2),
        'utf8'
      );
    } catch (err) {
      logger.error('❌ Erro ao salvar padrões de sucesso', { erro: err.message });
    }
  }

  /**
   * Carrega padrões de sucesso do arquivo
   */
  carregarPatroesSucesso() {
    try {
      if (!fs.existsSync(this.arquivoPatroes)) return;

      const dados = JSON.parse(fs.readFileSync(this.arquivoPatroes, 'utf8'));
      if (Array.isArray(dados)) {
        dados.forEach(p => {
          const chave = `${p.intencao}|${p.resposta.substring(0, 50)}`;
          this.padroesSucesso.set(chave, p);
        });
      }

      logger.info('✅ Padrões de sucesso carregados', {
        total: this.padroesSucesso.size
      });
    } catch (err) {
      logger.error('❌ Erro ao carregar padrões', { erro: err.message });
    }
  }

  /**
   * Analisa conversas e retorna estatísticas
   */
  analisarConversas(filtro = {}) {
    try {
      if (!fs.existsSync(this.arquivoAprendizado)) {
        return { total: 0, sucessos: 0, fracassos: 0, taxa_sucesso: 0, intencoes: {} };
      }

      const linhas = fs.readFileSync(this.arquivoAprendizado, 'utf8')
        .split('\n')
        .filter(l => l.trim());

      let conversas = linhas.map(l => JSON.parse(l));

      // Aplicar filtros
      if (filtro.resultado) {
        conversas = conversas.filter(c => c.resultado === filtro.resultado);
      }
      if (filtro.dataApos) {
        const data = new Date(filtro.dataApos);
        conversas = conversas.filter(c => new Date(c.data) > data);
      }

      // Calcular estatísticas
      const stats = {
        total: conversas.length,
        sucessos: conversas.filter(c => c.resultado === 'sucesso').length,
        fracassos: conversas.filter(c => c.resultado === 'fracasso').length,
        indeciso: conversas.filter(c => c.resultado === 'indeciso').length,
        duracao_media_ms: 0,
        intencoes: {},
        etapas_atingidas: {}
      };

      // Taxa de sucesso
      stats.taxa_sucesso = stats.total > 0
        ? (stats.sucessos / stats.total * 100).toFixed(1)
        : 0;

      // Duração média
      if (stats.total > 0) {
        const duracao = conversas.reduce((sum, c) => sum + (c.duracao_ms || 0), 0);
        stats.duracao_media_ms = Math.round(duracao / stats.total);
      }

      // Contar intenções
      conversas.forEach(c => {
        if (c.intencoes) {
          c.intencoes.forEach(int => {
            stats.intencoes[int] = (stats.intencoes[int] || 0) + 1;
          });
        }
        if (c.etapa_final) {
          stats.etapas_atingidas[c.etapa_final] = (stats.etapas_atingidas[c.etapa_final] || 0) + 1;
        }
      });

      return stats;
    } catch (err) {
      logger.error('❌ Erro ao analisar conversas', { erro: err.message });
      return { total: 0, sucessos: 0, fracassos: 0, taxa_sucesso: 0 };
    }
  }

  /**
   * Retorna as melhores respostas para uma intenção
   */
  obterMelhoresRespostas(intencao, limite = 5) {
    const matches = Array.from(this.padroesSucesso.values())
      .filter(p => p.intencao === intencao)
      .sort((a, b) => b.taxaSucesso - a.taxaSucesso)
      .slice(0, limite);

    return matches;
  }

  /**
   * Retorna informações para retreinamento do NLP
   */
  gerarDadosTreinamento() {
    try {
      if (!fs.existsSync(this.arquivoAprendizado)) {
        return { novasFrases: [] };
      }

      const linhas = fs.readFileSync(this.arquivoAprendizado, 'utf8')
        .split('\n')
        .filter(l => l.trim());

      const conversasBemsucedidas = linhas
        .map(l => JSON.parse(l))
        .filter(c => c.resultado === 'sucesso');

      // Agrupar mensagens do cliente por intenção detectada
      const novasFrases = new Map();

      conversasBemsucedidas.forEach(c => {
        if (c.intencoes && c.mensagensCliente) {
          c.intencoes.forEach((intencao, idx) => {
            const msg = c.mensagensCliente[idx];
            if (!msg || intencao === 'None') return;

            if (!novasFrases.has(intencao)) {
              novasFrases.set(intencao, new Set());
            }
            novasFrases.get(intencao).add(msg);
          });
        }
      });

      // Converter para array de { intencao, frase }
      const resultado = [];
      for (const [intencao, frases] of novasFrases.entries()) {
        Array.from(frases).forEach(frase => {
          resultado.push({ intencao, frase });
        });
      }

      logger.info('✅ Dados de treinamento gerados', {
        novasFrases: resultado.length,
        intencoes: novasFrases.size
      });

      return { novasFrases: resultado };
    } catch (err) {
      logger.error('❌ Erro ao gerar dados de treinamento', { erro: err.message });
      return { novasFrases: [] };
    }
  }

  /**
   * Retorna um resumo de conversas recentes
   */
  obterUltimasConversas(limite = 20) {
    try {
      if (!fs.existsSync(this.arquivoAprendizado)) return [];

      const linhas = fs.readFileSync(this.arquivoAprendizado, 'utf8')
        .split('\n')
        .filter(l => l.trim())
        .reverse()
        .slice(0, limite)
        .reverse();

      return linhas.map(l => JSON.parse(l));
    } catch (err) {
      logger.error('❌ Erro ao obter últimas conversas', { erro: err.message });
      return [];
    }
  }

  /**
   * Recomenda próxima resposta baseada em histórico de sucesso
   */
  recomendarResposta(intencao, respostasUsadas = []) {
    const melhores = this.obterMelhoresRespostas(intencao, 10);

    // Filtrar respostas que já foram usadas
    const disponivel = melhores.find(m => !respostasUsadas.some(r =>
      r.substring(0, 50) === m.resposta.substring(0, 50)
    ));

    return disponivel?.resposta || null;
  }

  /**
   * Exporta conversas em formato CSV para análise
   */
  exportarCSV() {
    try {
      if (!fs.existsSync(this.arquivoAprendizado)) return '';

      const linhas = fs.readFileSync(this.arquivoAprendizado, 'utf8')
        .split('\n')
        .filter(l => l.trim())
        .map(l => JSON.parse(l));

      const csv = [
        'Data,Telefone,Resultado,Duracao(ms),Etapa Final,Num Intencoes,Motivo'
      ];

      linhas.forEach(c => {
        csv.push(
          `"${c.data}","${c.telefone}","${c.resultado}",${c.duracao_ms},"${c.etapa_final}",${c.intencoes?.length || 0},"${(c.motivoEncerramento || '').replace(/"/g, '""')}"`
        );
      });

      return csv.join('\n');
    } catch (err) {
      logger.error('❌ Erro ao exportar CSV', { erro: err.message });
      return '';
    }
  }
}

module.exports = new LearningManager();
