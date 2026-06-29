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

      if (url === '/qr') {
        try {
          const qrcodeText = fs.readFileSync(path.join(__dirname, '..', 'qrcode.txt'), 'utf8');
          const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Scan QR - Fezinha</title>
    <style>
        body { font-family: Arial; text-align: center; padding: 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; color: white; }
        .box { background: white; color: #333; padding: 40px; border-radius: 15px; max-width: 600px; margin: 0 auto; box-shadow: 0 10px 40px rgba(0,0,0,0.3); }
        h1 { font-size: 2em; margin-bottom: 20px; }
        .qr { background: #f0f0f0; padding: 20px; margin: 20px 0; border: 2px dashed #667eea; border-radius: 10px; font-family: monospace; word-break: break-all; max-height: 300px; overflow-y: auto; font-size: 11px; }
        .btn { background: #667eea; color: white; padding: 15px 30px; border: none; border-radius: 8px; cursor: pointer; font-size: 1em; width: 100%; margin: 10px 0; }
        .btn:hover { opacity: 0.9; }
        .status { padding: 15px; background: #d4edda; border-radius: 8px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="box">
        <h1>🤖 Fezinha</h1>
        <p>Vincule seu WhatsApp</p>
        <div class="status">✅ QR Code Pronto!</div>
        <div class="qr">${qrcodeText}</div>
        <a href="${qrcodeText}" class="btn">✅ Abrir WhatsApp</a>
        <button class="btn" onclick="location.reload()">🔄 Recarregar</button>
        <p style="margin-top: 30px; font-size: 0.9em;">Aponte a câmera do celular para o QR acima</p>
    </div>
</body>
</html>`;
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(html);
          return;
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('QR Code não disponível');
          return;
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
    let filePath = path.join(__dirname, '..', 'frontend', 'public', url === '/' ? 'index.html' : url.substring(1));

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Arquivo não encontrado: ' + url);
      return;
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
