/**
 * Learning API - Endpoints para gerenciar e visualizar aprendizado do bot
 */

const learningManager = require('./learning-manager');
const logger = require('./logger');

module.exports = (app) => {
  /**
   * GET /api/learning/stats
   * Retorna estatísticas de conversas
   */
  app.get('/api/learning/stats', (req, res) => {
    try {
      const filtro = {
        resultado: req.query.resultado || null,
        dataApos: req.query.dataApos || null
      };

      const stats = learningManager.analisarConversas(filtro);
      res.json(stats);
    } catch (err) {
      logger.error('Erro ao obter stats', { erro: err.message });
      res.status(500).json({ erro: err.message });
    }
  });

  /**
   * GET /api/learning/padroes
   * Retorna padrões de sucesso descobertos
   */
  app.get('/api/learning/padroes', (req, res) => {
    try {
      const intencao = req.query.intencao;
      const limite = parseInt(req.query.limite) || 10;

      if (intencao) {
        const melhores = learningManager.obterMelhoresRespostas(intencao, limite);
        res.json({ intencao, respostas: melhores });
      } else {
        // Retorna todos os padrões ordenados por taxa de sucesso
        const padroes = Array.from(learningManager.padroesSucesso.values())
          .sort((a, b) => b.taxaSucesso - a.taxaSucesso)
          .slice(0, 50);
        res.json({ total: learningManager.padroesSucesso.size, padroes });
      }
    } catch (err) {
      logger.error('Erro ao obter padrões', { erro: err.message });
      res.status(500).json({ erro: err.message });
    }
  });

  /**
   * GET /api/learning/conversas
   * Retorna últimas conversas registradas
   */
  app.get('/api/learning/conversas', (req, res) => {
    try {
      const limite = parseInt(req.query.limite) || 20;
      const conversas = learningManager.obterUltimasConversas(limite);
      res.json(conversas);
    } catch (err) {
      logger.error('Erro ao obter conversas', { erro: err.message });
      res.status(500).json({ erro: err.message });
    }
  });

  /**
   * GET /api/learning/export/csv
   * Exporta conversas em CSV
   */
  app.get('/api/learning/export/csv', (req, res) => {
    try {
      const csv = learningManager.exportarCSV();
      res.set('Content-Type', 'text/csv');
      res.set('Content-Disposition', 'attachment; filename="conversas_bot.csv"');
      res.send(csv);
    } catch (err) {
      logger.error('Erro ao exportar CSV', { erro: err.message });
      res.status(500).json({ erro: err.message });
    }
  });

  /**
   * GET /api/learning/treinamento
   * Retorna dados para retreinamento do NLP
   */
  app.get('/api/learning/treinamento', (req, res) => {
    try {
      const dados = learningManager.gerarDadosTreinamento();
      res.json({
        novasFrases: dados.novasFrases.length,
        detalhes: dados.novasFrases.slice(0, 50) // Primeiras 50 para visualização
      });
    } catch (err) {
      logger.error('Erro ao gerar dados de treinamento', { erro: err.message });
      res.status(500).json({ erro: err.message });
    }
  });

  /**
   * POST /api/learning/registrar-sucesso
   * Registra uma conversa bem-sucedida
   * Body: { telefone, motivo }
   */
  app.post('/api/learning/registrar-sucesso', (req, res) => {
    try {
      const { telefone, motivo } = req.body;
      if (!telefone) {
        return res.status(400).json({ erro: 'telefone é obrigatório' });
      }

      learningManager.registrarResultado(
        telefone,
        'sucesso',
        motivo || 'manual'
      );

      res.json({ sucesso: true, mensagem: 'Conversa registrada como sucesso' });
    } catch (err) {
      logger.error('Erro ao registrar sucesso', { erro: err.message });
      res.status(500).json({ erro: err.message });
    }
  });

  /**
   * POST /api/learning/registrar-fracasso
   * Registra uma conversa com fracasso
   * Body: { telefone, motivo }
   */
  app.post('/api/learning/registrar-fracasso', (req, res) => {
    try {
      const { telefone, motivo } = req.body;
      if (!telefone) {
        return res.status(400).json({ erro: 'telefone é obrigatório' });
      }

      learningManager.registrarResultado(
        telefone,
        'fracasso',
        motivo || 'manual'
      );

      res.json({ sucesso: true, mensagem: 'Conversa registrada como fracasso' });
    } catch (err) {
      logger.error('Erro ao registrar fracasso', { erro: err.message });
      res.status(500).json({ erro: err.message });
    }
  });

  /**
   * POST /api/learning/recomendacao
   * Obtém recomendação de resposta baseada em histórico
   * Body: { intencao, respostasUsadas: [] }
   */
  app.post('/api/learning/recomendacao', (req, res) => {
    try {
      const { intencao, respostasUsadas } = req.body;
      if (!intencao) {
        return res.status(400).json({ erro: 'intencao é obrigatória' });
      }

      const resposta = learningManager.recomendarResposta(
        intencao,
        respostasUsadas || []
      );

      if (resposta) {
        res.json({ sucesso: true, resposta });
      } else {
        res.json({ sucesso: false, mensagem: 'Nenhuma recomendação disponível' });
      }
    } catch (err) {
      logger.error('Erro ao gerar recomendação', { erro: err.message });
      res.status(500).json({ erro: err.message });
    }
  });

  /**
   * GET /api/learning/health
   * Verifica saúde do sistema de aprendizado
   */
  app.get('/api/learning/health', (req, res) => {
    try {
      const stats = learningManager.analisarConversas();
      const padroes = learningManager.padroesSucesso.size;
      const emProgresso = learningManager.conversasEmProgresso.size;

      res.json({
        status: 'ok',
        conversas: {
          total: stats.total,
          sucessos: stats.sucessos,
          fracassos: stats.fracassos,
          taxa_sucesso: `${stats.taxa_sucesso}%`
        },
        padroes,
        emProgresso
      });
    } catch (err) {
      logger.error('Erro ao obter health', { erro: err.message });
      res.status(500).json({ status: 'erro', erro: err.message });
    }
  });
};
