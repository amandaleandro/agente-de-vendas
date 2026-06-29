const http = require('http');
const fs = require('fs');
const path = require('path');
const APIPerspeccao = require('./api-prospeccao');

const PORT = 3099;

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.woff': 'application/font-woff',
  '.ttf': 'application/font-ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'application/font-otf',
  '.wasm': 'application/wasm'
};

const server = http.createServer((req, res) => {
  console.log(`📨 [API] ${req.method} ${req.url}`);

  try {
    const json = (status, dados) => {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(dados));
    };

    const url = req.url.split('?')[0];

    // API Routes
    if (url.startsWith('/api/')) {
      if (url === '/api/whatsapp-status') {
        const numeros = Number(process.env.WHATSAPP_NUMEROS) || 1;
        const statusList = [];
        for (let i = 1; i <= numeros; i++) {
          const sessao = `fezinha-${i}`;
          const temQR = global.qrPorSessao && global.qrPorSessao.has(sessao);
          const conectado = global.socketsConectados && global.socketsConectados.has(sessao);
          const nome = process.env[`WHATSAPP_${i}_NOME`] || `Número ${i}`;
          statusList.push({ sessao, nome, conectado, temQR, numero: i });
        }
        return json(200, { 
          status: statusList, 
          total: numeros, 
          conectados: global.socketsConectados ? global.socketsConectados.size : 0,
          conectado: (global.socketsConectados ? global.socketsConectados.size : 0) > 0,
          timestamp: new Date().toISOString()
        });
      }

      if (url === '/api/qrcodes') {
        const qrcodes = global.qrPorSessao ? Object.fromEntries(global.qrPorSessao) : {};
        return json(200, { qrcodes });
      }

      if (url === '/api/qrcode-text') {
        try {
          const qrcodeText = fs.readFileSync(path.join(__dirname, '..', 'qrcode.txt'), 'utf8');
          return json(200, { qrcode: qrcodeText });
        } catch (err) {
          return json(404, { error: 'QR Code não disponível' });
        }
      }

      if (url === '/api/status') {
        return json(200, {
          conectado: (global.socketsConectados ? global.socketsConectados.size : 0) > 0,
          numerosConectados: global.socketsConectados ? global.socketsConectados.size : 0,
          numerosConfigurados: Number(process.env.WHATSAPP_NUMEROS) || 1,
          mensagem: 'Bot funcionando perfeitamente integrado ao React',
          timestamp: new Date().toISOString()
        });
      }

      // Prospecção API
      if (url.startsWith('/api/prospeccao/') && global.prospeccaoAgenda && global.apiPerspeccao) {
        global.apiPerspeccao.processar(req, res, url).catch(err => {
          console.error('❌ Erro na API de prospecção:', err);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        });
        return;
      }

      // Fallback for missing APIs
      return json(404, { error: 'Endpoint não encontrado' });
    }

    // Serve Frontend Static Files
    let filePath = path.join(__dirname, '..', 'frontend', 'public', url === '/' ? 'index.html' : url);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      // Only fallback to index.html for root requests or .html files without extension
      if (url === '/' || (!url.includes('.') && !url.includes('/'))) {
        filePath = path.join(__dirname, '..', 'frontend', 'public', 'index.html');
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Arquivo não encontrado');
        return;
      }
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
      if (error) {
        if(error.code == 'ENOENT') {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Página não encontrada. Execute npm run build no frontend.');
        } else {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Erro interno do servidor: ' + error.code);
        }
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content, 'utf-8');
      }
    });

  } catch (error) {
    console.error('❌ Erro no Webserver:', error.message);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Erro interno do servidor');
  }
});

function startServer() {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n✅ SERVIDOR WEB E API RODANDO EM http://localhost:${PORT}\n`);
  });

  server.on('error', (err) => {
    console.error('❌ Erro do servidor web:', err);
  });
}

// Se o arquivo for rodado diretamente, inicializa o servidor. 
// Caso seja exportado (pelo index.js), permite inicialização controlada.
if (require.main === module) {
  startServer();
}

module.exports = { startServer };
