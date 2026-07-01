#!/usr/bin/env node

/**
 * Script CLI para treinar o sistema com conversas reais
 *
 * Uso:
 *   node train.js                    # Pipeline completo
 *   node train.js --insights         # Apenas insights de conversão
 *   node train.js --help             # Ajuda
 */

require('dotenv').config({ path: require('path').join(__dirname, 'config', '.env'), override: true });

const { Pool } = require('pg');
const TrainingSystem = require('./modules/training-system');

// Validar argumentos
const args = process.argv.slice(2);
const command = args[0] || 'complete';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'fechapro',
  port: process.env.DB_PORT || 5432,
});

const trainer = new TrainingSystem(pool);

async function main() {
  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║          🤖 SISTEMA DE TREINAMENTO - FechaPro Bot          ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // Verificar conexão com banco
    console.log('🔌 Conectando ao banco de dados...');
    const client = await pool.connect();
    client.release();
    console.log('✅ Conexão bem-sucedida!\n');

    if (command === '--help' || command === '-h') {
      console.log('Comandos disponíveis:\n');
      console.log('  node train.js                  Treinar modelo completo');
      console.log('  node train.js --insights       Gerar insights de conversão');
      console.log('  node train.js --help           Mostrar ajuda\n');
      console.log('Resultados são salvos em: backend/conhecimento/training/\n');
      return;
    }

    if (command === '--insights' || command === '-i') {
      await trainer.gerarInsightsDeConversao();
      return;
    }

    // Default: pipeline completo
    if (command === 'complete' || command === '') {
      const relatorio = await trainer.treinarCompleto();

      if (relatorio) {
        console.log('📝 Relatório resumido:');
        console.log(JSON.stringify(relatorio.resumo, null, 2));
        console.log('\n🎯 Próximos passos:');
        relatorio.proximosPassos.forEach(passo => console.log(`   ${passo}`));

        // Gerar insights também
        console.log('\n');
        await trainer.gerarInsightsDeConversao();
      }
      return;
    }

    console.log(`❌ Comando desconhecido: ${command}`);
    console.log('Use "node train.js --help" para ver os comandos disponíveis');

  } catch (err) {
    console.error('\n❌ Erro durante treinamento:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('\n✅ Concluído!');
  }
}

main();
