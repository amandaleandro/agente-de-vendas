const classifier = require('./intent-classifier');

module.exports = {
  verificarGatilhoRapido: classifier.verificarGatilhoRapido,
  clientePedeHumano: classifier.clientePedeHumano,
  clienteSemInteresse: classifier.clienteSemInteresse
};
