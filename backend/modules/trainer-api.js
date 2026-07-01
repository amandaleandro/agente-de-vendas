/**
 * APIs REST para o sistema de treinamento
 */

module.exports = (app, trainerService, logger) => {
  /**
   * GET /api/training/metrics
   * Obtém métricas do treinamento
   */
  app.get('/api/training/metrics', (req, res) => {
    try {
      const metricas = trainerService.obterMetricas();
      res.json({
        sucesso: true,
        dados: metricas
      });
    } catch (err) {
      logger.error('Erro ao obter métricas:', { erro: err.message });
      res.status(500).json({
        sucesso: false,
        erro: err.message
      });
    }
  });

  /**
   * GET /api/training/results
   * Obtém últimos resultados do treinamento
   */
  app.get('/api/training/results', (req, res) => {
    try {
      const resultados = trainerService.obterUltimosResultados();

      if (!resultados) {
        return res.status(404).json({
          sucesso: false,
          erro: 'Nenhum treinamento realizado ainda'
        });
      }

      res.json({
        sucesso: true,
        dados: {
          timestamp: resultados.timestamp,
          taxaConversao: resultados.analise?.conversaoRate,
          totalConversas: resultados.analise?.total,
          vendidas: resultados.analise?.conversasQueConverteram?.length,
          padroesPrincipais: resultados.padroes ?
            Object.entries(resultados.padroes)
              .slice(0, 10)
              .map(([palavra, stats]) => ({
                palavra,
                frequencia: stats.count,
                conversoes: stats.conversoes,
                taxaConversao: ((stats.conversoes / stats.count) * 100).toFixed(0) + '%'
              }))
            : []
        }
      });
    } catch (err) {
      logger.error('Erro ao obter resultados:', { erro: err.message });
      res.status(500).json({
        sucesso: false,
        erro: err.message
      });
    }
  });

  /**
   * POST /api/training/start
   * Inicia treinamento manualmente
   */
  app.post('/api/training/start', async (req, res) => {
    try {
      logger.info('Treinamento manual iniciado via API');

      trainerService.treinar().then(() => {
        logger.info('Treinamento manual concluído');
      }).catch(err => {
        logger.error('Erro no treinamento manual:', { erro: err.message });
      });

      res.json({
        sucesso: true,
        mensagem: 'Treinamento iniciado'
      });
    } catch (err) {
      logger.error('Erro ao iniciar treinamento:', { erro: err.message });
      res.status(500).json({
        sucesso: false,
        erro: err.message
      });
    }
  });

  /**
   * GET /api/training/status
   * Status do serviço de treinamento
   */
  app.get('/api/training/status', (req, res) => {
    try {
      const metricas = trainerService.obterMetricas();
      const resultados = trainerService.obterUltimosResultados();

      res.json({
        sucesso: true,
        status: {
          ativo: metricas.ativo,
          emExecucao: metricas.emExecucao,
          ultimoTreinamento: metricas.ultimoTreinamento,
          totalTreinamentos: metricas.totalTreinamentos,
          taxaConversaoMedia: metricas.taxaConversaoMedia,
          proximos5Padroes: metricas.padroesPrincipais,
          temUltimosResultados: !!resultados
        }
      });
    } catch (err) {
      logger.error('Erro ao obter status:', { erro: err.message });
      res.status(500).json({
        sucesso: false,
        erro: err.message
      });
    }
  });

  /**
   * GET /api/training/insights
   * Insights detalhados da última análise
   */
  app.get('/api/training/insights', (req, res) => {
    try {
      const resultados = trainerService.obterUltimosResultados();

      if (!resultados || !resultados.insights) {
        return res.status(404).json({
          sucesso: false,
          erro: 'Nenhum insight disponível ainda'
        });
      }

      res.json({
        sucesso: true,
        dados: {
          timestamp: resultados.timestamp,
          padroesDeSucesso: resultados.insights.padroesDeSucesso,
          recomendacoes: resultados.insights.recomendacoes,
          exemplosQueVenderam: resultados.insights.conversasQueVenderam.slice(0, 5)
        }
      });
    } catch (err) {
      logger.error('Erro ao obter insights:', { erro: err.message });
      res.status(500).json({
        sucesso: false,
        erro: err.message
      });
    }
  });

  logger.info('📚 APIs de treinamento registradas');
};
