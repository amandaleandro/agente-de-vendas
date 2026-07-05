const assert = require('assert');
const semanticAnalyzer = require('../modules/semantic-analyzer');
const riskGuard = require('../modules/whatsapp-risk-guard');
const qualityCenter = require('../modules/quality-center');
const abTesting = require('../modules/ab-testing');

const analise = semanticAnalyzer.analisarTexto('Mando 30 orcamentos por semana mas o cliente some depois da proposta');
assert.strictEqual(analise.volume, '30');
assert(analise.problema, 'deveria detectar dor comum');
assert(analise.especificidade >= 0.6, 'mensagem especifica deveria ter score alto');

const risco = riskGuard.analisarConteudo('clique aqui urgente no pix');
assert.strictEqual(risco.risco, 'alto');
assert(risco.termos.includes('pix'));

const simulacao = qualityCenter.simular('Quanto custa? Uso Pipedrive mas cliente nao responde.');
assert(simulacao.analise.fezPergunta);
assert(simulacao.respostaSugerida.length > 0);

const variante = abTesting.pickVariant('teste_unitario', '551199999999');
assert(['A', 'B'].includes(variante.id));
abTesting.record('teste_unitario', variante.id, 'sent');
const report = abTesting.report().find(test => test.nome === 'teste_unitario');
assert(report, 'relatorio A/B deveria conter teste');

console.log('OK: testes do cerebro do bot passaram.');
