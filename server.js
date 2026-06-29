const http = require('http');

const PORT = 3099;

const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fezinha QR Codes</title>
    <style>
        body { font-family: Arial; background: #667eea; color: white; padding: 40px; text-align: center; }
        .container { max-width: 800px; margin: 0 auto; background: white; color: #333; padding: 30px; border-radius: 15px; }
        h1 { color: #667eea; }
        .qr-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 30px 0; }
        .qr-card { background: #f5f5f5; padding: 20px; border-radius: 10px; }
        .qr-card h3 { color: #667eea; margin: 10px 0; }
        .qr-card p { font-size: 12px; color: #666; }
        .code { font-family: monospace; background: #000; color: #0f0; padding: 10px; border-radius: 5px; font-size: 11px; margin: 10px 0; max-height: 180px; overflow: auto; text-align: left; }
        .info { background: #f0f0f0; padding: 15px; border-radius: 10px; margin-top: 20px; text-align: left; }
        .info ol { margin-left: 20px; }
        .info li { margin: 10px 0; }
        .status { margin-top: 20px; padding: 15px; background: #d4edda; border-radius: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>📱 Fezinha - Conectar WhatsApp</h1>
        <p>Veja os QR codes abaixo e siga as instruções</p>

        <div class="qr-grid">
            <div class="qr-card">
                <h3>🤖 Amanda</h3>
                <p>acolhedora, direta</p>
                <div class="code">AGENDE\nQRCODE\nAQUI</div>
                <p id="status1">⏳ Aguardando...</p>
            </div>
            <div class="qr-card">
                <h3>🤖 Yzak</h3>
                <p>consultivo, descontraído</p>
                <div class="code">AGENDE\nQRCODE\nAQUI</div>
                <p id="status2">⏳ Aguardando...</p>
            </div>
            <div class="qr-card">
                <h3>🤖 Marina</h3>
                <p>consultiva, empática</p>
                <div class="code">AGENDE\nQRCODE\nAQUI</div>
                <p id="status3">⏳ Aguardando...</p>
            </div>
            <div class="qr-card">
                <h3>🤖 Lucas</h3>
                <p>direto, estratégico</p>
                <div class="code">AGENDE\nQRCODE\nAQUI</div>
                <p id="status4">⏳ Aguardando...</p>
            </div>
        </div>

        <div class="info">
            <h3>📖 Como Conectar:</h3>
            <ol>
                <li><strong>No celular:</strong> Abra WhatsApp</li>
                <li><strong>Vá em:</strong> Configurações → Aparelhos vinculados</li>
                <li><strong>Clique em:</strong> Vincular um aparelho</li>
                <li><strong>Aponte a câmera:</strong> Para o QR code do Terminal (não desta página)</li>
                <li><strong>Aguarde:</strong> 10-20 segundos para conectar</li>
                <li><strong>Repita:</strong> Para os 4 números</li>
            </ol>
        </div>

        <div class="status">
            <strong>⚠️ IMPORTANTE:</strong> Os QR codes aparecem no <strong>Terminal do Bot</strong>, não nesta página!<br>
            <strong>Veja o Terminal 1</strong> para ver os códigos a escanear.
        </div>
    </div>
</body>
</html>`;

const server = http.createServer((req, res) => {
  console.log(`${new Date().toLocaleTimeString()} - ${req.method} ${req.url}`);

  if (req.url === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ conectado: true, numerosConectados: 1, numerosConfigurados: 4 }));
  } else {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  }
});

server.listen(PORT, () => {
  console.log(`\n✅ WEBSERVER RODANDO EM http://localhost:${PORT}\n`);
});

server.on('error', (err) => {
  console.error('❌ ERRO:', err);
  process.exit(1);
});
