const leadAnalyzer = require('./modules/lead-analyzer');
const smartGenerator = require('./modules/smart-generator');
const path = require('path');

const csvPath = path.join(__dirname, 'data', 'google.csv');
const leads = smartGenerator.loadCSV(csvPath);

console.log('Analisando primeiro lead:\n');
const firstLead = leads[0];

console.log('Colunas disponíveis:');
Object.keys(firstLead).forEach((key, i) => {
  console.log(`  ${i}: "${key}" = "${firstLead[key].substring(0, 50)}"`);
});

console.log('\n\nProcurando coluna de avaliação...');
const avaliacaoKey = Object.keys(firstLead).find(k => k.toLowerCase().includes('avaliac'));
console.log(`Encontrada: "${avaliacaoKey}"`);
console.log(`Valor: "${firstLead[avaliacaoKey]}"`);

const avaliacaoStr = (firstLead[avaliacaoKey] || '0').toString().replace(',', '.');
console.log(`Convertido: "${avaliacaoStr}"`);
console.log(`ParseFloat: ${parseFloat(avaliacaoStr)}`);

console.log('\n\nAnálise completa:');
const analysis = leadAnalyzer.analyze(firstLead);
console.log(`Nome: ${analysis.nome}`);
console.log(`Rating: ${analysis.rating}`);
console.log(`Reviews: ${analysis.reviews}`);
console.log(`Perfil: ${analysis.profile}`);
