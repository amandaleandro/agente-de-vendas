const fs = require('fs');
const path = require('path');
const { lerCsv } = require('./csv');

class MessageTank {
  constructor(iaProvider = null) {
    this.filaFile = path.join(__dirname, 'fila_mensagens.jsonl');
    this.fila = new Map(); // telefone -> [{ id, conteudo, enviado, tentativas, proxima_tentativa }]
    this.estadoEnvio = new Map(); // telefone -> { enviando, ultimoEnvio, proxima }
    this.iaProvider = iaProvider; // Gemini ou xAI
    this.carregarFila();
  }

  carregarFila() {
    if (!fs.existsSync(this.filaFile)) return;
    try {
      const linhas = fs.readFileSync(this.filaFile, 'utf8').split('\n').filter(l => l.trim());
      linhas.forEach(linha => {
        try {
          const item = JSON.parse(linha);
          if (!item.enviado) {
            const telefone = item.telefone;
            if (!this.fila.has(telefone)) this.fila.set(telefone, []);
            this.fila.get(telefone).push(item);
          }
        } catch {}
      });
    } catch (err) {
      console.log(`⚠️ Erro ao carregar fila: ${err.message}`);
    }
  }

  adicionarMensagens(telefone, mensagens) {
    // mensagens = ['oi', 'tudo bem?', 'como vai?']
    if (!this.fila.has(telefone)) this.fila.set(telefone, []);

    const id = `${telefone}_${Date.now()}`;
    const items = mensagens.map((conteudo, index) => ({
      id: `${id}_${index}`,
      telefone,
      conteudo: String(conteudo || '').slice(0, 4096),
      enviado: false,
      tentativas: 0,
      erro: null,
      criado_em: new Date().toISOString(),
    }));

    this.fila.get(telefone).push(...items);
    items.forEach(item => {
      fs.appendFileSync(this.filaFile, `${JSON.stringify(item)}\n`, 'utf8');
    });

    this.rotacionarFilaSeNecessario();
    return items.length;
  }

  rotacionarFilaSeNecessario() {
    try {
      const stats = fs.statSync(this.filaFile);
      if (stats.size > 100 * 1024 * 1024) {
        const backup = `${this.filaFile}.${Date.now()}`;
        fs.renameSync(this.filaFile, backup);
        console.log(`📦 Fila rotacionada (backup: ${backup})`);
      }
    } catch {}
  }

  async gerarMensagensComIA(contato) {
    if (!this.iaProvider) return null;

    const prompt = `Crie uma sequência de 3 mensagens WhatsApp personalizadas e naturais para este contato:
- Nome: ${contato.nome || 'não informado'}
- Empresa: ${contato.empresa || 'não informada'}
- Categoria: ${contato.categoria || 'não informada'}
- Endereço: ${contato.endereco || 'não informado'}

Mensagens:
1. PRIMEIRA mensagem (saudação + apresentação breve): max 150 caracteres
2. SEGUNDA mensagem (descobrir necessidade): max 150 caracteres
3. TERCEIRA mensagem (valor do FechaPro + chamada à ação): max 150 caracteres

Responda APENAS no formato:
msg1: [mensagem 1]
msg2: [mensagem 2]
msg3: [mensagem 3]

Português do Brasil, natural, sem listas, sem emojis excessivos.`;

    try {
      let resultado = '';

      if (this.iaProvider.type === 'xai') {
        const res = await this.iaProvider.messages.create({
          model: process.env.XAI_MODEL || 'grok-beta',
          max_tokens: 300,
          temperature: 0.7,
          messages: [{ role: 'user', content: prompt }],
        });
        resultado = res.content[0]?.text?.trim() || '';
      } else {
        const res = await this.iaProvider.models.generateContent({
          model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: { temperature: 0.7, maxOutputTokens: 300, thinkingConfig: { thinkingBudget: 0 } },
        });
        resultado = res.text?.trim() || '';
      }

      // Parsear resposta
      const mensagens = [];
      const linhas = resultado.split('\n').filter(l => l.trim());
      for (const linha of linhas) {
        const match = linha.match(/^msg\d+:\s*(.+)$/);
        if (match) {
          mensagens.push(match[1].trim());
        }
      }

      return mensagens.length === 3 ? mensagens : null;
    } catch (err) {
      console.log(`⚠️ Erro ao gerar mensagens com IA: ${err.message}`);
      return null;
    }
  }

  carregarCSV(conteudo, gerarComIA = false) {
    // CSV pode ter:
    // - Se gerarComIA=false: telefone, msg1, msg2, msg3...
    // - Se gerarComIA=true: telefone, nome, empresa, categoria, endereco...
    const linhas = lerCsv(conteudo);
    if (linhas.length < 2) throw new Error('CSV deve ter cabeçalho + dados');

    const cabecalho = linhas[0].map(c => c.trim().toLowerCase());
    const indexTelefone = cabecalho.findIndex(c =>
      c.includes('telefone') || c.includes('whatsapp') || c.includes('phone')
    );

    if (indexTelefone < 0) throw new Error('CSV precisa ter coluna "telefone" ou "whatsapp"');

    let adicionados = 0;
    const contatosPendentes = [];

    for (let i = 1; i < linhas.length; i++) {
      const partes = linhas[i].map(p => p.trim());
      const telefoneRaw = partes[indexTelefone];

      if (!telefoneRaw) continue;

      const telefoneDigitos = telefoneRaw.replace(/\D/g, '');
      const telefone = telefoneDigitos.startsWith('55') ? telefoneDigitos : `55${telefoneDigitos}`;

      if (!/^55\d{10,11}$/.test(telefone)) {
        continue;
      }

      if (gerarComIA) {
        // Extrair informações do contato
        const contato = { telefone };
        const indexNome = cabecalho.findIndex(c => c.includes('nome') || c.includes('empresa'));
        const indexEmpresa = cabecalho.findIndex(c => c.includes('empresa'));
        const indexCategoria = cabecalho.findIndex(c => c.includes('categoria') || c.includes('segmento'));
        const indexEndereco = cabecalho.findIndex(c => c.includes('endereco') || c.includes('endereço'));

        if (indexNome >= 0) contato.nome = partes[indexNome];
        if (indexEmpresa >= 0) contato.empresa = partes[indexEmpresa];
        if (indexCategoria >= 0) contato.categoria = partes[indexCategoria];
        if (indexEndereco >= 0) contato.endereco = partes[indexEndereco];

        contatosPendentes.push(contato);
      } else {
        // Modo tradicional: mensagens já estão no CSV
        const indexMensagens = cabecalho
          .map((c, i) => i !== indexTelefone ? i : null)
          .filter(i => i !== null);

        const mensagens = indexMensagens
          .map(idx => partes[idx])
          .filter(m => m && m.length > 0 && m !== telefone);

        if (mensagens.length > 0) {
          adicionados += this.adicionarMensagens(telefone, mensagens);
        }
      }
    }

    return { totalContatos: this.fila.size, totalMensagens: adicionados, contatosPendentes };
  }

  obterProxima(telefone) {
    const fila = this.fila.get(telefone);
    if (!fila || fila.length === 0) return null;
    return fila.find(m => !m.enviado);
  }

  async enviarProxima(telefone, socketAtual, warmup, sessao, enviarPeloBot) {
    const proxima = this.obterProxima(telefone);
    if (!proxima) return null;

    try {
      const consulta = await socketAtual.onWhatsApp(telefone);
      const jidCorreto = consulta?.[0]?.exists ? consulta[0].jid : `${telefone}@s.whatsapp.net`;
      await enviarPeloBot(socketAtual, jidCorreto, { text: proxima.conteudo }, sessao);

      proxima.enviado = true;
      proxima.enviado_em = new Date().toISOString();
      fs.appendFileSync(this.filaFile, `${JSON.stringify({ ...proxima, enviado: true })}\n`, 'utf8');

      const estado = this.estadoEnvio.get(telefone) || {};
      estado.ultimoEnvio = Date.now();
      estado.proxima = Date.now() + 60 * 1000; // Próxima em 1 minuto
      this.estadoEnvio.set(telefone, estado);

      return { sucesso: true, id: proxima.id, conteudo: proxima.conteudo };
    } catch (err) {
      proxima.tentativas = (proxima.tentativas || 0) + 1;
      proxima.erro = err.message;

      if (proxima.tentativas >= 3) {
        proxima.enviado = true; // Marca como "enviado" (falhou após 3 tentativas)
      }

      fs.appendFileSync(this.filaFile, `${JSON.stringify(proxima)}\n`, 'utf8');
      return { sucesso: false, id: proxima.id, erro: err.message };
    }
  }

  podeEnviarParaContato(telefone) {
    const estado = this.estadoEnvio.get(telefone);
    if (!estado) return true; // Primeira vez

    const agora = Date.now();
    return agora >= (estado.proxima || 0);
  }

  obterStatus() {
    const relatorio = [];
    this.fila.forEach((mensagens, telefone) => {
      const enviadas = mensagens.filter(m => m.enviado).length;
      const pendentes = mensagens.filter(m => !m.enviado).length;
      const erros = mensagens.filter(m => m.erro).length;
      const proxima = this.obterProxima(telefone);
      const estado = this.estadoEnvio.get(telefone);

      relatorio.push({
        telefone,
        total: mensagens.length,
        enviadas,
        pendentes,
        erros,
        temProxima: !!proxima,
        podeEnviarAgora: this.podeEnviarParaContato(telefone),
        proximaEm: estado?.proxima ? Math.max(0, estado.proxima - Date.now()) : 0,
      });
    });

    return {
      totalContatos: this.fila.size,
      totalMensagens: Array.from(this.fila.values()).reduce((a, b) => a + b.length, 0),
      enviadas: Array.from(this.fila.values()).reduce((a, b) => a + b.filter(m => m.enviado).length, 0),
      pendentes: Array.from(this.fila.values()).reduce((a, b) => a + b.filter(m => !m.enviado).length, 0),
      contatos: relatorio,
    };
  }

  obterFilaParaMostrar(limit = 20) {
    const pendentes = [];
    this.fila.forEach((msgs, telefone) => {
      const proxima = this.obterProxima(telefone);
      if (proxima) {
        pendentes.push({
          telefone,
          mensagem: proxima.conteudo,
          posicao: msgs.findIndex(m => m.id === proxima.id) + 1,
          total: msgs.length,
        });
      }
    });
    return pendentes.slice(0, limit);
  }

  limparEnviadas() {
    let removidos = 0;
    this.fila.forEach((msgs, telefone) => {
      const novas = msgs.filter(m => !m.enviado);
      if (novas.length === 0) {
        this.fila.delete(telefone);
      } else {
        this.fila.set(telefone, novas);
      }
      removidos += msgs.length - novas.length;
    });
    return removidos;
  }

  registrarResposta(telefone) {
    const msgs = this.fila.get(telefone);
    if (!msgs) return;

    const estado = this.estadoEnvio.get(telefone);
    if (!estado) return;

    const ultimoEnvioMs = estado.ultimoEnvio;
    if (!ultimoEnvioMs) return;

    // Marca como respondida a mensagem mais recentemente enviada para este contato
    for (let i = msgs.length - 1; i >= 0; i--) {
      const msg = msgs[i];
      if (msg.enviado && !msg.respondido && msg.enviado_em) {
        const msgTime = new Date(msg.enviado_em).getTime();
        if (Math.abs(msgTime - ultimoEnvioMs) < 5000) {
          msg.respondido = true;
          msg.respondido_em = new Date().toISOString();
          fs.appendFileSync(this.filaFile, `${JSON.stringify(msg)}\n`, 'utf8');
          break;
        }
      }
    }
  }

  obterTaxaResposta() {
    const taxaPorPosicao = {};
    this.fila.forEach((msgs) => {
      msgs.forEach((msg, idx) => {
        const posicao = idx + 1;
        if (!taxaPorPosicao[posicao]) taxaPorPosicao[posicao] = { enviadas: 0, respondidas: 0 };
        if (msg.enviado) {
          taxaPorPosicao[posicao].enviadas++;
          if (msg.respondido) taxaPorPosicao[posicao].respondidas++;
        }
      });
    });

    return Object.entries(taxaPorPosicao)
      .map(([posicao, dados]) => ({
        posicao: parseInt(posicao),
        enviadas: dados.enviadas,
        respondidas: dados.respondidas,
        taxa: dados.enviadas > 0 ? Math.round((dados.respondidas / dados.enviadas) * 100) : 0,
      }))
      .sort((a, b) => a.posicao - b.posicao);
  }
}

module.exports = MessageTank;
