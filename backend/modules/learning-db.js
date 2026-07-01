/**
 * Learning DB - Opcional: Persistência de aprendizado em PostgreSQL
 * Se não usar, o sistema continua com JSONL
 */

const { Pool } = require('pg');
const logger = require('./logger');

class LearningDB {
  constructor() {
    this.enabled = process.env.LEARNING_USE_DATABASE === 'true';
    this.pool = null;

    if (this.enabled) {
      this.inicializar();
    }
  }

  async inicializar() {
    try {
      this.pool = new Pool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT
      });

      await this.criarTabelas();
      logger.info('✅ Learning DB inicializado');
    } catch (err) {
      logger.error('❌ Erro ao inicializar Learning DB', { erro: err.message });
      this.enabled = false; // Desabilitar e usar fallback
    }
  }

  /**
   * Cria tabelas se não existirem
   */
  async criarTabelas() {
    if (!this.pool) return;

    try {
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS learning_conversas (
          id SERIAL PRIMARY KEY,
          telefone VARCHAR(20) NOT NULL,
          resultado VARCHAR(20) NOT NULL,
          duracao_ms INTEGER,
          etapa_final VARCHAR(50),
          intencoes TEXT[],
          respostas TEXT[],
          mensagens_cliente TEXT[],
          motivo_encerramento TEXT,
          identidade JSONB,
          criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_learning_conversas_resultado ON learning_conversas(resultado);
        CREATE INDEX IF NOT EXISTS idx_learning_conversas_criado ON learning_conversas(criado_em);

        CREATE TABLE IF NOT EXISTS learning_padroes (
          id SERIAL PRIMARY KEY,
          intencao VARCHAR(100) NOT NULL,
          resposta TEXT NOT NULL,
          sucessos INTEGER DEFAULT 0,
          tentativas INTEGER DEFAULT 0,
          taxa_sucesso DECIMAL(5,2),
          criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(intencao, resposta)
        );

        CREATE INDEX IF NOT EXISTS idx_learning_padroes_taxa ON learning_padroes(taxa_sucesso DESC);
      `);

      logger.info('✅ Tabelas de learning criadas/verificadas');
    } catch (err) {
      logger.error('❌ Erro ao criar tabelas', { erro: err.message });
    }
  }

  /**
   * Salvar conversa no BD
   */
  async salvarConversa(telefone, conversa) {
    if (!this.enabled || !this.pool) return;

    try {
      await this.pool.query(
        `INSERT INTO learning_conversas
         (telefone, resultado, duracao_ms, etapa_final, intencoes, respostas, mensagens_cliente, motivo_encerramento, identidade)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          telefone,
          conversa.resultado,
          conversa.duracao_ms,
          conversa.etapa_final,
          conversa.intencoes,
          conversa.respostas,
          conversa.mensagens_cliente,
          conversa.motivo_encerramento,
          JSON.stringify(conversa.identidade)
        ]
      );
    } catch (err) {
      logger.error('❌ Erro ao salvar conversa no BD', { erro: err.message });
    }
  }

  /**
   * Atualizar padrão de sucesso
   */
  async atualizarPadrao(intencao, resposta, successo) {
    if (!this.enabled || !this.pool) return;

    try {
      const respostaCurta = resposta.substring(0, 100);

      // Tentar update, se não existir faz insert
      const result = await this.pool.query(
        `UPDATE learning_padroes
         SET sucessos = sucessos + $1,
             tentativas = tentativas + 1,
             taxa_sucesso = (sucessos + $1)::decimal / (tentativas + 1) * 100,
             atualizado_em = CURRENT_TIMESTAMP
         WHERE intencao = $2 AND resposta = $3
         RETURNING id`,
        [successo ? 1 : 0, intencao, respostaCurta]
      );

      if (result.rows.length === 0) {
        // Inserir novo padrão
        await this.pool.query(
          `INSERT INTO learning_padroes (intencao, resposta, sucessos, tentativas, taxa_sucesso)
           VALUES ($1, $2, $3, 1, $4)`,
          [intencao, respostaCurta, successo ? 1 : 0, successo ? 100 : 0]
        );
      }
    } catch (err) {
      logger.error('❌ Erro ao atualizar padrão', { erro: err.message });
    }
  }

  /**
   * Obter estatísticas do BD
   */
  async obterStats(filtro = {}) {
    if (!this.enabled || !this.pool) return null;

    try {
      let query = 'SELECT resultado, COUNT(*) as total FROM learning_conversas';
      const params = [];
      const conditions = [];

      if (filtro.resultado) {
        conditions.push('resultado = $' + (params.length + 1));
        params.push(filtro.resultado);
      }

      if (filtro.dataApos) {
        conditions.push('criado_em > $' + (params.length + 1));
        params.push(filtro.dataApos);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' GROUP BY resultado';

      const result = await this.pool.query(query, params);

      const stats = {
        total: result.rows.reduce((sum, r) => sum + parseInt(r.total), 0),
        sucessos: 0,
        fracassos: 0,
        indeciso: 0
      };

      result.rows.forEach(row => {
        if (row.resultado === 'sucesso') stats.sucessos = parseInt(row.total);
        if (row.resultado === 'fracasso') stats.fracassos = parseInt(row.total);
        if (row.resultado === 'indeciso') stats.indeciso = parseInt(row.total);
      });

      stats.taxa_sucesso = stats.total > 0
        ? (stats.sucessos / stats.total * 100).toFixed(1)
        : 0;

      return stats;
    } catch (err) {
      logger.error('❌ Erro ao obter stats do BD', { erro: err.message });
      return null;
    }
  }

  /**
   * Obter melhores padrões
   */
  async obterMelhoresPadroes(intencao, limite = 5) {
    if (!this.enabled || !this.pool) return [];

    try {
      const result = await this.pool.query(
        `SELECT intencao, resposta, taxa_sucesso, tentativas
         FROM learning_padroes
         WHERE intencao = $1
         ORDER BY taxa_sucesso DESC
         LIMIT $2`,
        [intencao, limite]
      );

      return result.rows;
    } catch (err) {
      logger.error('❌ Erro ao obter padrões', { erro: err.message });
      return [];
    }
  }

  /**
   * Obter conversas paginadas
   */
  async obterConversas(limite = 20, offset = 0) {
    if (!this.enabled || !this.pool) return [];

    try {
      const result = await this.pool.query(
        `SELECT * FROM learning_conversas
         ORDER BY criado_em DESC
         LIMIT $1 OFFSET $2`,
        [limite, offset]
      );

      return result.rows;
    } catch (err) {
      logger.error('❌ Erro ao obter conversas', { erro: err.message });
      return [];
    }
  }

  /**
   * Fechar conexão
   */
  async fechar() {
    if (this.pool) {
      await this.pool.end();
      logger.info('✅ Pool de BD fechado');
    }
  }
}

module.exports = new LearningDB();
