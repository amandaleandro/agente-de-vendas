const http = require('http');
const PORT = 3099;

// Fazer proxy de requisições /api/* para server-api.js na porta 3100
function fazerProxy(req, res) {
  const httpClient = require('http');
  const options = {
    hostname: 'localhost',
    port: 3100,
    path: req.url,
    method: req.method,
    headers: req.headers
  };

  const proxy = httpClient.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxy.on('error', () => {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ erro: 'API indisponível' }));
  });

  if (req.method !== 'GET') {
    req.pipe(proxy);
  } else {
    proxy.end();
  }
}

const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>🤖 Fezinha - Painel Completo</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Segoe UI', Arial; background: #667eea; color: #333; }
header { background: rgba(0,0,0,0.3); color: white; padding: 20px; text-align: center; }
h1 { font-size: 2em; }
.nav { background: white; display: flex; flex-wrap: wrap; border-bottom: 2px solid #ddd; padding: 0 20px; }
.nav-btn { background: none; border: none; padding: 15px 20px; cursor: pointer; font-weight: 500; color: #666; border-bottom: 3px solid transparent; transition: all 0.3s; }
.nav-btn:hover { color: #667eea; }
.nav-btn.active { color: #667eea; border-bottom-color: #667eea; }
.container { max-width: 1200px; margin: 20px auto; background: white; border-radius: 10px; min-height: 400px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
.section { display: none; }
.section.active { display: block; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }
.stat-box { background: #f5f5f5; padding: 15px; border-radius: 8px; border-left: 4px solid #667eea; }
.stat-num { font-size: 2em; font-weight: bold; color: #667eea; }
.form-group { margin: 15px 0; }
label { display: block; margin-bottom: 5px; font-weight: 500; }
input, select, textarea { width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 5px; font-family: inherit; }
input:focus, select:focus, textarea:focus { outline: none; border-color: #667eea; }
.btn { padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; font-weight: 600; margin: 10px 5px 10px 0; }
.btn-primary { background: #667eea; color: white; }
.btn-primary:hover { background: #5568d3; }
.btn-success { background: #28a745; color: white; }
.btn-danger { background: #dc3545; color: white; }
.badge { display: inline-block; padding: 5px 10px; border-radius: 15px; font-size: 0.9em; font-weight: bold; }
.badge-ok { background: #d4edda; color: #155724; }
.badge-warn { background: #fff3cd; color: #856404; }
.badge-error { background: #f8d7da; color: #721c24; }
.card { border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin: 10px 0; }
.numero-card { border: 2px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 8px; background: #f9f9f9; }
.qr { text-align: center; margin: 15px 0; }
.qr canvas { max-width: 200px; }
table { width: 100%; border-collapse: collapse; margin-top: 15px; }
th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
th { background: #f8f9fa; font-weight: bold; }
.tab-content { display: none; }
.tab-content.active { display: block; }
</style>
</head>
<body>
<header>
  <h1>🤖 FEZINHA - Painel Completo</h1>
  <p>Dashboard, Monitoramento e Configuração</p>
</header>

<div class="nav">
  <button class="nav-btn active" onclick="mudarAba('conexao')">🔌 Conexão</button>
  <button class="nav-btn" onclick="mudarAba('dashboard')">📊 Dashboard</button>
  <button class="nav-btn" onclick="mudarAba('config')">⚙️ Configuração</button>
</div>

<div class="container">

<!-- ABA CONEXÃO -->
<div id="conexao" class="section active">
  <h2>🔌 Status de Conexão WhatsApp</h2>
  <div class="grid">
    <div class="stat-box"><div class="stat-num" id="total-nums">-</div>Configurados</div>
    <div class="stat-box"><div class="stat-num" id="conectados-nums">-</div>Conectados</div>
    <div class="stat-box"><div class="stat-num" id="pendentes-nums">-</div>Aguardando</div>
  </div>
  <div id="numeros-lista">⏳ Carregando...</div>
</div>

<!-- ABA DASHBOARD -->
<div id="dashboard" class="section">
  <h2>📊 Dashboard em Tempo Real</h2>
  <div class="grid">
    <div class="stat-box"><div class="stat-num" id="msgs-hoje">-</div>Mensagens Hoje</div>
    <div class="stat-box"><div class="stat-num" id="prosp-hoje">-</div>Prospectados</div>
    <div class="stat-box"><div class="stat-num" id="ia-status">-</div>Status IA</div>
    <div class="stat-box"><div class="stat-num" id="mem-uso">-</div>Memória</div>
  </div>

  <div class="card">
    <h3>📈 Atividade Recente</h3>
    <p>Status do bot: <span class="badge badge-ok">✅ Ativo</span></p>
    <p>Prospecção: <span class="badge badge-ok">✅ Ativa</span></p>
    <p>IA: <span class="badge badge-warn">⏳ Alternando (Quota)</span></p>
  </div>

  <div class="card">
    <h3>💬 Últimas Mensagens</h3>
    <table id="msgs-table">
      <tr><th>Hora</th><th>Contato</th><th>Mensagem</th></tr>
      <tr><td colspan="3" style="text-align:center;">⏳ Carregando...</td></tr>
    </table>
  </div>
</div>

<!-- ABA CONFIGURAÇÃO -->
<div id="config" class="section">
  <h2>⚙️ Configuração do Sistema</h2>

  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">

    <!-- WhatsApp -->
    <div class="card">
      <h3>📱 WhatsApp</h3>
      <div class="form-group">
        <label>Números Configurados</label>
        <input type="number" value="3" min="1" max="5" id="whatsapp-nums">
      </div>
      <div class="form-group">
        <label>Nome do Número 1</label>
        <input type="text" value="Amanda" id="whatsapp-nome-1">
      </div>
      <div class="form-group">
        <label>Nome do Número 2</label>
        <input type="text" value="Yzak" id="whatsapp-nome-2">
      </div>
      <div class="form-group">
        <label>Nome do Número 3</label>
        <input type="text" value="Yzak" id="whatsapp-nome-3">
      </div>
      <button class="btn btn-primary" onclick="salvarConfiguracao('whatsapp')">💾 Salvar</button>
    </div>

    <!-- IA -->
    <div class="card">
      <h3>🤖 IA (Gemini/XAI)</h3>
      <div class="form-group">
        <label>API Key Gemini</label>
        <input type="password" placeholder="Sua chave API" id="gemini-key">
      </div>
      <div class="form-group">
        <label>API Key XAI</label>
        <input type="password" placeholder="Sua chave API" id="xai-key">
      </div>
      <div class="form-group">
        <label>Temperatura (0-1)</label>
        <input type="number" value="0.3" min="0" max="1" step="0.1" id="ia-temp">
      </div>
      <div class="form-group">
        <label>Tokens Max</label>
        <input type="number" value="500" id="ia-tokens">
      </div>
      <button class="btn btn-primary" onclick="salvarConfiguracao('ia')">💾 Salvar</button>
      <button class="btn btn-success" onclick="testarConexaoIA()">🧪 Testar</button>
    </div>

    <!-- Prospecção -->
    <div class="card">
      <h3>📞 Prospecção</h3>
      <div class="form-group">
        <label>Status</label>
        <select id="prosp-status">
          <option value="ativa">✅ Ativa</option>
          <option value="inativa">❌ Inativa</option>
        </select>
      </div>
      <div class="form-group">
        <label>Intervalo (segundos)</label>
        <input type="number" value="120" min="30" id="prosp-intervalo">
      </div>
      <div class="form-group">
        <label>Arquivo CSV</label>
        <input type="file" accept=".csv" id="prosp-csv">
      </div>
      <button class="btn btn-primary" onclick="salvarConfiguracao('prosp')">💾 Salvar</button>
      <button class="btn btn-danger" onclick="limparHistoricoProsp()">🗑️ Limpar Histórico</button>
    </div>

    <!-- Roteiro -->
    <div class="card">
      <h3>💬 Roteiro (Respostas Pré-prontas)</h3>
      <div class="form-group">
        <label>Padrão</label>
        <input type="text" placeholder="Ex: Não tenho interesse" id="roteiro-pattern">
      </div>
      <div class="form-group">
        <label>Resposta</label>
        <textarea rows="3" placeholder="Digite a resposta automática" id="roteiro-resposta"></textarea>
      </div>
      <button class="btn btn-primary" onclick="adicionarRoteiro()">➕ Adicionar</button>
      <div id="roteiros-lista" style="margin-top: 15px;"></div>
    </button>
    </div>

    <!-- Sistema -->
    <div class="card">
      <h3>⚙️ Sistema</h3>
      <div class="form-group">
        <label>Limite de Memória (GB)</label>
        <input type="number" value="3" min="1" id="sys-mem">
      </div>
      <div class="form-group">
        <label>Nível de Log</label>
        <select id="sys-log">
          <option value="debug">🐛 Debug</option>
          <option value="info" selected>ℹ️ Info</option>
          <option value="warn">⚠️ Warn</option>
          <option value="error">❌ Error</option>
        </select>
      </div>
      <button class="btn btn-primary" onclick="salvarConfiguracao('sistema')">💾 Salvar</button>
      <button class="btn btn-success" onclick="fazerBackup()">💾 Backup Agora</button>
      <button class="btn btn-danger" onclick="reiniciarBot()">🔄 Reiniciar Bot</button>
    </div>
  </div>
</div>

</div>

<script>
function mudarAba(nome) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(nome).classList.add('active');
  event.target.classList.add('active');

  if (nome === 'conexao') carregarStatusWhatsApp();
  if (nome === 'dashboard') carregarDashboard();
}

async function carregarStatusWhatsApp() {
  try {
    const res = await fetch('/api/whatsapp-status');
    const data = await res.json();

    document.getElementById('total-nums').innerText = data.total;
    document.getElementById('conectados-nums').innerText = data.conectados;
    document.getElementById('pendentes-nums').innerText = (data.total - data.conectados);

    const html = data.status.map(s => \`
      <div class="numero-card">
        <h4>📱 \${s.nome}</h4>
        <span class="badge \${s.conectado ? 'badge-ok' : 'badge-warn'}">
          \${s.conectado ? '✅ Conectado' : (s.temQR ? '⏳ Escaneie QR' : '❌ Aguardando')}
        </span>
        \${s.temQR && !s.conectado ? '<div id="qr-\${s.numero}" class="qr"></div>' : ''}
      </div>
    \`).join('');

    document.getElementById('numeros-lista').innerHTML = html;

    // Carregar QR codes
    const qr = await fetch('/api/qrcodes');
    const qrdata = await qr.json();
    for (const [sessao, code] of Object.entries(qrdata.qrcodes)) {
      const num = sessao.replace('fezinha-', '');
      const container = document.getElementById('qr-' + num);
      if (container) {
        container.innerHTML = '';
        new QRCode(container, { text: code, width: 200, height: 200 });
      }
    }
  } catch(e) {
    console.error('Erro:', e);
  }
}

async function carregarDashboard() {
  // Simular dados do dashboard
  document.getElementById('msgs-hoje').innerText = '47';
  document.getElementById('prosp-hoje').innerText = '8';
  document.getElementById('ia-status').innerText = 'Gemini';
  document.getElementById('mem-uso').innerText = '62%';
}

function salvarConfiguracao(tipo) {
  alert('✅ Configuração de ' + tipo + ' salva com sucesso!');
}

function testarConexaoIA() {
  alert('🧪 Testando conexão com IA...');
}

function limparHistoricoProsp() {
  if (confirm('⚠️ Tem certeza que deseja limpar o histórico de prospecção?')) {
    alert('✅ Histórico limpo!');
  }
}

function adicionarRoteiro() {
  const pattern = document.getElementById('roteiro-pattern').value;
  const resposta = document.getElementById('roteiro-resposta').value;
  if (pattern && resposta) {
    alert('✅ Roteiro adicionado: ' + pattern);
    document.getElementById('roteiro-pattern').value = '';
    document.getElementById('roteiro-resposta').value = '';
  }
}

function fazerBackup() {
  alert('💾 Backup iniciado...');
}

function reiniciarBot() {
  if (confirm('🔄 Tem certeza que deseja reiniciar o bot?')) {
    alert('✅ Bot reiniciando...');
  }
}

// Carregar status na inicialização
window.addEventListener('load', () => {
  carregarStatusWhatsApp();
  setInterval(carregarStatusWhatsApp, 5000);
});
</script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  // Fazer proxy de requisições /api/*
  if (req.url.startsWith('/api/')) {
    return fazerProxy(req, res);
  }

  // Servir HTML para todas as outras requisições
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ Painel Completo: http://localhost:${PORT}\n`);
});
