import React, { useState, useEffect, useRef } from 'react';
import { Send, User, Bot, AlertCircle, Play, ChevronLeft, ChevronRight, Pause, Ban } from 'lucide-react';
import Pagination from '../components/Pagination';

export default function Conversas() {
  const [sessaoAtiva, setSessaoAtiva] = useState('todos');
  const [sessoes, setSessoes] = useState([1]);
  const [contatos, setContatos] = useState([]);
  const [contatoAtivo, setContatoAtivo] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [mensagemInput, setMensagemInput] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [paginaContatos, setPaginaContatos] = useState(1);
  const itemsPorPagina = 30;

  const messagesEndRef = useRef(null);

  // Carregar número de sessões da config
  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(data => {
        const num = Number(data.WHATSAPP_NUMEROS) || 1;
        setSessoes(Array.from({ length: num }, (_, i) => i + 1));
      });
  }, []);

  // Polling de contatos
  useEffect(() => {
    const fetchContacts = async () => {
      try {
        if (sessaoAtiva === 'todos') {
          const resultados = await Promise.all(sessoes.map(async (sessao) => {
            const res = await fetch(`/api/chat/contacts?sessao=${sessao}`);
            const data = await res.json();
            return data.success ? data.contacts.map(c => ({ ...c, sessao })) : [];
          }));

          setContatos(resultados.flat().sort((a, b) => b.lastTime - a.lastTime));
          return;
        }

        const res = await fetch(`/api/chat/contacts?sessao=${sessaoAtiva}`);
        const data = await res.json();
        if (data.success) {
          setContatos(data.contacts.map(c => ({ ...c, sessao: sessaoAtiva })));
        }
      } catch (err) {
        console.error(err);
      }
    };
    
    fetchContacts();
    const interval = setInterval(fetchContacts, 3000);
    return () => clearInterval(interval);
  }, [sessaoAtiva, sessoes]);

  // Polling de mensagens do contato ativo
  useEffect(() => {
    if (!contatoAtivo) {
      setMensagens([]);
      return;
    }
    
    const fetchMessages = () => {
      fetch(`/api/chat/messages?sessao=${contatoAtivo.sessao || sessaoAtiva}&jid=${contatoAtivo.jid}`)
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            setMensagens(data.messages);
            setIsPaused(data.paused);
          }
        })
        .catch(console.error);
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [sessaoAtiva, contatoAtivo]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [mensagens]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!mensagemInput.trim() || !contatoAtivo) return;

    const text = mensagemInput;
    setMensagemInput('');

    // Adiciona otimisticamente
    setMensagens(prev => [...prev, {
      id: 'temp_' + Date.now(),
      text: text,
      fromMe: true,
      isBot: false,
      timestamp: Date.now()
    }]);
    setIsPaused(true); // Fica pausado automaticamente ao mandar

    try {
      await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessao: contatoAtivo.sessao || sessaoAtiva,
          jid: contatoAtivo.jid,
          text: text
        })
      });
    } catch(err) {
      console.error(err);
      alert('Erro ao enviar mensagem');
    }
  };

  const handleResumeIA = async () => {
    if (!contatoAtivo) return;
    try {
      await fetch('/api/chat/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessao: contatoAtivo.sessao || sessaoAtiva, jid: contatoAtivo.jid })
      });
      setIsPaused(false);
    } catch(err) {
      console.error(err);
    }
  };

  const handlePauseIA = async () => {
    if (!contatoAtivo) return;
    try {
      await fetch('/api/chat/pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessao: contatoAtivo.sessao || sessaoAtiva, jid: contatoAtivo.jid })
      });
      setIsPaused(true);
    } catch(err) {
      console.error(err);
    }
  };

  const handleOptOut = async () => {
    if (!contatoAtivo) return;
    if (!window.confirm('Marcar este contato como sem interesse e bloquear novos envios?')) return;
    try {
      await fetch('/api/chat/optout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessao: contatoAtivo.sessao || sessaoAtiva, jid: contatoAtivo.jid })
      });
      setIsPaused(true);
    } catch(err) {
      console.error(err);
    }
  };

  const formatTime = (ts) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getContatosPaginados = () => {
    const inicio = (paginaContatos - 1) * itemsPorPagina;
    const fim = inicio + itemsPorPagina;
    return contatos.slice(inicio, fim);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      <h1>Conversas em Tempo Real</h1>
      <p style={{ marginBottom: '1rem', color: 'var(--text-dim)' }}>
        Acompanhe e intervenha nas conversas. Ao enviar uma mensagem manual, a IA pausa para aquele cliente.
      </p>

      {/* Tabs de Sessões */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button
          className={`btn ${sessaoAtiva === 'todos' ? 'btn-primary' : ''}`}
          onClick={() => { setSessaoAtiva('todos'); setContatoAtivo(null); setPaginaContatos(1); }}
          style={sessaoAtiva !== 'todos' ? { background: 'rgba(255,255,255,0.05)' } : {}}
        >
          Todos os Chips
        </button>
        {sessoes.map(s => (
          <button
            key={s}
            className={`btn ${sessaoAtiva === s ? 'btn-primary' : ''}`}
            onClick={() => { setSessaoAtiva(s); setContatoAtivo(null); setPaginaContatos(1); }}
            style={sessaoAtiva !== s ? { background: 'rgba(255,255,255,0.05)' } : {}}
          >
            Sessão (Chip) {s}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
        
        {/* Sidebar de Contatos */}
        <div style={{ width: '22%', borderRight: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
              Chats {sessaoAtiva === 'todos' ? '(Todos os Chips)' : `(Sessão ${sessaoAtiva})`}
            </h3>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {contatos.length} conversa{contatos.length !== 1 ? 's' : ''} total
            </p>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {contatos.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-dim)' }}>
                Nenhuma conversa recente registrada pelo painel.
              </div>
            ) : (
              getContatosPaginados().map(c => (
                <div
                  key={`${c.sessao}:${c.jid}`}
                  onClick={() => setContatoAtivo(c)}
                  style={{
                    padding: '1rem',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    cursor: 'pointer',
                    background: contatoAtivo?.jid === c.jid && contatoAtivo?.sessao === c.sessao ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem'
                  }}
                >
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={20} />
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <strong style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{formatTime(c.lastTime)}</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--primary)', marginBottom: '4px', fontWeight: 700 }}>
                      Chip {c.sessao}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.requiresAttention && <span style={{ color: '#ef4444', marginRight: '4px', fontWeight: 'bold' }}>🚨 Ajuda!</span>}
                      {c.paused && !c.requiresAttention && <span style={{ color: '#f59e0b', marginRight: '4px' }}>[Pausado]</span>}
                      {c.lastMessage}
                    </div>
                  </div>
                  {c.unread > 0 && (
                    <div style={{ background: 'var(--primary)', color: 'white', borderRadius: '12px', padding: '2px 8px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                      {c.unread}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
          {contatos.length > itemsPorPagina && (
            <div style={{ padding: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '0.5rem', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.2)' }}>
              <button
                onClick={() => setPaginaContatos(p => Math.max(1, p - 1))}
                disabled={paginaContatos === 1}
                style={{
                  padding: '0.4rem 0.6rem',
                  background: paginaContatos === 1 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '4px',
                  color: paginaContatos === 1 ? 'var(--text-dim)' : 'white',
                  cursor: paginaContatos === 1 ? 'not-allowed' : 'pointer',
                  fontSize: '0.8rem'
                }}
              >
                <ChevronLeft size={14} />
              </button>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {paginaContatos} / {Math.ceil(contatos.length / itemsPorPagina)}
              </span>
              <button
                onClick={() => setPaginaContatos(p => Math.min(Math.ceil(contatos.length / itemsPorPagina), p + 1))}
                disabled={paginaContatos >= Math.ceil(contatos.length / itemsPorPagina)}
                style={{
                  padding: '0.4rem 0.6rem',
                  background: paginaContatos >= Math.ceil(contatos.length / itemsPorPagina) ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '4px',
                  color: paginaContatos >= Math.ceil(contatos.length / itemsPorPagina) ? 'var(--text-dim)' : 'white',
                  cursor: paginaContatos >= Math.ceil(contatos.length / itemsPorPagina) ? 'not-allowed' : 'pointer',
                  fontSize: '0.8rem'
                }}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Área de Mensagens */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.15)' }}>
          {contatoAtivo ? (
            <>
              {/* Header do Chat */}
              <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0 }}>{contatoAtivo.name}</h3>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{contatoAtivo.jid.split('@')[0]}</span>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {isPaused ? (
                    <button className="btn btn-primary" onClick={handleResumeIA} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f59e0b', borderColor: '#f59e0b' }}>
                      <Play size={16} /> Retomar IA
                    </button>
                  ) : contatoAtivo.requiresAttention ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', fontSize: '0.9rem', fontWeight: 'bold' }}>
                      <AlertCircle size={18} /> AGUARDANDO HUMANO
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', fontSize: '0.9rem' }}>
                      <Bot size={18} /> IA Ativa
                    </div>
                  )}
                  {!isPaused && (
                    <button className="btn" onClick={handlePauseIA} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Pause size={16} /> Pausar
                    </button>
                  )}
                  <button className="btn btn-danger" onClick={handleOptOut} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Ban size={16} /> Sem interesse
                  </button>
                </div>
              </div>

              {/* Lista de Mensagens */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {mensagens.map((msg, i) => {
                  const isMine = msg.fromMe;
                  const showBot = isMine && msg.isBot;
                  return (
                    <div key={msg.id || i} style={{ alignSelf: isMine ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                      <div style={{ 
                        background: isMine ? 'var(--primary)' : 'rgba(255,255,255,0.1)', 
                        padding: '0.75rem 1rem', 
                        borderRadius: isMine ? '12px 12px 0 12px' : '12px 12px 12px 0',
                        color: 'white',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                      }}>
                        <p style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '0.95rem' }}>{msg.text}</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: isMine ? 'flex-end' : 'flex-start', marginTop: '4px', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                        {showBot && <><Bot size={12} /> IA</>}
                        {isMine && !showBot && <><User size={12} /> Você</>}
                        <span>{formatTime(msg.timestamp)}</span>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                  <textarea
                    value={mensagemInput}
                    onChange={e => setMensagemInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend(e);
                      }
                    }}
                    placeholder="Digite uma mensagem para intervir (a IA será pausada)... (Enter para enviar, Shift+Enter para nova linha)"
                    className="form-input"
                    style={{
                      flex: 1,
                      minHeight: '150px',
                      resize: 'vertical',
                      padding: '0.75rem',
                      lineHeight: '1.5'
                    }}
                  />
                  <button type="submit" className="btn btn-primary" disabled={!mensagemInput.trim()} style={{ width: '50px', height: '50px', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 0, flexShrink: 0 }}>
                    <Send size={18} />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)' }}>
              <Bot size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
              <p>Selecione uma conversa para visualizar ou intervir.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
