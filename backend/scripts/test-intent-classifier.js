const assert = require('assert');
const fs = require('fs');
const path = require('path');
const classifier = require('../modules/intent-classifier');

const arquivoCasos = path.join(__dirname, '..', 'tests', 'intent-cases.json');
const casos = JSON.parse(fs.readFileSync(arquivoCasos, 'utf8'));

for (const caso of casos) {
  const resultado = classifier.classificarMensagem(caso.texto);
  assert.strictEqual(resultado.action, caso.action, `${caso.texto}: action ${resultado.action}`);
  assert.strictEqual(resultado.intent, caso.intent, `${caso.texto}: intent ${resultado.intent}`);
  assert.strictEqual(typeof resultado.confidence, 'number', `${caso.texto}: confidence ausente`);
  assert(resultado.confidence >= 0 && resultado.confidence <= 1, `${caso.texto}: confidence fora de 0..1`);

  if (caso.respostaContem) {
    assert(
      String(resultado.resposta || '').includes(caso.respostaContem),
      `${caso.texto}: resposta nao contem "${caso.respostaContem}"`
    );
  }
}

console.log(`OK: ${casos.length} casos do intent-classifier passaram.`);
