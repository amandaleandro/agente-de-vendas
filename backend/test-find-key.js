const leadAnalyzer = require('./modules/lead-analyzer');

const testObj = {
  'AvaliaÃ§Ã£o': '5,0',
  'NomeÂ': 'Test',
  'Quantidade de AvaliaÃ§Ãµes': '(10)'
};

console.log('Test object:');
Object.entries(testObj).forEach(([k, v]) => {
  console.log(`  "${k}" = "${v}"`);
});

console.log('\n\nTestando normalizeForSearch:');
console.log(`  'avaliacao' -> '${leadAnalyzer.normalizeForSearch('avaliacao')}'`);
console.log(`  'AvaliaÃ§Ã£o' -> '${leadAnalyzer.normalizeForSearch('AvaliaÃ§Ã£o')}'`);

console.log('\n\nTestando findKey:');
const result = leadAnalyzer.findKey(testObj, 'avaliacao');
console.log(`  findKey(testObj, 'avaliacao') = "${result}"`);
console.log(`  valor = "${testObj[result]}"`);
