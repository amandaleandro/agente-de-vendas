// Arquivo de stub - este servidor será populado com requisições que vêm de fora
// O index.js carregará as dados que este servidor precisa servir

const http = require('http');
const PORT = 3100;

// Variáveis globais que serão preenchidas pelo index.js
global.qrPorSessao = new Map();
global.socketsConectados = new Set();

http.createServer((req, res) => {
  const json = (status, dados) => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(dados));
  };

  const url = req.url.split('?')[0];

  if (url === '/api/whatsapp-status') {
    const numeros = Number(process.env.WHATSAPP_NUMEROS) || 1;
    const status = [];
    for (let i = 1; i <= numeros; i++) {
      const sessao = `fezinha-${i}`;
      const temQR = global.qrPorSessao && global.qrPorSessao.has(sessao);
      const conectado = global.socketsConectados && global.socketsConectados.has(sessao);
      const nome = process.env[`WHATSAPP_${i}_NOME`] || `Número ${i}`;
      status.push({ sessao, nome, conectado, temQR, numero: i });
    }
    return json(200, { status, total: numeros, conectados: global.socketsConectados ? global.socketsConectados.size : 0 });
  }

  if (url === '/api/qrcodes') {
    const qrcodes = global.qrPorSessao ? Object.fromEntries(global.qrPorSessao) : {};
    return json(200, { qrcodes });
  }

  json(404, { erro: 'Não encontrado' });
}).listen(PORT, '0.0.0.0', () => {
  console.log(`✅ API Server: http://localhost:${PORT}`);
});
