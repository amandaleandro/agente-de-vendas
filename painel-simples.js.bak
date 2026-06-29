const http = require('http');
const PORT = 3099;

const configHTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🎛️ Fezinha - Painel de Configuração</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: #667eea; min-height: 100vh; }
        header { background: rgba(0,0,0,0.3); color: white; padding: 20px; text-align: center; }
        h1 { font-size: 2em; }
        .nav { background: white; display: flex; flex-wrap: wrap; padding: 0 20px; border-bottom: 2px solid #ddd; }
        .nav-btn { background: none; border: none; padding: 12px 20px; cursor: pointer; font-weight: 500; color: #666; border-bottom: 3px solid transparent; }
        .nav-btn:hover { color: #667eea; }
        .nav-btn.active { color: #667eea; border-bottom-color: #667eea; }
        .container { max-width: 1200px; margin: 0 auto; padding: 30px 20px; }
        .section { display: none; }
        .section.active { display: block; }
        .panel { background: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
        .panel h3 { color: #667eea; margin-bottom: 15px; }
        .form-group { margin-bottom: 15px; }
        label { display: block; margin-bottom: 5px; font-weight: 500; }
        input, select, textarea { width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 5px; font-family: inherit; }
        input:focus { outline: none; border-color: #667eea; }
        .btn { padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; font-weight: 600; margin-right: 10px; margin-top: 10px; }
        .btn-primary { background: #667eea; color: white; }
        .btn-primary:hover { background: #5568d3; }
        .btn-success { background: #28a745; color: white; }
        .btn-danger { background: #dc3545; color: white; }
        .status-badge { display: inline-block; padding: 5px 10px; border-radius: 15px; font-size: 0.85em; font-weight: bold; margin: 10px 0; }
        .badge-ok { background: #d4edda; color: #155724; }
        .badge-warn { background: #fff3cd; color: #856404; }
        .badge-error { background: #f8d7da; color: #721c24; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; }
        footer { text-align: center; color: white; padding: 20px; margin-top: 40px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }
        .stat-box { background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #667eea; }
        .stat-num { font-size: 1.5em; font-weight: bold; color: #667eea; }
        .numero-card { border: 2px solid #ddd; border-radius: 10px; padding: 20px; margin: 15px 0; background: #f9f9f9; }
        .numero-card h4 { color: #667eea; margin-bottom: 10px; }
        .qrcode-container { text-align: center; padding: 20px; background: white; border-radius: 8px; margin: 10px 0; }
        .qrcode-container canvas { max-width: 100%; }
        .status-item { display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #eee; }
        .status-item .name { font-weight: 500; }
        .status-item .badge { margin-left: 10px; }
        .loading { opacity: 0.6; }
    </style>
    <script>
        let whatsappStatus = null;

        async function carregarStatus() {
            try {
                const res = await fetch('/api/whatsapp-status');
                const data = await res.json();
                whatsappStatus = data;
                atualizarInterface();
            } catch (e) {
                console.error('Erro ao carregar status:', e);
            }
        }

        function atualizarInterface() {
            if (!whatsappStatus) return;

            // Atualizar stat boxes
            document.getElementById('total-numeros').innerText = whatsappStatus.total;
            document.getElementById('conectados-numeros').innerText = whatsappStatus.conectados;
            document.getElementById('pendentes-numeros').innerText = (whatsappStatus.total - whatsappStatus.conectados);

            // Atualizar lista de números
            const container = document.getElementById('whatsapp-items');
            container.innerHTML = '';

            whatsappStatus.status.forEach(ws => {
                const div = document.createElement('div');
                div.className = 'numero-card';

                const status = ws.conectado ? '✅ Conectado' : (ws.temQR ? '⏳ Escaneie QR' : '❌ Aguardando');
                const statusClass = ws.conectado ? 'badge-ok' : (ws.temQR ? 'badge-warn' : 'badge-error');

                div.innerHTML = \`
                    <h4>📱 \${ws.nome} (Número \${ws.numero})</h4>
                    <div style="margin: 10px 0;">
                        <span class="status-badge \${statusClass}">\${status}</span>
                    </div>
                \`;

                if (ws.temQR && !ws.conectado) {
                    div.innerHTML += \`<div id="qr-\${ws.numero}" class="qrcode-container" style="margin-top: 15px;"></div>\`;
                }

                container.appendChild(div);
            });

            // Renderizar QR codes
            carregarQRCodes();
        }

        async function carregarQRCodes() {
            try {
                const res = await fetch('/api/qrcodes');
                const data = await res.json();

                for (const [sessao, qr] of Object.entries(data.qrcodes)) {
                    const numero = sessao.replace('fezinha-', '');
                    const container = document.getElementById(\`qr-\${numero}\`);
                    if (container && !container.innerHTML.includes('svg')) {
                        container.innerHTML = '';
                        new QRCode(container, {
                            text: qr,
                            width: 200,
                            height: 200,
                            colorDark: '#000000',
                            colorLight: '#ffffff',
                            correctLevel: QRCode.CorrectLevel.H
                        });
                    }
                }
            } catch (e) {
                console.error('Erro ao carregar QR codes:', e);
            }
        }

        function switchSection(name) {
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            document.getElementById(name).classList.add('active');
            event.target.classList.add('active');

            if (name === 'conexao') {
                carregarStatus();
            }
        }

        function salvar(tipo) {
            alert('✅ ' + tipo + ' salvo com sucesso!');
        }

        // Carregar status a cada 5 segundos quando na aba Conexão
        setInterval(() => {
            if (document.getElementById('conexao').classList.contains('active')) {
                carregarStatus();
            }
        }, 5000);

        window.addEventListener('load', () => {
            carregarStatus();
        });
    </script>
</head>
<body>
    <header>
        <h1>🎛️ FEZINHA - Painel de Configuração</h1>
        <p>Configure tudo pelo navegador</p>
    </header>

    <div class="nav">
        <button class="nav-btn active" onclick="switchSection('conexao')">🔌 Conexão</button>
        <button class="nav-btn" onclick="switchSection('whatsapp')">📱 WhatsApp</button>
        <button class="nav-btn" onclick="switchSection('prospeccao')">📞 Prospecção</button>
        <button class="nav-btn" onclick="switchSection('ia')">🤖 IA</button>
        <button class="nav-btn" onclick="switchSection('roteiro')">💬 Roteiro</button>
        <button class="nav-btn" onclick="switchSection('base')">📚 Base</button>
        <button class="nav-btn" onclick="switchSection('sistema')">⚙️ Sistema</button>
    </div>

    <div class="container">
        <!-- CONEXÃO -->
        <div id="conexao" class="section active">
            <div class="panel">
                <h3>🔌 Status de Conexão WhatsApp</h3>
                <div class="grid">
                    <div class="stat-box">
                        <div class="stat-num" id="total-numeros">-</div>
                        Números Configurados
                    </div>
                    <div class="stat-box">
                        <div class="stat-num" id="conectados-numeros">-</div>
                        Conectados
                    </div>
                    <div class="stat-box">
                        <div class="stat-num" id="pendentes-numeros">-</div>
                        Aguardando QR
                    </div>
                </div>

                <h4 style="margin-top: 20px; color: #667eea;">Números WhatsApp:</h4>
                <div id="whatsapp-items" class="loading">
                    ⏳ Carregando...
                </div>

                <div style="margin-top: 20px; padding: 15px; background: #e7f3ff; border-radius: 8px; border-left: 4px solid #2196F3;">
                    <strong>💡 Como conectar:</strong>
                    <ol style="margin-top: 10px; margin-left: 20px;">
                        <li>Abra o WhatsApp no seu celular</li>
                        <li>Aponte a câmera para o QR code acima</li>
                        <li>Confirme a conexão</li>
                        <li>O status mudará para ✅ Conectado em alguns segundos</li>
                    </ol>
                </div>
            </div>
        </div>

        <!-- WHATSAPP CONFIG -->
        <div id="whatsapp" class="section">
            <div class="panel">
                <h3>📱 Configuração de WhatsApp</h3>

                <h4>Número 1</h4>
                <div class="form-group">
                    <label>Nome</label>
                    <input type="text" value="Amanda">
                </div>
                <div class="form-group">
                    <label>Estilo</label>
                    <input type="text" value="acolhedora, direta e espontânea">
                </div>

                <h4 style="margin-top: 20px;">Número 2</h4>
                <div class="form-group">
                    <label>Nome</label>
                    <input type="text" value="Yzak">
                </div>
                <div class="form-group">
                    <label>Estilo</label>
                    <input type="text" value="consultivo, descontraído e objetivo">
                </div>

                <h4 style="margin-top: 20px;">Número 3</h4>
                <div class="form-group">
                    <label>Nome</label>
                    <input type="text" value="Yzak">
                </div>
                <div class="form-group">
                    <label>Estilo</label>
                    <input type="text" value="direto, estratégico e comercial">
                </div>

                <button class="btn btn-primary" onclick="salvar('WhatsApp')">💾 Salvar</button>
            </div>
        </div>

        <!-- PROSPECÇÃO -->
        <div id="prospeccao" class="section">
            <div class="panel">
                <h3>📞 Configuração de Prospecção</h3>
                <div class="grid">
                    <div class="stat-box"><div class="stat-num">20</div>Contatos</div>
                    <div class="stat-box"><div class="stat-num">0</div>Prospectados</div>
                    <div class="stat-box"><div class="stat-num">20</div>Pendentes</div>
                </div>

                <div class="form-group">
                    <label>📄 Carregar lista CSV</label>
                    <input type="file" accept=".csv">
                </div>

                <div class="form-group">
                    <label>Prospecção Ativa?</label>
                    <select><option selected>✅ Sim</option><option>❌ Não</option></select>
                </div>

                <div class="form-group">
                    <label>Intervalo entre envios (minutos)</label>
                    <input type="number" value="2" min="1">
                </div>

                <button class="btn btn-primary" onclick="salvar('Prospecção')">💾 Salvar</button>
                <button class="btn btn-danger">🗑️ Limpar Histórico</button>
            </div>
        </div>

        <!-- IA -->
        <div id="ia" class="section">
            <div class="panel">
                <h3>🤖 Configuração de IA</h3>

                <h4>Gemini (Google)</h4>
                <div class="form-group">
                    <label>API Key</label>
                    <input type="password" placeholder="Sua chave API">
                </div>
                <div class="form-group">
                    <label>Modelo</label>
                    <input type="text" value="gemini-2.5-flash">
                </div>

                <h4 style="margin-top: 20px;">XAI (Grok)</h4>
                <div class="form-group">
                    <label>API Key</label>
                    <input type="password" placeholder="Sua chave API">
                </div>
                <div class="form-group">
                    <label>Modelo</label>
                    <input type="text" value="grok-beta">
                </div>

                <h4 style="margin-top: 20px;">Configurações</h4>
                <div class="form-group">
                    <label>Temperatura (0-1)</label>
                    <input type="number" value="0.3" min="0" max="1" step="0.1">
                </div>
                <div class="form-group">
                    <label>Máximo de Tokens</label>
                    <input type="number" value="500">
                </div>

                <button class="btn btn-primary" onclick="salvar('IA')">💾 Salvar</button>
                <button class="btn btn-success">🧪 Testar Conexão</button>
            </div>
        </div>

        <!-- ROTEIRO -->
        <div id="roteiro" class="section">
            <div class="panel">
                <h3>💬 Editor de Roteiro</h3>

                <h4>Exemplo: "Não tenho interesse"</h4>
                <div class="form-group">
                    <label>Resposta Pré-pronta</label>
                    <textarea>Tranquilo, respeito sua agenda! 😊 Só deixa eu avisar: o FechaPro já ajudou centenas a fechar 3x mais vendas com menos trabalho.</textarea>
                </div>

                <button class="btn btn-primary" onclick="salvar('Roteiro')">💾 Salvar</button>
                <button class="btn btn-success">➕ Adicionar Novo Padrão</button>

                <h4 style="margin-top: 20px;">Padrões Atuais</h4>
                <table>
                    <tr><th>Padrão</th><th>Ações</th></tr>
                    <tr><td>Não tenho interesse</td><td><button class="btn btn-success" style="padding:5px 10px;">Editar</button></td></tr>
                    <tr><td>Muito caro</td><td><button class="btn btn-success" style="padding:5px 10px;">Editar</button></td></tr>
                    <tr><td>Preciso pensar</td><td><button class="btn btn-success" style="padding:5px 10px;">Editar</button></td></tr>
                </table>
            </div>
        </div>

        <!-- BASE DE CONHECIMENTO -->
        <div id="base" class="section">
            <div class="panel">
                <h3>📚 Base de Conhecimento</h3>

                <h4>Carregar Documentos</h4>
                <div class="form-group">
                    <label>📄 Arquivo (PDF, DOCX, TXT)</label>
                    <input type="file" accept=".pdf,.docx,.txt">
                </div>

                <h4 style="margin-top: 20px;">Adicionar Manualmente</h4>
                <div class="form-group">
                    <label>Tema</label>
                    <input type="text" placeholder="Ex: Preços e Planos">
                </div>
                <div class="form-group">
                    <label>Conteúdo</label>
                    <textarea>Temos 3 planos: Mensal R$ 97, Anual R$ 997, Vitalício R$ 1.397</textarea>
                </div>

                <button class="btn btn-primary" onclick="salvar('Base')">💾 Salvar</button>
            </div>
        </div>

        <!-- SISTEMA -->
        <div id="sistema" class="section">
            <div class="panel">
                <h3>⚙️ Configurações do Sistema</h3>

                <h4>Performance</h4>
                <div class="form-group">
                    <label>Limite de Memória (GB)</label>
                    <input type="number" value="3" min="1">
                </div>
                <div class="form-group">
                    <label>Limpar Cache a cada (minutos)</label>
                    <input type="number" value="5" min="1">
                </div>

                <h4 style="margin-top: 20px;">Backup</h4>
                <div class="form-group">
                    <label>Backup Automático a cada (horas)</label>
                    <input type="number" value="6" min="1">
                </div>

                <h4 style="margin-top: 20px;">Logs</h4>
                <div class="form-group">
                    <label>Nível de Log</label>
                    <select>
                        <option>🐛 Debug</option>
                        <option selected>ℹ️ Info</option>
                        <option>⚠️ Warn</option>
                        <option>❌ Error</option>
                    </select>
                </div>

                <button class="btn btn-primary" onclick="salvar('Sistema')">💾 Salvar</button>
                <button class="btn btn-success">💾 Backup Agora</button>
                <button class="btn btn-danger">🔄 Reiniciar</button>
            </div>
        </div>
    </div>

    <footer>
        <p>🚀 Fezinha v3.0 - Configure tudo sem tocar no código</p>
    </footer>
</body>
</html>`;

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];

  if (url === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, timestamp: new Date().toISOString() }));
    return;
  }

  if (url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ healthy: true }));
    return;
  }

  // Painel de configuração
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(configHTML);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ SERVIDOR WEB: http://localhost:${PORT}`);
  console.log(`🎛️  PAINEL DE CONFIGURAÇÃO: http://localhost:${PORT}\n`);
});
