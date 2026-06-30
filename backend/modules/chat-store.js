const fs = require('fs');
const path = require('path');

/**
 * 📦 ChatStore
 * 
 * Mantém um histórico em memória (curto prazo) das últimas mensagens
 * para exibição no painel de controle (Conversas.jsx).
 */

class ChatStore {
  constructor() {
    // this.chats[sessao] = Map(jid => { name, unread, lastTime, messages: [] })
    this.chats = new Map();
    this.conhecimentoDir = path.join(__dirname, '..', 'conhecimento');
    this.arquivoTreinamento = path.join(this.conhecimentoDir, 'mensagens_treinamento.jsonl');
    this.hydrateFromProspeccaoHistory();
  }

  hydrateFromProspeccaoHistory() {
    const historyPath = path.join(__dirname, '..', 'listas', 'prospeccao_resultados.jsonl');
    if (!fs.existsSync(historyPath)) return;

    try {
      const linhas = fs.readFileSync(historyPath, 'utf8')
        .split('\n')
        .filter(linha => linha.trim());

      linhas
        .map(linha => {
          try { return JSON.parse(linha); } catch (e) { return null; }
        })
        .filter(item => item && item.status === 'enviado' && item.telefone && item.mensagem)
        .sort((a, b) => (a.timestamp || Date.parse(a.data) || 0) - (b.timestamp || Date.parse(b.data) || 0))
        .forEach(item => {
          const sessao = Number(item.sessao) || 1;
          const jid = String(item.telefone).includes('@') ? String(item.telefone) : `${String(item.telefone).replace(/\D/g, '')}@s.whatsapp.net`;
          this.addMessage(sessao, jid, item.nome || item.empresa || item.telefone, {
            id: `hist_${item.timestamp || Date.parse(item.data) || Date.now()}_${jid}`,
            text: item.mensagem,
            fromMe: true,
            isBot: true,
            timestamp: item.timestamp || Date.parse(item.data) || Date.now(),
            read: true
          }, { persist: false });
        });
    } catch (err) {
      console.error('Erro ao carregar histórico de conversas:', err.message);
    }
  }

  /**
   * Adiciona uma mensagem ao histórico da sessão/contato
   */
  addMessage(sessao, jid, name, messageObj, options = {}) {
    if (!sessao || !jid) return;

    if (!this.chats.has(sessao)) {
      this.chats.set(sessao, new Map());
    }

    const sessionChats = this.chats.get(sessao);
    
    if (!sessionChats.has(jid)) {
      sessionChats.set(jid, { 
        name: name || jid.split('@')[0], 
        unread: 0, 
        lastTime: 0, 
        messages: [] 
      });
    }

    const chat = sessionChats.get(jid);
    
    // Atualiza nome se fornecido
    if (name && chat.name === jid.split('@')[0]) {
      chat.name = name;
    }

    // Se for um status, ignora histórico
    if (jid.includes('@broadcast') || jid === 'status@broadcast') return;

    // Atualiza horário da última mensagem
    const messageId = messageObj.id ? String(messageObj.id) : null;
    const messageText = String(messageObj.text || '').trim();
    const messageTime = messageObj.timestamp || Date.now();
    const sameDirection = Boolean(messageObj.fromMe);
    const duplicate = chat.messages.some(msg => {
      if (messageId && msg.id && String(msg.id) === messageId) return true;

      const msgText = String(msg.text || '').trim();
      const msgTime = msg.timestamp || 0;
      const closeInTime = Math.abs(messageTime - msgTime) <= 15000;

      return closeInTime &&
        Boolean(msg.fromMe) === sameDirection &&
        msgText &&
        messageText &&
        msgText === messageText;
    });

    if (duplicate) return;

    chat.lastTime = messageTime;

    // Adiciona a mensagem
    chat.messages.push(messageObj);

    // Mantém no máximo 100 mensagens no histórico em memória
    if (chat.messages.length > 100) {
      chat.messages.shift();
    }

    // Incrementa contador de não lidas se a mensagem não foi do bot/painel
    if (!messageObj.fromMe && !messageObj.read) {
      chat.unread++;
    }

    if (options.persist !== false) {
      this.persistMessage(sessao, jid, name, messageObj);
    }
  }

  persistMessage(sessao, jid, name, messageObj) {
    try {
      if (!fs.existsSync(this.conhecimentoDir)) {
        fs.mkdirSync(this.conhecimentoDir, { recursive: true });
      }

      const registro = {
        contato: jid,
        nome: name || jid.split('@')[0],
        texto: messageObj.text || '',
        enviada_pelo_bot: Boolean(messageObj.fromMe),
        is_bot: Boolean(messageObj.isBot),
        sessao,
        timestamp: messageObj.timestamp || Date.now(),
        id: messageObj.id || null
      };

      fs.appendFileSync(this.arquivoTreinamento, `${JSON.stringify(registro)}\n`, 'utf8');
    } catch (err) {
      console.error('Erro ao persistir mensagem do chat:', err.message);
    }
  }

  /**
   * Zera as não lidas de um contato
   */
  markAsRead(sessao, jid) {
    if (this.chats.has(sessao)) {
      const sessionChats = this.chats.get(sessao);
      if (sessionChats.has(jid)) {
        sessionChats.get(jid).unread = 0;
      }
    }
  }

  /**
   * Obtém os contatos recentes para uma sessão, ordenados por lastTime
   */
  getContacts(sessao) {
    if (!this.chats.has(sessao)) return [];
    
    const sessionChats = this.chats.get(sessao);
    const contatos = Array.from(sessionChats.entries()).map(([jid, data]) => {
      // Obter última mensagem pra preview
      let lastMsgText = '';
      if (data.messages.length > 0) {
        lastMsgText = data.messages[data.messages.length - 1].text || '📷 Mídia';
      }

      return {
        jid,
        name: data.name,
        unread: data.unread,
        lastTime: data.lastTime,
        lastMessage: lastMsgText,
        requiresAttention: data.requiresAttention || false
      };
    });

    // Ordenar do mais recente pro mais antigo
    return contatos.sort((a, b) => b.lastTime - a.lastTime);
  }

  /**
   * Obtém o histórico de mensagens de um contato
   */
  getMessages(sessao, jid) {
    if (!this.chats.has(sessao)) return [];
    const sessionChats = this.chats.get(sessao);
    if (!sessionChats.has(jid)) return [];
    
    return sessionChats.get(jid).messages;
  }

  /**
   * Define um alerta de intervenção humana
   */
  setRequiresAttention(sessao, jid, status) {
    if (this.chats.has(sessao)) {
      const sessionChats = this.chats.get(sessao);
      if (sessionChats.has(jid)) {
        sessionChats.get(jid).requiresAttention = status;
      }
    }
  }
}

module.exports = new ChatStore();
