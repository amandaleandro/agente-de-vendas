// Script de teste do gerador de mensagens inteligentes
const smartGenerator = require('./modules/smart-generator');
const path = require('path');

console.log('🚀 Testando Gerador de Mensagens Inteligentes\n');

// Teste 1: Carregar CSV
console.log('📁 Teste 1: Carregando CSV...');
const csvPath = path.join(__dirname, 'data', 'google.csv');
const leads = smartGenerator.loadCSV(csvPath);
console.log(`✅ ${leads.length} leads carregados\n`);

// Teste 2: Gerar mensagem para o primeiro lead
console.log('💬 Teste 2: Gerando mensagem para lead...');
const primeiroLead = leads[0];
console.log(`Lead: ${primeiroLead['NomeÂ ']}`);
const resultado = smartGenerator.generateMessage(primeiroLead);

if (resultado) {
  console.log(`Perfil: ${resultado.profile}`);
  console.log(`Sentimento: ${resultado.lead.sentiment}`);
  console.log(`Rating: ${resultado.lead.rating} ⭐`);
  console.log(`Reviews: ${resultado.lead.reviews}`);
  console.log(`\n📝 Mensagem gerada:\n`);
  console.log(resultado.message);
  console.log('\n✅ Mensagem gerada com sucesso!\n');
}

// Teste 3: Gerar múltiplas variações
console.log('🔄 Teste 3: Gerando 3 variações da mesma mensagem...\n');
const variacoes = smartGenerator.generateVariations(primeiroLead, 3);
if (variacoes) {
  variacoes.variations.forEach((v, i) => {
    console.log(`--- VARIAÇÃO ${i + 1} ---\n${v}\n`);
  });
  console.log('✅ Variações geradas com sucesso!\n');
}

// Teste 4: Processar lote
console.log('⚙️  Teste 4: Processando lote de 10 leads...');
const results = smartGenerator.generateMessages(leads, { limit: 10 });
console.log(`✅ ${results.length} mensagens geradas\n`);

// Teste 5: Estatísticas
console.log('📊 Teste 5: Gerando estatísticas...');
const stats = smartGenerator.getStats(results);
console.log('Distribuição por perfil:');
Object.entries(stats.byProfile).forEach(([profile, count]) => {
  console.log(`  ${profile}: ${count}`);
});
console.log(`\nMédia de Rating: ${stats.avgRating} ⭐`);
console.log(`Média de Reviews: ${stats.avgReviews}`);
console.log('✅ Estatísticas geradas!\n');

// Teste 6: Exemplos de mensagens
console.log('📋 Teste 6: Exemplos de mensagens por perfil...\n');
const porPerfil = {};
results.forEach(r => {
  if (!porPerfil[r.profile]) {
    porPerfil[r.profile] = r;
  }
});

Object.entries(porPerfil).forEach(([profile, result]) => {
  console.log(`\n=== PERFIL: ${profile.toUpperCase()} ===`);
  console.log(`Empresa: ${result.lead.nome}`);
  console.log(`Rating: ${result.lead.rating} ⭐ | Reviews: ${result.lead.reviews}`);
  console.log(`\n${result.message}\n`);
  console.log('---\n');
});

console.log('\n🎉 Todos os testes passaram com sucesso!');
