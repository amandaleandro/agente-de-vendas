const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3099;

const server = http.createServer((req, res) => {
  console.log(`📨 ${req.method} ${req.url}`);

  try {
    // Servir qrcodes.html como padrão
    if (req.url === '/' || req.url === '/qrcodes.html') {
      const filePath = path.join(__dirname, 'public', 'qrcodes.html');
      const content = fs.readFileSync(filePath, 'utf-8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(content);
      return;
    }

    // Servir status.html também
    if (req.url === '/status.html') {
      const filePath = path.join(__dirname, 'public', 'status.html');
      const content = fs.readFileSync(filePath, 'utf-8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(content);
      return;
    }

    // API /api/status
    if (req.url === '/api/status') {
      const response = JSON.stringify({
        conectado: true,
        numerosConectados: 1,
        numerosConfigurados: 4,
        mensagem: 'Bot funcionando normalmente',
        timestamp: new Date().toISOString()
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(response);
      return;
    }

    // 404
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Página não encontrada');
  } catch (error) {
    console.error('❌ Erro:', error.message);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Erro interno do servidor');
  }
});

server.listen(PORT, () => {
  console.log(`\n✅ Servidor web rodando em http://localhost:${PORT}\n`);
});

server.on('error', (err) => {
  console.error('❌ Erro do servidor:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Erro não capturado:', err);
  process.exit(1);
});
