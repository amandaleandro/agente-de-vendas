const http = require('http');
const fs = require('fs');
const path = require('path');
const apiProspeccao = require('./api-prospeccao');
const chatStore = require('./chat-store');

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
          const sessao = i;
          const temQR = global.qrPorSessao && global.qrPorSessao.has(sessao);
          const conectado = global.socketsConectados && global.socketsConectados.has(sessao);
          const motivo = global.motivosDesconexao ? global.motivosDesconexao.get(sessao) : null;
          const nome = process.env[`WHATSAPP_${i}_NOME`] || `Número ${i}`;
          statusList.push({ sessao, nome, conectado, temQR, numero: i, motivo });
        }
        return json(200, { 
          status: statusList, 
          total: numeros, 
          conectados: global.socketsConectados ? global.socketsConectados.size : 0,
          conectado: (global.socketsConectados ? global.socketsConectados.size : 0) > 0,
          timestamp: new Date().toISOString()
        });
      }

      if (url.startsWith('/api/whatsapp/clear/') && req.method === 'POST') {
        const sessao = url.split('/').pop();
        if (global.limparSessao) {
          global.limparSessao(sessao);
          return json(200, { success: true, message: `Sessão ${sessao} limpa com sucesso.` });
        }
        return json(500, { error: 'limparSessao não disponível' });
      }

      if (url.startsWith('/api/whatsapp/reconnect/') && req.method === 'POST') {
        const sessao = url.split('/').pop();
        if (global.reconectarSessao) {
          global.reconectarSessao(sessao);
          return json(200, { success: true, message: `Reconectando sessão ${sessao}.` });
        }
        return json(500, { error: 'reconectarSessao não disponível' });
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
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Scan QR - Fezinha</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial; text-align: center; padding: 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; color: white; display: flex; align-items: center; justify-content: center; }
        .box { background: white; color: #333; padding: 40px; border-radius: 15px; max-width: 600px; width: 100%; box-shadow: 0 10px 40px rgba(0,0,0,0.3); }
        h1 { font-size: 2.5em; margin-bottom: 10px; color: #667eea; }
        .sub { font-size: 1.1em; color: #666; margin-bottom: 30px; }
        .qr { background: #f8f9ff; padding: 20px; margin: 20px 0; border: 3px dashed #667eea; border-radius: 10px; font-family: monospace; word-break: break-all; max-height: 250px; overflow-y: auto; font-size: 10px; line-height: 1.4; color: #333; }
        .btn { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; border: none; border-radius: 8px; cursor: pointer; font-size: 1em; width: 100%; margin: 10px 0; transition: all 0.3s; }
        .btn:hover { transform: scale(1.02); box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4); }
        .status { padding: 15px; background: #d4edda; border-radius: 8px; margin-bottom: 20px; font-weight: 600; color: #155724; }
        .info { background: #f0f2ff; padding: 15px; border-radius: 8px; margin-top: 20px; font-size: 0.9em; color: #555; text-align: left; }
        .info h3 { color: #667eea; margin-bottom: 10px; }
        .info ol { margin-left: 20px; line-height: 1.8; }
    </style>
</head>
<body>
    <div class="box">
        <h1>🤖 Fezinha Bot</h1>
        <div class="sub">Vincule seu WhatsApp</div>
        <div class="status" id="status">✅ QR Code Pronto!</div>
        <div class="qr" id="qr">Carregando QR Code...</div>
        <button class="btn" onclick="location.reload()">🔄 Atualizar</button>
        <div class="info">
            <h3>📱 Como conectar:</h3>
            <ol>
                <li>Abra <strong>WhatsApp</strong> no seu celular</li>
                <li>Vá em <strong>Configurações → Dispositivos vinculados</strong></li>
                <li>Clique em <strong>Vincular dispositivo</strong></li>
                <li>Aponte a câmera para o QR acima</li>
            </ol>
        </div>
    </div>
    <script>
        async function carregarQR() {
            try {
                const response = await fetch('/api/qrcode-text');
                const data = await response.json();
                if (data.qrcode) {
                    document.getElementById('qr').textContent = data.qrcode;
                }
            } catch (e) {
                document.getElementById('qr').textContent = '❌ Erro ao carregar QR Code';
                setTimeout(carregarQR, 3000);
            }
        }
        carregarQR();
        setInterval(carregarQR, 5000);
    </script>
</body>
</html>`);
        return;
      }

      const qUrl = new URL('http://localhost' + req.url);

      if (url === '/api/chat/contacts' && req.method === 'GET') {
        const sessao = parseInt(qUrl.searchParams.get('sessao') || '1', 10);
        let contacts = chatStore.getContacts(sessao);
        // Anexa se a IA está pausada
        contacts = contacts.map(c => ({
          ...c,
          paused: global.atendimentosHumanos && global.atendimentosHumanos.has(`${sessao}:${c.jid}`)
        }));
        return json(200, { success: true, contacts });
      }

      if (url === '/api/chat/messages' && req.method === 'GET') {
        const sessao = parseInt(qUrl.searchParams.get('sessao') || '1', 10);
        const jid = qUrl.searchParams.get('jid');
        if (!jid) return json(400, { error: 'JID não fornecido' });
        
        chatStore.markAsRead(sessao, jid);
        const messages = chatStore.getMessages(sessao, jid);
        const paused = global.atendimentosHumanos && global.atendimentosHumanos.has(`${sessao}:${jid}`);
        return json(200, { success: true, messages, paused });
      }

      if (url === '/api/chat/send' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', async () => {
          try {
            const data = JSON.parse(body);
            const sessao = parseInt(data.sessao || '1', 10);
            const jid = data.jid;
            const text = data.text;
            
            if (!jid || !text) return json(400, { error: 'JID e texto obrigatórios' });
            
            const socketAtual = global.socketsConectados ? global.socketsConectados.get(sessao) : null;
            if (!socketAtual) return json(400, { error: 'Sessão WhatsApp desconectada' });

            // Pausa a IA (intervenção humana)
            if (global.atendimentosHumanos) {
              global.atendimentosHumanos.add(`${sessao}:${jid}`);
            }
            if (global.historicosPorContato) {
              global.historicosPorContato.delete(`${sessao}:${jid}`);
            }
            
            // Remove flag de atenção, pois o humano já interveio
            if (chatStore.setRequiresAttention) {
              chatStore.setRequiresAttention(sessao, jid, false);
            }

            // Envia mensagem
            await socketAtual.sendMessage(jid, { text });
            
            // Adiciona no histórico manual para o front atualizar imediatamente
            chatStore.addMessage(sessao, jid, null, {
              id: 'manual_' + Date.now(),
              text,
              fromMe: true,
              timestamp: Date.now(),
              read: true,
              isBot: false
            });

            return json(200, { success: true });
          } catch(e) {
            return json(500, { error: e.message });
          }
        });
        return;
      }

      if (url === '/api/chat/resume' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            const sessao = parseInt(data.sessao || '1', 10);
            const jid = data.jid;
            
            if (global.atendimentosHumanos) {
              global.atendimentosHumanos.delete(`${sessao}:${jid}`);
            }
            if (global.retomadasPendentes) {
              const pendente = global.retomadasPendentes.get(`${sessao}:${jid}`);
              if (pendente?.timer) clearTimeout(pendente.timer);
              global.retomadasPendentes.delete(`${sessao}:${jid}`);
            }
            if (global.historicosPorContato) {
              global.historicosPorContato.delete(`${sessao}:${jid}`);
            }
            
            // Se retomou a IA, limpar badge
            if (chatStore.setRequiresAttention) {
              chatStore.setRequiresAttention(sessao, jid, false);
            }
            
            return json(200, { success: true });
          } catch(e) {
            return json(500, { error: e.message });
          }
        });
        return;
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

      if (url === '/api/analytics/dados') {
        try {
          const ARQUIVO_PROSPECCAO = path.join(__dirname, '..', 'listas', 'prospeccao_resultados.jsonl');
          const ARQUIVO_AGENDA = path.join(__dirname, '..', 'listas', 'prospeccao_agenda.json');
          const ARQUIVO_TREINAMENTO = path.join(__dirname, '..', 'conhecimento', 'mensagens_treinamento.jsonl');
          const normalizarTelefone = (valor) => {
            let tel = String(valor || '').split('@')[0].replace(/\D/g, '');
            if ((tel.length === 10 || tel.length === 11) && !tel.startsWith('55')) tel = `55${tel}`;
            return tel;
          };
          const formatarDuracao = (ms) => {
            if (!Number.isFinite(ms) || ms < 0) return '0min';
            const totalSegundos = Math.round(ms / 1000);
            const horas = Math.floor(totalSegundos / 3600);
            const minutos = Math.floor((totalSegundos % 3600) / 60);
            const segundos = totalSegundos % 60;
            if (horas > 0) return `${horas}h ${minutos}min`;
            if (minutos > 0) return `${minutos}min ${segundos}s`;
            return `${segundos}s`;
          };
          const incrementar = (mapa, chave, dadosBase = {}) => {
            if (!mapa.has(chave)) mapa.set(chave, { ...dadosBase, total: 0 });
            mapa.get(chave).total++;
            return mapa.get(chave);
          };

          const leadsEnviados = new Map(); // telefone -> { nome, empresa, data_envio }
          const ultimosEnvios = [];
          const mensagensPorTelefone = new Map();
          const mensagensPorNumeroDia = new Map();
          const mensagensPorNumeroHora = new Map();
          
          if (fs.existsSync(ARQUIVO_PROSPECCAO)) {
            const linhas = fs.readFileSync(ARQUIVO_PROSPECCAO, 'utf8').split('\n').filter(l => l.trim());
            linhas.forEach(linha => {
              try {
                const reg = JSON.parse(linha);
                if (reg.status === 'enviado' && reg.telefone) {
                  const tel = normalizarTelefone(reg.telefone);
                  if (!leadsEnviados.has(tel) || new Date(reg.data) < new Date(leadsEnviados.get(tel).data)) {
                    leadsEnviados.set(tel, {
                      telefone: tel,
                      nome: reg.nome || 'Desconhecido',
                      empresa: reg.empresa || reg['empresa/nome'] || 'N/A',
                      data: reg.data
                    });
                  }
                  ultimosEnvios.push({
                    telefone: tel,
                    nome: reg.nome || 'Desconhecido',
                    empresa: reg.empresa || reg['empresa/nome'] || 'N/A',
                    data: reg.data,
                    sessao: reg.sessao || 1,
                    perfil: reg.perfil || ''
                  });

                  const dataEnvio = new Date(reg.data || reg.timestamp || Date.now());
                  const dia = dataEnvio.toISOString().slice(0, 10);
                  const hora = `${dia} ${String(dataEnvio.getHours()).padStart(2, '0')}:00`;
                  const numero = `Sessao ${reg.sessao || 1}`;
                  const porTelefone = incrementar(mensagensPorTelefone, tel, {
                    telefone: tel,
                    nome: reg.nome || 'Desconhecido',
                    empresa: reg.empresa || reg['empresa/nome'] || 'N/A',
                    ultima_data: reg.data
                  });
                  porTelefone.ultima_data = reg.data;
                  incrementar(mensagensPorNumeroDia, `${numero}|${dia}`, { numero, dia });
                  incrementar(mensagensPorNumeroHora, `${numero}|${hora}`, { numero, hora });
                }
              } catch(e) {}
            });
          }

          const planilhas = [];
          if (fs.existsSync(ARQUIVO_AGENDA)) {
            try {
              const agenda = JSON.parse(fs.readFileSync(ARQUIVO_AGENDA, 'utf8'));
              const statusPlanilhas = agenda.statusPlanilhas || {};
              Object.entries(statusPlanilhas).forEach(([nome, status]) => {
                const inicio = status.inicio ? new Date(status.inicio) : null;
                const fim = status.fim ? new Date(status.fim) : (status.status === 'executando' ? new Date() : null);
                const duracaoMs = inicio && fim ? fim - inicio : 0;
                planilhas.push({
                  nome,
                  status: status.status,
                  inicio: status.inicio || null,
                  fim: status.fim || null,
                  duracao_ms: duracaoMs,
                  duracao: formatarDuracao(duracaoMs),
                  contatos_totais: status.contatos_totais || 0,
                  contatos_enviados: status.contatos_enviados || 0,
                  erros: status.erros || 0
                });
              });
            } catch(e) {}
          }

          const planilhasComDuracao = planilhas.filter(p => p.duracao_ms > 0);
          const duracaoMediaMs = planilhasComDuracao.length > 0
            ? Math.round(planilhasComDuracao.reduce((sum, p) => sum + p.duracao_ms, 0) / planilhasComDuracao.length)
            : 0;

          const leadsQueResponderam = new Map(); // telefone -> { ...dados_lead, total_mensagens, ultima_mensagem }
          const registrarResposta = (telefone, texto, timestamp = Date.now()) => {
            const tel = normalizarTelefone(telefone);
            if (!tel || !leadsEnviados.has(tel)) return;

            if (!leadsQueResponderam.has(tel)) {
              leadsQueResponderam.set(tel, {
                ...leadsEnviados.get(tel),
                total_mensagens: 0,
                ultima_mensagem: texto,
                ultima_resposta_em: new Date(timestamp).toISOString()
              });
            }

            const lead = leadsQueResponderam.get(tel);
            lead.total_mensagens++;
            lead.ultima_mensagem = texto;
            lead.ultima_resposta_em = new Date(timestamp).toISOString();
          };
          
          if (fs.existsSync(ARQUIVO_TREINAMENTO)) {
            const linhas = fs.readFileSync(ARQUIVO_TREINAMENTO, 'utf8').split('\n').filter(l => l.trim());
            linhas.forEach(linha => {
              try {
                const reg = JSON.parse(linha);
                if (!reg.enviada_pelo_bot && reg.contato) {
                  registrarResposta(reg.contato, reg.texto || '', reg.timestamp || Date.now());
                }
              } catch(e){}
            });
          }

          if (chatStore && chatStore.chats) {
            chatStore.chats.forEach((sessionChats) => {
              sessionChats.forEach((chat, jid) => {
                chat.messages.forEach((msg) => {
                  if (!msg.fromMe) registrarResposta(jid, msg.text || '', msg.timestamp || Date.now());
                });
              });
            });
          }

          const leadsFormatados = Array.from(leadsQueResponderam.values()).sort((a,b) => new Date(b.ultima_resposta_em || b.data) - new Date(a.ultima_resposta_em || a.data));
          const totalProspectados = leadsEnviados.size;

          return json(200, {
            funil: {
              prospectados: totalProspectados,
              responderam: leadsQueResponderam.size,
              taxaConversao: totalProspectados > 0 ? ((leadsQueResponderam.size / totalProspectados) * 100).toFixed(1) : 0
            },
            leadsQuentes: leadsFormatados,
            ultimosEnvios: ultimosEnvios
              .sort((a,b) => new Date(b.data) - new Date(a.data))
              .slice(0, 100),
            filas: {
              duracaoMediaMs,
              duracaoMedia: formatarDuracao(duracaoMediaMs),
              totalPlanilhasMedidas: planilhasComDuracao.length,
              planilhas: planilhas.sort((a,b) => new Date(b.inicio || 0) - new Date(a.inicio || 0))
            },
            mensagens: {
              porTelefone: Array.from(mensagensPorTelefone.values())
                .sort((a,b) => b.total - a.total)
                .slice(0, 100),
              porNumeroDia: Array.from(mensagensPorNumeroDia.values())
                .sort((a,b) => b.dia.localeCompare(a.dia) || a.numero.localeCompare(b.numero)),
              porNumeroHora: Array.from(mensagensPorNumeroHora.values())
                .sort((a,b) => b.hora.localeCompare(a.hora) || a.numero.localeCompare(b.numero))
            }
          });
        } catch(e) {
          return json(500, { error: e.message });
        }
      }

      if (url === '/api/config' && req.method === 'GET') {
        const configObj = {
          WHATSAPP_NUMEROS: process.env.WHATSAPP_NUMEROS || '1',
          BOT_NUMEROS_ATIVOS: process.env.BOT_NUMEROS_ATIVOS || '1',
          GEMINI_API_KEY: process.env.GEMINI_API_KEY ? '********' : '',
          OPENAI_API_KEY: process.env.OPENAI_API_KEY ? '********' : '',
          IA_PROVIDER: process.env.IA_PROVIDER || 'gemini',
          IA_TEMPERATURE: process.env.IA_TEMPERATURE || '0.7',
        };
        const numWhatsapp = Number(process.env.WHATSAPP_NUMEROS) || 1;
        for (let i = 1; i <= numWhatsapp; i++) {
          configObj[`WHATSAPP_${i}_NOME`] = process.env[`WHATSAPP_${i}_NOME`] || `Número ${i}`;
        }
        return json(200, configObj);
      }

      if (url === '/api/config' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            const envPath = path.join(__dirname, '..', 'config', '.env');
            let envContent = '';
            if (fs.existsSync(envPath)) {
              envContent = fs.readFileSync(envPath, 'utf8');
            }
            
            // Helper to update or append
            const updateEnv = (key, value) => {
              if (value === undefined || value === '********') return;
              process.env[key] = value; // update memory
              const regex = new RegExp(`^${key}=.*`, 'm');
              if (regex.test(envContent)) {
                envContent = envContent.replace(regex, `${key}=${value}`);
              } else {
                envContent += `\n${key}=${value}`;
              }
            };

            updateEnv('WHATSAPP_NUMEROS', data.WHATSAPP_NUMEROS);
            updateEnv('BOT_NUMEROS_ATIVOS', data.BOT_NUMEROS_ATIVOS);
            updateEnv('GEMINI_API_KEY', data.GEMINI_API_KEY);
            updateEnv('OPENAI_API_KEY', data.OPENAI_API_KEY);
            updateEnv('IA_PROVIDER', data.IA_PROVIDER);
            updateEnv('IA_TEMPERATURE', data.IA_TEMPERATURE);

            // Dynamically update WhatsApp names
            Object.keys(data).forEach(key => {
              if (key.startsWith('WHATSAPP_') && key.endsWith('_NOME')) {
                updateEnv(key, data[key]);
              }
            });

            fs.writeFileSync(envPath, envContent.trim() + '\n');
            return json(200, { success: true, message: 'Configurações salvas e aplicadas!' });
          } catch (e) {
            return json(500, { error: 'Erro ao processar configurações' });
          }
        });
        return; // wait for end event
      }

      if (url === '/api/logs') {
        try {
          const logger = require('./logger');
          const linhas = logger.obterUltimosLogs(100);
          if (linhas.length > 0) {
            // Os logs já vêm como array de strings, que podem ser JSON. Vamos formatar se for JSON para facilitar leitura.
            const linhasFormatadas = linhas.map(l => {
              try {
                const obj = JSON.parse(l);
                return `[${new Date(obj.timestamp).toLocaleTimeString()}] ${obj.level}: ${obj.message}`;
              } catch(e) { return l; }
            });
            return json(200, { logs: linhasFormatadas.join('\n') });
          } else {
            return json(200, { logs: 'Nenhum log encontrado hoje. O bot ainda está iniciando ou está silencioso.' });
          }
        } catch (e) {
          return json(500, { error: 'Erro ao ler logs.' });
        }
      }

      if (url === '/api/reiniciar-bot' && req.method === 'POST') {
        try {
          console.log('🔄 Bot reiniciando via API...');
          require('dotenv').config({ path: path.join(__dirname, '..', 'config', '.env'), override: true });
          return json(200, { success: true, message: 'Configurações recarregadas com sucesso!' });
        } catch (e) {
          console.error('❌ Erro ao reiniciar bot:', e);
          return json(500, { error: 'Erro ao reiniciar bot: ' + e.message });
        }
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

      // Warmup API
      if (url === '/api/warmup/status' && req.method === 'GET') {
        try {
          if (!global.warmupManager) {
            return json(500, { error: 'WarmupManager não inicializado' });
          }
          const relatorio = global.warmupManager.obterRelatorio();
          return json(200, {
            status: relatorio,
            timestamp: new Date().toISOString()
          });
        } catch (e) {
          return json(500, { error: e.message });
        }
      }

      if (url.startsWith('/api/warmup/config/') && req.method === 'GET') {
        try {
          const sessao = parseInt(url.split('/').pop());
          if (!global.warmupManager) {
            return json(500, { error: 'WarmupManager não inicializado' });
          }
          const config = global.warmupManager.obterConfiguracao(sessao);
          return json(200, config);
        } catch (e) {
          return json(500, { error: e.message });
        }
      }

      if (url === '/api/warmup/reset' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            const sessao = parseInt(data.sessao);
            if (!global.warmupManager) {
              return json(500, { error: 'WarmupManager não inicializado' });
            }
            const resultado = global.warmupManager.resetarSessao(sessao);
            return json(200, resultado);
          } catch (e) {
            return json(500, { error: e.message });
          }
        });
        return;
      }

      if (url === '/api/warmup/reset-dia' && req.method === 'POST') {
        try {
          if (!global.warmupManager) {
            return json(500, { error: 'WarmupManager não inicializado' });
          }
          global.warmupManager.resetarDia();
          return json(200, {
            success: true,
            message: 'Reset diário executado',
            relatorio: global.warmupManager.obterRelatorio()
          });
        } catch (e) {
          return json(500, { error: e.message });
        }
      }

      if (url === '/api/warmup/estatisticas' && req.method === 'GET') {
        try {
          if (!global.warmupManager) {
            return json(500, { error: 'WarmupManager não inicializado' });
          }
          const stats = global.warmupManager.obterEstatisticas();
          return json(200, { estatisticas: stats });
        } catch (e) {
          return json(500, { error: e.message });
        }
      }

      // Warm Conversation API
      if (url === '/api/conversation/iniciar' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            const sessao1 = parseInt(data.sessao1);
            const sessao2 = parseInt(data.sessao2);
            const tema = data.tema || null;

            if (!global.warmConversation) {
              return json(500, { error: 'WarmConversation não inicializado' });
            }

            const resultado = global.warmConversation.iniciarConversa(sessao1, sessao2, tema);
            return json(resultado.sucesso ? 200 : 400, resultado);
          } catch (e) {
            return json(500, { error: e.message });
          }
        });
        return;
      }

      if (url.startsWith('/api/conversation/proxima/') && req.method === 'GET') {
        try {
          const conversaId = url.split('/').pop();
          if (!global.warmConversation) {
            return json(500, { error: 'WarmConversation não inicializado' });
          }

          // Simular digitação (delay de 500-1500ms)
          const delay = 500 + Math.random() * 1000;
          setTimeout(() => {
            const resultado = global.warmConversation.proximaMensagemNaConversa(conversaId);
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify(resultado || { erro: 'Conversa não encontrada' }));
          }, delay);
        } catch (e) {
          return json(500, { error: e.message });
        }
        return;
      }

      if (url.startsWith('/api/conversation/status/') && req.method === 'GET') {
        try {
          const conversaId = url.split('/').pop();
          if (!global.warmConversation) {
            return json(500, { error: 'WarmConversation não inicializado' });
          }

          const status = global.warmConversation.obterStatusConversa(conversaId);
          return json(status ? 200 : 404, status || { erro: 'Conversa não encontrada' });
        } catch (e) {
          return json(500, { error: e.message });
        }
      }

      if (url.startsWith('/api/conversation/historico/') && req.method === 'GET') {
        try {
          const conversaId = url.split('/').pop();
          if (!global.warmConversation) {
            return json(500, { error: 'WarmConversation não inicializado' });
          }

          const historico = global.warmConversation.obterHistoricoConversa(conversaId);
          return json(historico ? 200 : 404, historico || { erro: 'Conversa não encontrada' });
        } catch (e) {
          return json(500, { error: e.message });
        }
      }

      if (url === '/api/conversation/temas' && req.method === 'GET') {
        try {
          if (!global.warmConversation) {
            return json(500, { error: 'WarmConversation não inicializado' });
          }

          const temas = global.warmConversation.obterTemas();
          return json(200, { temas });
        } catch (e) {
          return json(500, { error: e.message });
        }
      }

      if (url === '/api/conversation/ativas' && req.method === 'GET') {
        try {
          if (!global.warmConversation) {
            return json(500, { error: 'WarmConversation não inicializado' });
          }

          const ativas = global.warmConversation.obterConversasAtivas();
          return json(200, { conversas: ativas });
        } catch (e) {
          return json(500, { error: e.message });
        }
      }

      if (url.startsWith('/api/conversation/parar/') && req.method === 'POST') {
        try {
          const conversaId = url.split('/').pop();
          if (!global.warmConversation) {
            return json(500, { error: 'WarmConversation não inicializado' });
          }

          const resultado = global.warmConversation.pararConversa(conversaId);
          return json(resultado.sucesso ? 200 : 404, resultado);
        } catch (e) {
          return json(500, { error: e.message });
        }
      }

      // ============ TRAINING APIS ============

      if (url === '/api/training/metrics' && req.method === 'GET') {
        try {
          if (!global.trainerService) {
            return json(500, { error: 'TrainerService não inicializado' });
          }

          const metricas = global.trainerService.obterMetricas();
          return json(200, { sucesso: true, dados: metricas });
        } catch (e) {
          return json(500, { erro: e.message });
        }
      }

      if (url === '/api/training/results' && req.method === 'GET') {
        try {
          if (!global.trainerService) {
            return json(500, { error: 'TrainerService não inicializado' });
          }

          const resultados = global.trainerService.obterUltimosResultados();
          if (!resultados) {
            return json(404, { sucesso: false, erro: 'Nenhum treinamento realizado ainda' });
          }

          return json(200, {
            sucesso: true,
            dados: {
              timestamp: resultados.timestamp,
              taxaConversao: resultados.analise?.conversaoRate,
              totalConversas: resultados.analise?.total,
              vendidas: resultados.analise?.conversasQueConverteram?.length,
              padroesPrincipais: resultados.padroes ?
                Object.entries(resultados.padroes)
                  .slice(0, 10)
                  .map(([palavra, stats]) => ({
                    palavra,
                    frequencia: stats.count,
                    conversoes: stats.conversoes,
                    taxaConversao: ((stats.conversoes / stats.count) * 100).toFixed(0) + '%'
                  }))
                : []
            }
          });
        } catch (e) {
          return json(500, { erro: e.message });
        }
      }

      if (url === '/api/training/start' && req.method === 'POST') {
        try {
          if (!global.trainerService) {
            return json(500, { error: 'TrainerService não inicializado' });
          }

          global.trainerService.treinar().catch(err => {
            console.error('Erro no treinamento manual:', err);
          });

          return json(200, { sucesso: true, mensagem: 'Treinamento iniciado' });
        } catch (e) {
          return json(500, { erro: e.message });
        }
      }

      if (url === '/api/training/status' && req.method === 'GET') {
        try {
          if (!global.trainerService) {
            return json(500, { error: 'TrainerService não inicializado' });
          }

          const metricas = global.trainerService.obterMetricas();
          const resultados = global.trainerService.obterUltimosResultados();

          return json(200, {
            sucesso: true,
            status: {
              ativo: metricas.ativo,
              emExecucao: metricas.emExecucao,
              ultimoTreinamento: metricas.ultimoTreinamento,
              totalTreinamentos: metricas.totalTreinamentos,
              taxaConversaoMedia: metricas.taxaConversaoMedia,
              proximos5Padroes: metricas.padroesPrincipais,
              temUltimosResultados: !!resultados
            }
          });
        } catch (e) {
          return json(500, { erro: e.message });
        }
      }

      if (url === '/api/training/insights' && req.method === 'GET') {
        try {
          if (!global.trainerService) {
            return json(500, { error: 'TrainerService não inicializado' });
          }

          const resultados = global.trainerService.obterUltimosResultados();
          if (!resultados || !resultados.insights) {
            return json(404, { sucesso: false, erro: 'Nenhum insight disponível ainda' });
          }

          return json(200, {
            sucesso: true,
            dados: {
              timestamp: resultados.timestamp,
              padroesDeSucesso: resultados.insights.padroesDeSucesso,
              recomendacoes: resultados.insights.recomendacoes,
              exemplosQueVenderam: resultados.insights.conversasQueVenderam.slice(0, 5)
            }
          });
        } catch (e) {
          return json(500, { erro: e.message });
        }
      }

      // Fallback for missing APIs
      return json(404, { error: 'Endpoint não encontrado' });
    }

    // Serve Frontend React Static Files
    let filePath = path.join(__dirname, '..', '..', 'frontend', 'dist', url === '/' ? 'index.html' : url);
    
    // Check if file exists, if not fallback to index.html (React Router)
    if (!fs.existsSync(filePath)) {
      filePath = path.join(__dirname, '..', '..', 'frontend', 'dist', 'index.html');
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
