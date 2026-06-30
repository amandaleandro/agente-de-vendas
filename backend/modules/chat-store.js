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
  }

  /**
   * Adiciona uma mensagem ao histórico da sessão/contato
   */
  addMessage(sessao, jid, name, messageObj) {
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
    chat.lastTime = messageObj.timestamp || Date.now();

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
