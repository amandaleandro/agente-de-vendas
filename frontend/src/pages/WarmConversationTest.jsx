import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, MessageSquare, Zap } from 'lucide-react';

export default function WarmConversationTest() {
  const [sessoes, setSessoes] = useState([]);
  const [temas, setTemas] = useState([]);
  const [conversas, setConversas] = useState([]);

  const [sessao1, setSessao1] = useState('');
  const [sessao2, setSessao2] = useState('');
  const [tema, setTema] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeConversaId, setActiveConversaId] = useState(null);

  useEffect(() => {
    carregarDados();
    const interval = setInterval(carregarDados, 5000);
    return () => clearInterval(interval);
  }, []);

  const carregarDados = async () => {
    try {
      // Carrega sessões conectadas
      const statusRes = await fetch('/api/whatsapp-status');
      const statusData = await statusRes.json();
      if (statusData.status) {
        const sessoesList = statusData.status
          .filter(s => s.conectado)
          .map(s => ({ sessao: s.sessao, nome: s.nome }));
        setSessoes(sessoesList);
      }

      // Carrega temas disponíveis
      const temasRes = await fetch('/api/conversation/temas');
      const temasData = await temasRes.json();
      if (temasData.temas) {
        setTemas(temasData.temas);
      }

      carregarConversasAtivas();
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    }
  };

  const carregarConversasAtivas = async () => {
    try {
      const res = await fetch('/api/conversation/ativas');
      const data = await res.json();
      if (data.conversas) {
        setConversas(data.conversas);
      }
    } catch (err) {
      console.error('Erro ao carregar conversas ativas:', err);
    }
  };

  const iniciarConversa = async () => {
    if (!sessao1 || !sessao2) {
      alert('Selecione duas sessões diferentes');
      return;
    }
    if (parseInt(sessao1) === parseInt(sessao2)) {
      alert('As sessões devem ser diferentes');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/conversation/iniciar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessao1: parseInt(sessao1),
          sessao2: parseInt(sessao2),
          tema: tema || null
        })
      });
      const data = await res.json();
      if (data.sucesso) {
        alert(`✅ Conversa iniciada: ${data.conversaId}`);
        setActiveConversaId(data.conversaId);
        setSessao1('');
        setSessao2('');
        setTema('');
        setTimeout(carregarConversasAtivas, 500);
      } else {
        alert(`❌ ${data.erro}`);
      }
    } catch (err) {
      alert(`Erro: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const proximaMensagem = async (conversaId) => {
    try {
      const res = await fetch(`/api/conversation/proxima/${conversaId}`);
      const data = await res.json();
      if (data.conversaId) {
        alert(`💬 ${data.sessaoEnviou}: "${data.pergunta}"\n📞 ${data.sessaoRespondeu}: "${data.resposta}"`);
        setTimeout(carregarConversasAtivas, 300);
      } else {
        alert('❌ Conversa encerrada');
      }
    } catch (err) {
      alert(`Erro: ${err.message}`);
    }
  };

  const pararConversa = async (conversaId) => {
    try {
      const res = await fetch(`/api/conversation/parar/${conversaId}`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.sucesso) {
        alert(`✅ ${data.mensagem}`);
        setActiveConversaId(null);
        setTimeout(carregarConversasAtivas, 300);
      } else {
        alert(`❌ ${data.erro}`);
      }
    } catch (err) {
      alert(`Erro: ${err.message}`);
    }
  };

  const verHistorico = async (conversaId) => {
    try {
      const res = await fetch(`/api/conversation/historico/${conversaId}`);
      const data = await res.json();
      if (data.mensagens) {
        let historico = `📋 Histórico - ${data.tema}\n\n`;
        data.mensagens.forEach((msg, idx) => {
          historico += `${idx + 1}. [${msg.sessao}] ${msg.tipo.toUpperCase()}: ${msg.texto}\n`;
        });
        alert(historico);
      }
    } catch (err) {
      alert(`Erro: ${err.message}`);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MessageSquare size={24} style={{ color: '#818cf8' }} />
          <h1>Teste de Conversas de Aquecimento</h1>
        </div>
        <p>Valide se as conversas entre números estão funcionando corretamente</p>
      </div>

      <div className="content-grid">
        {/* Painel de Controle */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ marginBottom: '1rem' }}>🎯 Iniciar Nova Conversa</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <label>Sessão 1 (Número A)</label>
                <select
                  value={sessao1}
                  onChange={(e) => setSessao1(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', marginTop: '0.3rem' }}
                >
                  <option value="">Selecione...</option>
                  {sessoes.map(s => (
                    <option key={s.sessao} value={s.sessao}>Sessão {s.sessao} - {s.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label>Sessão 2 (Número B)</label>
                <select
                  value={sessao2}
                  onChange={(e) => setSessao2(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', marginTop: '0.3rem' }}
                >
                  <option value="">Selecione...</option>
                  {sessoes.map(s => (
                    <option key={s.sessao} value={s.sessao}>Sessão {s.sessao} - {s.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label>Tema (Opcional)</label>
                <select
                  value={tema}
                  onChange={(e) => setTema(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', marginTop: '0.3rem' }}
                >
                  <option value="">Aleatório</option>
                  {temas.map(t => (
                    <option key={t.id} value={t.id}>{t.nome} ({t.qtdConversas})</option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={iniciarConversa}
              disabled={loading || !sessao1 || !sessao2}
              style={{
                marginTop: '1rem',
                padding: '0.7rem 1.5rem',
                background: loading ? '#ccc' : '#818cf8',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: loading ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <Zap size={18} />
              {loading ? 'Iniciando...' : 'Iniciar Conversa'}
            </button>
          </div>
        </div>

        {/* Conversas Ativas */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <h2 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Play size={20} style={{ color: '#10b981' }} />
            Conversas Ativas ({conversas.length})
          </h2>

          {conversas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
              <p>Nenhuma conversa ativa no momento</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {conversas.map(conv => (
                <div
                  key={conv.conversaId}
                  style={{
                    padding: '1rem',
                    background: activeConversaId === conv.conversaId ? 'rgba(16, 185, 129, 0.1)' : 'rgba(129, 140, 248, 0.05)',
                    border: activeConversaId === conv.conversaId ? '2px solid #10b981' : '1px solid rgba(129, 140, 248, 0.2)',
                    borderRadius: '0.5rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <strong>{conv.conversaId}</strong>
                    <span style={{ fontSize: '0.85rem', color: '#666' }}>
                      {conv.mensagens} mensagens
                    </span>
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.8rem' }}>
                    Sessão {conv.sessao1} ↔ Sessão {conv.sessao2} | Tema: {conv.tema}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => proximaMensagem(conv.conversaId)}
                      style={{
                        padding: '0.5rem 1rem',
                        background: '#818cf8',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.3rem',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem'
                      }}
                    >
                      <Play size={14} />
                      Próxima Mensagem
                    </button>
                    <button
                      onClick={() => verHistorico(conv.conversaId)}
                      style={{
                        padding: '0.5rem 1rem',
                        background: '#6366f1',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.3rem',
                        cursor: 'pointer',
                        fontSize: '0.85rem'
                      }}
                    >
                      📋 Histórico
                    </button>
                    <button
                      onClick={() => pararConversa(conv.conversaId)}
                      style={{
                        padding: '0.5rem 1rem',
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.3rem',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem'
                      }}
                    >
                      <Pause size={14} />
                      Parar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <h3>📌 Como Usar</h3>
          <ul style={{ marginLeft: '1.5rem', lineHeight: '1.8' }}>
            <li>Selecione duas sessões conectadas (números WhatsApp)</li>
            <li>Opcionalmente, escolha um tema para a conversa</li>
            <li>Clique em "Iniciar Conversa" para começar</li>
            <li>Use "Próxima Mensagem" para simular a conversa progredindo</li>
            <li>Clique em "Histórico" para ver todas as mensagens trocadas</li>
            <li>Use "Parar" para encerrar a conversa</li>
          </ul>
        </div>

        {/* Status Box */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <h3>✅ Status do Sistema</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
            <div>
              <strong>Sessões Conectadas:</strong>
              <p style={{ color: '#10b981', fontSize: '1.3rem', marginTop: '0.3rem' }}>
                {sessoes.length}
              </p>
            </div>
            <div>
              <strong>Temas Disponíveis:</strong>
              <p style={{ color: '#818cf8', fontSize: '1.3rem', marginTop: '0.3rem' }}>
                {temas.length}
              </p>
            </div>
            <div>
              <strong>Conversas Ativas:</strong>
              <p style={{ color: '#f59e0b', fontSize: '1.3rem', marginTop: '0.3rem' }}>
                {conversas.length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
