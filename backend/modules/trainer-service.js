const fs = require('fs');
const path = require('path');
const logger = require('./logger');

/**
 * TrainerService - Sistema de treinamento contínuo
 * Extrai, analisa e melhora o bot com dados reais
 */
class TrainerService {
  constructor(pool) {
    this.pool = pool;
    this.pastaTrainamento = path.join(__dirname, '..', 'conhecimento', 'training');
    this.intervalo = null;
    this.emExecucao = false;
    this.ultimoTreinamento = null;
    this.metricas = {
      totalTreinamentos: 0,
      ultimoTreinamento: null,
      taxaConversaoMedia: 0,
      padroesPrincipais: []
    };

    this.garantirPasta();
  }

  garantirPasta() {
    if (!fs.existsSync(this.pastaTrainamento)) {
      fs.mkdirSync(this.pastaTrainamento, { recursive: true });
    }
  }

  /**
   * Inicia o serviço de treinamento automático
   */
  iniciar(intervaloMinutos = 60) {
    if (this.intervalo) {
      logger.warn('TrainerService já está rodando');
      return;
    }

    const intervaloMs = intervaloMinutos * 60 * 1000;
    logger.info(`🤖 TrainerService iniciado (a cada ${intervaloMinutos} min)`, {
      intervaloMs
    });

    // Treinar uma vez ao iniciar (sem esperar)
    this.treinar().catch(err => {
      logger.error('Erro no treinamento inicial:', { erro: err.message });
    });

    // Depois agendar para intervalo periódico
    this.intervalo = setInterval(() => {
      this.treinar().catch(err => {
        logger.error('Erro no treinamento agendado:', { erro: err.message });
      });
    }, intervaloMs);
  }

  /**
   * Para o serviço
   */
  parar() {
    if (this.intervalo) {
      clearInterval(this.intervalo);
      this.intervalo = null;
      logger.info('🛑 TrainerService parado');
    }
  }

  /**
   * Executa treinamento completo
   */
  async treinar() {
    if (this.emExecucao) {
      logger.warn('Treinamento já em execução, pulando...');
      return;
    }

    this.emExecucao = true;
    const inicioTime = Date.now();

    try {
      logger.info('🚀 Iniciando treinamento...');

      // 1. Extrair conversas
      const conversas = await this.extrairConversas();
      if (conversas.length === 0) {
        logger.warn('Nenhuma conversa para treinar');
        return;
      }

      // 2. Agrupar
      const conversasAgrupadas = this.agruparPorContato(conversas);

      // 3. Analisar
      const analise = this.analisarPadroes(conversasAgrupadas);

      // 4. Gerar insights
      const insights = this.extrairInsights(conversasAgrupadas);

      // 5. Salvar resultados
      this.salvarResultados(analise, insights, conversasAgrupadas);

      // 6. Atualizar métricas
      this.atualizarMetricas(analise);

      const tempoDecorrido = ((Date.now() - inicioTime) / 1000).toFixed(1);
      logger.info(`✅ Treinamento concluído em ${tempoDecorrido}s`, {
        conversas: conversasAgrupadas.length,
        taxaConversao: analise.conversaoRate,
        padroes: Object.keys(analise.padroesDePergunta).length
      });

    } catch (err) {
      logger.error('❌ Erro no treinamento:', { erro: err.message });
    } finally {
      this.emExecucao = false;
    }
  }

  /**
   * Extrai conversas do banco
   */
  async extrairConversas() {
    try {
      const client = await this.pool.connect();

      const query = `
        SELECT
          l.telefone,
          l.status as lead_status,
          c.id as conversa_id,
          c.mensagem_entrada,
          c.mensagem_saida,
          c.created_at,
          l.created_at as lead_created_at
        FROM conversas c
        JOIN leads l ON c.lead_id = l.id
        WHERE c.created_at > NOW() - INTERVAL '30 days'
        ORDER BY l.id, c.created_at
        LIMIT 10000
      `;

      const result = await client.query(query);
      client.release();

      return result.rows;
    } catch (err) {
      logger.error('Erro ao extrair conversas:', { erro: err.message });
      return [];
    }
  }

  /**
   * Agrupa mensagens por contato
   */
  agruparPorContato(mensagens) {
    const conversasPorContato = new Map();

    for (const msg of mensagens) {
      const chave = msg.telefone;
      if (!conversasPorContato.has(chave)) {
        conversasPorContato.set(chave, {
          telefone: msg.telefone,
          status: msg.lead_status,
          mensagens: [],
          criadoEm: msg.lead_created_at
        });
      }

      conversasPorContato.get(chave).mensagens.push({
        entrada: msg.mensagem_entrada,
        saida: msg.mensagem_saida,
        timestamp: msg.created_at
      });
    }

    return Array.from(conversasPorContato.values());
  }

  /**
   * Analisa padrões de conversão
   */
  analisarPadroes(conversas) {
    const analise = {
      total: conversas.length,
      porStatus: {},
      padroesDePergunta: {},
      intencoes: {},
      conversaoRate: 0,
      conversasQueConverteram: [],
      conversasQueNaoConverteram: []
    };

    for (const conversa of conversas) {
      if (!analise.porStatus[conversa.status]) {
        analise.porStatus[conversa.status] = 0;
      }
      analise.porStatus[conversa.status]++;

      // Extrair padrões
      for (const msg of conversa.mensagens) {
        if (!msg.entrada) continue;

        const entrada = msg.entrada.toLowerCase().trim();
        const palavras = this.extrairPalavrasChave(entrada);

        for (const palavra of palavras) {
          if (!analise.padroesDePergunta[palavra]) {
            analise.padroesDePergunta[palavra] = { count: 0, conversoes: 0 };
          }
          analise.padroesDePergunta[palavra].count++;

          if (conversa.status === 'vendido') {
            analise.padroesDePergunta[palavra].conversoes++;
          }
        }
      }

      if (conversa.status === 'vendido') {
        analise.conversasQueConverteram.push(conversa);
      } else {
        analise.conversasQueNaoConverteram.push(conversa);
      }
    }

    if (analise.conversasQueConverteram.length > 0) {
      analise.conversaoRate = (
        (analise.conversasQueConverteram.length / analise.total) * 100
      ).toFixed(2);
    }

    return analise;
  }

  /**
   * Extrai palavras-chave
   */
  extrairPalavrasChave(texto) {
    const stopwords = new Set([
      'o', 'a', 'de', 'da', 'do', 'e', 'é', 'em', 'para', 'por', 'com', 'sem',
      'que', 'qual', 'quais', 'como', 'quando', 'onde', 'se', 'não', 'sim',
      'um', 'uma', 'uns', 'umas'
    ]);

    const palavras = texto
      .split(/\s+/)
      .map(p => p.replace(/[^a-záéíóúãõç]/gi, '').toLowerCase())
      .filter(p => p.length > 3 && !stopwords.has(p));

    return [...new Set(palavras)];
  }

  /**
   * Extrai insights de conversão
   */
  extrairInsights(conversas) {
    const vendidas = conversas.filter(c => c.status === 'vendido');

    const insights = {
      conversasQueVenderam: vendidas.slice(0, 20).map(c => ({
        mensagens: c.mensagens.slice(0, 3),
        totalMensagens: c.mensagens.length
      })),
      padroesDeSucesso: this.extrairPadroesDeSucesso(vendidas),
      recomendacoes: this.gerarRecomendacoes(vendidas, conversas)
    };

    return insights;
  }

  /**
   * Extrai padrões de sucesso
   */
  extrairPadroesDeSucesso(vendidas) {
    const padroes = {};

    for (const conversa of vendidas) {
      for (const msg of conversa.mensagens) {
        if (!msg.saida) continue;

        const saida = msg.saida.toLowerCase();
        const palavras = this.extrairPalavrasChave(saida);

        for (const palavra of palavras) {
          padroes[palavra] = (padroes[palavra] || 0) + 1;
        }
      }
    }

    return Object.entries(padroes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .reduce((obj, [chave, valor]) => {
        obj[chave] = valor;
        return obj;
      }, {});
  }

  /**
   * Gera recomendações baseadas em dados
   */
  gerarRecomendacoes(vendidas, todasConversas) {
    const recomendacoes = [];

    const taxaVenda = (vendidas.length / todasConversas.length * 100).toFixed(1);

    if (taxaVenda < 20) {
      recomendacoes.push({
        tipo: 'alerta',
        mensagem: `Taxa de conversão baixa (${taxaVenda}%). Revisar estratégia.`,
        prioridade: 'alta'
      });
    }

    if (taxaVenda > 50) {
      recomendacoes.push({
        tipo: 'sucesso',
        mensagem: `Taxa de conversão excelente (${taxaVenda}%)! Manter padrões.`,
        prioridade: 'baixa'
      });
    }

    recomendacoes.push({
      tipo: 'acao',
      mensagem: 'Analisar respostas que convertem e replicar padrão.',
      prioridade: 'média'
    });

    return recomendacoes;
  }

  /**
   * Salva resultados do treinamento
   */
  salvarResultados(analise, insights, conversas) {
    const timestamp = new Date().toISOString();

    // Análise completa
    const analiseComTimestamp = {
      ...analise,
      timestamp,
      totalConversas: conversas.length
    };

    this.salvarJSON('analise_ultima', analiseComTimestamp);
    this.salvarJSON('padroes_ultima', analise.padroesDePergunta);
    this.salvarJSON('insights_ultima', insights);

    // Histórico
    this.salvarJSONComHistorico('historico_analises', analiseComTimestamp);
  }

  /**
   * Salva JSON em arquivo
   */
  salvarJSON(nome, dados) {
    const caminho = path.join(this.pastaTrainamento, `${nome}.json`);
    fs.writeFileSync(caminho, JSON.stringify(dados, null, 2), 'utf8');
  }

  /**
   * Salva histórico em JSONL
   */
  salvarJSONComHistorico(nome, dados) {
    const caminho = path.join(this.pastaTrainamento, `${nome}.jsonl`);
    const linha = JSON.stringify(dados) + '\n';
    fs.appendFileSync(caminho, linha, 'utf8');
  }

  /**
   * Atualiza métricas do serviço
   */
  atualizarMetricas(analise) {
    this.metricas.totalTreinamentos++;
    this.metricas.ultimoTreinamento = new Date();
    this.metricas.taxaConversaoMedia = analise.conversaoRate;

    const padroes = Object.entries(analise.padroesDePergunta)
      .sort((a, b) => b[1].conversoes - a[1].conversoes)
      .slice(0, 5)
      .map(([palavra, stats]) => ({
        palavra,
        frequencia: stats.count,
        conversoes: stats.conversoes,
        taxaConversao: (stats.conversoes / stats.count * 100).toFixed(0) + '%'
      }));

    this.metricas.padroesPrincipais = padroes;
  }

  /**
   * Obtém métricas atuais
   */
  obterMetricas() {
    return {
      ...this.metricas,
      emExecucao: this.emExecucao,
      ativo: !!this.intervalo
    };
  }

  /**
   * Obtém resultados da última análise
   */
  obterUltimosResultados() {
    try {
      const analise = this.lerJSON('analise_ultima');
      const padroes = this.lerJSON('padroes_ultima');
      const insights = this.lerJSON('insights_ultima');

      return {
        analise,
        padroes,
        insights,
        timestamp: analise?.timestamp
      };
    } catch (err) {
      return null;
    }
  }

  /**
   * Lê JSON do arquivo
   */
  lerJSON(nome) {
    const caminho = path.join(this.pastaTrainamento, `${nome}.json`);
    if (!fs.existsSync(caminho)) return null;

    const conteudo = fs.readFileSync(caminho, 'utf8');
    return JSON.parse(conteudo);
  }
}

module.exports = TrainerService;
