/**
 * Conexão com PostgreSQL
 * Exporta pool para uso em outros módulos
 */

const { Pool } = require('pg');

require('dotenv').config({
  path: require('path').join(__dirname, 'config', '.env'),
  override: process.env.NODE_ENV !== 'production'
});

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'fechapro',
  port: process.env.DB_PORT || 5432,
  connectionTimeoutMillis: 3000,
});

pool.on('error', (err) => {
  console.error('❌ Erro não esperado no pool PostgreSQL:', err);
});

module.exports = pool;
