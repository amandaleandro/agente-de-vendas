/**
 * APIs REST para gerenciar leads, scores e follow-ups
 */

module.exports = (webserver, leadScorer, followupScheduler, logger) => {
  const server = webserver.server;

  /**
   * POST /api/leads/score
   * Calcula score de um lead
   */
  server.on('request', (req, res) => {
    if (req.url === '/api/leads/score' && req.method === 'POST') {
      let body = '';

      req.on('data', chunk => {
        body += chunk.toString();
      });

      req.on('end', () => {
        try {
          const dados = JSON.parse(body);
          const { telefone, ...dadosScore } = dados;

          const resultado = leadScorer.calcularScore(telefone, dadosScore);

          // Agendar follow-up automático
          followupScheduler.agendarFollowup(telefone, resultado.score, dadosScore.etapa);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            sucesso: true,
            score: resultado
          }));
        } catch (err) {
          logger.error('Erro ao calcular score:', { erro: err.message });
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ erro: err.message }));
        }
      });
    }
  });

  /**
   * GET /api/leads/score/:telefone
   * Obtém score atual de um lead
   */
  server.on('request', (req, res) => {
    const match = req.url.match(/^\/api\/leads\/score\/(.+)$/);
    if (match && req.method === 'GET') {
      try {
        const telefone = decodeURIComponent(match[1]);
        const score = leadScorer.obterScoreAtual(telefone);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          sucesso: true,
          dados: score
        }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ erro: err.message }));
      }
    }
  });

  /**
   * GET /api/leads/prioridade
   * Lista leads por prioridade (HOT, WARM, COLD, DEAD)
   */
  server.on('request', (req, res) => {
    if (req.url === '/api/leads/prioridade' && req.method === 'GET') {
      try {
        const listas = leadScorer.listaPorPrioridade();

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          sucesso: true,
          dados: listas,
          estatisticas: leadScorer.obterEstatisticas()
        }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ erro: err.message }));
      }
    }
  });

  /**
   * GET /api/leads/estatisticas
   * Estatísticas gerais de leads
   */
  server.on('request', (req, res) => {
    if (req.url === '/api/leads/estatisticas' && req.method === 'GET') {
      try {
        const stats = leadScorer.obterEstatisticas();
        const followupStats = followupScheduler.obterEstatisticas();

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          sucesso: true,
          dados: {
            leads: stats,
            followups: followupStats
          }
        }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ erro: err.message }));
      }
    }
  });

  /**
   * GET /api/followups/pendentes
   * Lista follow-ups agendados
   */
  server.on('request', (req, res) => {
    if (req.url === '/api/followups/pendentes' && req.method === 'GET') {
      try {
        const pendentes = followupScheduler.obterPendentes();

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          sucesso: true,
          dados: pendentes
        }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ erro: err.message }));
      }
    }
  });

  /**
   * POST /api/followups/executar/:telefone
   * Executa follow-up manualmente
   */
  server.on('request', (req, res) => {
    const match = req.url.match(/^\/api\/followups\/executar\/(.+)$/);
    if (match && req.method === 'POST') {
      try {
        const telefone = decodeURIComponent(match[1]);
        const pendente = followupScheduler.followupsPendentes.get(telefone);

        if (!pendente) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ erro: 'Nenhum follow-up pendente' }));
        }

        followupScheduler.executarFollowup(telefone, pendente.tipo);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          sucesso: true,
          mensagem: 'Follow-up executado'
        }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ erro: err.message }));
      }
    }
  });

  /**
   * DELETE /api/followups/cancelar/:telefone
   * Cancela follow-up agendado
   */
  server.on('request', (req, res) => {
    const match = req.url.match(/^\/api\/followups\/cancelar\/(.+)$/);
    if (match && req.method === 'DELETE') {
      try {
        const telefone = decodeURIComponent(match[1]);
        followupScheduler.cancelarFollowup(telefone);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          sucesso: true,
          mensagem: 'Follow-up cancelado'
        }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ erro: err.message }));
      }
    }
  });

  logger.info('📚 APIs de Leads registradas');
};
