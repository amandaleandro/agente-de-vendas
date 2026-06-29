const fs = require('fs');
const path = require('path');
const readline = require('readline');

const LOG_FILE = path.join(__dirname, 'logs', 'fezinha.log');

// Cores para terminal
const cores = {
  reset: '\x1b[0m',
  verde: '\x1b[32m',
  amarelo: '\x1b[33m',
  vermelho: '\x1b[31m',
  azul: '\x1b[36m',
  branco: '\x1b[37m'
};

console.clear();
console.log(`${cores.azul}╔════════════════════════════════════════════════╗${cores.reset}`);
console.log(`${cores.azul}║         🤖 MONITOR DE LOGS - FEZINHA         ║${cores.reset}`);
console.log(`${cores.azul}╚════════════════════════════════════════════════╝${cores.reset}`);
console.log('');

// Função para colorir logs
function colorirLog(linha) {
  if (linha.includes('❌')) return cores.vermelho + linha + cores.reset;
  if (linha.includes('✅')) return cores.verde + linha + cores.reset;
  if (linha.includes('⚠️')) return cores.amarelo + linha + cores.reset;
  if (linha.includes('📞')) return cores.azul + linha + cores.reset;
  if (linha.includes('🤖') || linha.includes('📨')) return cores.azul + linha + cores.reset;
  if (linha.includes('Error') || linha.includes('ERROR')) return cores.vermelho + linha + cores.reset;
  return linha;
}

// Tentar ler arquivo de log existente
if (fs.existsSync(LOG_FILE)) {
  console.log(`${cores.verde}✅ Conectado ao arquivo de logs${cores.reset}`);
  console.log(`${cores.branco}📁 ${LOG_FILE}${cores.reset}`);
  console.log('');
  console.log(`${cores.azul}════════════════════════════════════════════════${cores.reset}`);
  console.log('');

  // Ler últimas 50 linhas
  const rl = readline.createInterface({
    input: fs.createReadStream(LOG_FILE),
    crlfDelay: Infinity
  });

  let linhas = [];
  rl.on('line', (linha) => {
    linhas.push(linha);
    if (linhas.length > 50) linhas.shift();
  });

  rl.on('close', () => {
    // Exibir últimas 50 linhas
    linhas.forEach(linha => {
      console.log(colorirLog(linha));
    });

    console.log('');
    console.log(`${cores.azul}════════════════════════════════════════════════${cores.reset}`);
    console.log('');
    console.log(`${cores.amarelo}📊 Acompanhando novos logs em tempo real...${cores.reset}`);
    console.log('');

    // Monitorar novo arquivo
    fs.watchFile(LOG_FILE, () => {
      const stats = fs.statSync(LOG_FILE);
      // Ler apenas o final do arquivo
      const tamanho = stats.size;
      const buffer = Buffer.alloc(1024);
      const fd = fs.openSync(LOG_FILE, 'r');
      fs.readSync(fd, buffer, 0, 1024, Math.max(0, tamanho - 1024));
      fs.closeSync(fd);

      const conteudo = buffer.toString('utf-8').trim();
      const novasLinhas = conteudo.split('\n').filter(l => l.trim());
      novasLinhas.forEach(linha => {
        console.log(colorirLog(linha));
      });
    });
  });
} else {
  console.log(`${cores.vermelho}❌ Arquivo de logs não encontrado${cores.reset}`);
  console.log(`${cores.branco}📁 ${LOG_FILE}${cores.reset}`);
  console.log('');
  console.log(`${cores.amarelo}⏳ Aguardando geração de logs...${cores.reset}`);
  console.log('');

  // Esperar pelo arquivo
  const watcher = fs.watch(path.join(__dirname, 'logs'), () => {
    if (fs.existsSync(LOG_FILE)) {
      console.log(`${cores.verde}✅ Arquivo de logs detectado!${cores.reset}`);
      watcher.close();
      setTimeout(() => process.exit(0), 1000);
    }
  });
}
