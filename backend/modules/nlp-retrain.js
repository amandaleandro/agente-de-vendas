/**
 * NLP Retrain - Sistema para retreinar o modelo NLP com padrões descobertos
 */

const nlpLocal = require('./nlp-local');
const learningManager = require('./learning-manager');
const logger = require('./logger');

class NLPRetrain {
  async retreinarComNovosPadroes() {
    logger.info('🔄 Iniciando retreinamento do modelo NLP...');

    try {
      // Obter dados de treinamento das conversas bem-sucedidas
      const dados = learningManager.gerarDadosTreinamento();

      if (!dados || !dados.novasFrases || dados.novasFrases.length === 0) {
        logger.warn('⚠️ Nenhuma nova frase descoberta para retreinamento');
        return { sucessos: 0, novo_total: 0 };
      }

      logger.info(`📚 Adicionando ${dados.novasFrases.length} novas frases ao modelo...`);

      let adicionadas = 0;
      const intencoes_anteriores = new Set(
        nlpLocal?.manager?.domainManagers?.['pt']?.documents?.map(d => d.intent) || []
      );

      // Adicionar novas frases ao modelo
      for (const { intencao, frase } of dados.novasFrases) {
        if (!frase || !intencao) continue;

        try {
          nlpLocal.manager.addDocument('pt', frase, intencao);
          adicionadas++;
        } catch (err) {
          logger.warn(`⚠️ Erro ao adicionar frase: ${frase}`, { erro: err.message });
        }
      }

      // Retrainer o modelo
      logger.info('🧠 Treinando modelo com novos dados...');
      if (nlpLocal?.manager?.train) {
        await nlpLocal.manager.train();
      }
      if (nlpLocal) {
        nlpLocal.treinado = true;
      }

      const intencoes_novas = new Set(
        nlpLocal?.manager?.domainManagers?.['pt']?.documents?.map(d => d.intent) || []
      );
      const novas_intencoes = Array.from(intencoes_novas).filter(i => !intencoes_anteriores.has(i));

      logger.info('✅ Retreinamento concluído com sucesso!', {
        frases_adicionadas: adicionadas,
        novas_intencoes: novas_intencoes.length,
        lista_novas_intencoes: novas_intencoes
      });

      return {
        sucessos: adicionadas,
        novo_total: nlpLocal?.manager?.domainManagers?.['pt']?.documents?.length || 0,
        novas_intencoes
      };
    } catch (err) {
      logger.error('❌ Erro durante retreinamento', { erro: err.message });
      throw err;
    }
  }

  /**
   * Analisa padrões de falha e sugere melhorias
   */
  analisarFalhas() {
    logger.info('📊 Analisando padrões de falha...');

    try {
      const stats = learningManager.analisarConversas({ resultado: 'fracasso' });

      const analise = {
        total_fracassos: stats.fracassos,
        taxa_falha: (100 - stats.taxa_sucesso),
        intencoes_problematicas: {},
        etapas_criticas: {}
      };

      // Identificar intenções que levam a fracasso
      for (const [intencao, count] of Object.entries(stats.intencoes || {})) {
        const conversas_com_intencao = learningManager.analisarConversas({ dataApos: new Date(Date.now() - 7*24*60*60*1000).toISOString() });

        // Estimar taxa de fracasso por intenção
        analise.intencoes_problematicas[intencao] = {
          ocorrencias: count,
          recomendacao: 'Melhorar resposta para esta intenção'
        };
      }

      logger.info('📈 Análise de falhas concluída', analise);
      return analise;
    } catch (err) {
      logger.error('❌ Erro ao analisar falhas', { erro: err.message });
      return { total_fracassos: 0 };
    }
  }

  /**
   * Gera relatório com recomendações de melhoria
   */
  gerarRelatorioDeMelhoria() {
    logger.info('📋 Gerando relatório de melhoria...');

    try {
      const stats = learningManager.analisarConversas();
      const falhas = this.analisarFalhas();
      const padroes = Array.from(learningManager.padroesSucesso.values())
        .sort((a, b) => b.taxaSucesso - a.taxaSucesso)
        .slice(0, 10);

      const relatorio = {
        data_geracao: new Date().toISOString(),
        resumo: {
          total_conversas: stats.total,
          taxa_sucesso: `${stats.taxa_sucesso}%`,
          taxa_fracasso: `${100 - stats.taxa_sucesso}%`,
          duracao_media: `${stats.duracao_media_ms}ms`
        },
        melhores_respostas: padroes.map(p => ({
          intencao: p.intencao,
          resposta: p.resposta.substring(0, 100) + '...',
          taxa_sucesso: `${p.taxaSucesso}%`,
          vezes_usado: p.tentativas
        })),
        areas_para_melhorar: {
          intencoes_problematicas: falhas.intencoes_problematicas,
          etapas_criticas: falhas.etapas_criticas
        },
        recomendacoes: [
          `Fokus nas intenções com taxa de sucesso baixa: ${Object.keys(falhas.intencoes_problematicas || {})[0] || 'nenhuma'}`,
          'Aumentar variedade de respostas para intenções com poucos padrões',
          'Analisar conversas de fracasso para melhorar classificação de intenções',
          'Considerar adicionar novas intenções baseadas em padrões descobertos'
        ]
      };

      logger.info('✅ Relatório gerado', { taxa_sucesso: relatorio.resumo.taxa_sucesso });
      return relatorio;
    } catch (err) {
      logger.error('❌ Erro ao gerar relatório', { erro: err.message });
      return { erro: err.message };
    }
  }
}

// Se for executado diretamente como script
if (require.main === module) {
  const retrain = new NLPRetrain();

  (async () => {
    try {
      console.log('\n=== SISTEMA DE RETREINAMENTO DO NLP ===\n');

      const resultado = await retrain.retreinarComNovosPadroes();
      console.log('\n✅ Retreinamento:', resultado);

      const relatorio = retrain.gerarRelatorioDeMelhoria();
      console.log('\n📋 Relatório de Melhoria:');
      console.log(JSON.stringify(relatorio, null, 2));
    } catch (err) {
      console.error('❌ Erro:', err.message);
      process.exit(1);
    }
  })();
}

module.exports = NLPRetrain;
