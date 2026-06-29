// Parser CSV robusto com suporte a aspas e detecção automática de delimitador
function lerCsv(texto) {
  // Remove BOM UTF-8 se presente
  if (texto.charCodeAt(0) === 0xFEFF) {
    texto = texto.slice(1);
  }

  // Detectar delimitador (vírgula ou ponto e vírgula)
  const primeiraLinha = texto.split('\n')[0];
  const delimitador = primeiraLinha.includes(';') && !primeiraLinha.includes(',') ? ';' : ',';

  const linhas = [];
  let linha = [];
  let campo = '';
  let aspas = false;

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];

    if (c === '"' && aspas && texto[i + 1] === '"') {
      campo += '"';
      i++;
    } else if (c === '"') {
      aspas = !aspas;
    } else if (c === delimitador && !aspas) {
      linha.push(campo);
      campo = '';
    } else if ((c === '\n' || c === '\r') && !aspas) {
      if (c === '\r' && texto[i + 1] === '\n') i++;
      linha.push(campo);
      campo = '';
      if (linha.some(v => v.trim())) linhas.push(linha);
      linha = [];
    } else {
      campo += c;
    }
  }

  linha.push(campo);
  if (linha.some(v => v.trim())) linhas.push(linha);

  return linhas;
}

module.exports = { lerCsv };
