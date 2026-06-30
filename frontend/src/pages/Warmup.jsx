import React, { useState, useEffect } from 'react';
import { Play, Square, Eye, Trash2, RefreshCw } from 'lucide-react';

export default function Warmup() {
  const [temas, setTemas] = useState([]);
  const [conversasAtivas, setConversasAtivas] = useState([]);
  const [selecionado, setSelecionado] = useState({ sessao1: 1, sessao2: 2, tema: '' });
  const [carregando, setCarregando] = useState(true);
  const [iniciando, setIniciando] = useState(false);

  useEffect(() => {
    carregarDados();
    const interval = setInterval(carregarDados, 3000);
    return () => clearInterval(interval);
  }, []);

  const carregarDados = async () => {
    try {
      const [temaRes, ativasRes] = await Promise.all([
        fetch('/api/conversation/temas'),
        fetch('/api/conversation/ativas')
      ]);

      if (temaRes.ok) {
        const data = await temaRes.json();
        setTemas(data.temas || []);
      }

      if (ativasRes.ok) {
        const data = await ativasRes.json();
        setConversasAtivas(data.conversas || []);
      }

      setCarregando(false);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    }
  };

  const iniciarConversa = async () => {
    if (!selecionado.sessao1 || !selecionado.sessao2) {
      alert('Selecione duas sessões diferentes');
      return;
    }

    setIniciando(true);
    try {
      const res = await fetch('/api/conversation/iniciar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessao1: parseInt(selecionado.sessao1),
          sessao2: parseInt(selecionado.sessao2),
          tema: selecionado.tema || null
        })
      });

      const data = await res.json();
      if (data.sucesso) {
        alert(`✅ Conversa iniciada: ${data.mensagem}`);
        carregarDados();
        setSelecionado({ sessao1: 1, sessao2: 2, tema: '' });
      } else {
        alert(`❌ Erro: ${data.erro}`);
      }
    } catch (err) {
      alert(`Erro ao iniciar: ${err.message}`);
    } finally {
      setIniciando(false);
    }
  };

  const pararConversa = async (conversaId) => {
    if (!confirm('Parar esta conversa?')) return;

    try {
      const res = await fetch(`/api/conversation/parar/${conversaId}`, {
        method: 'POST'
      });

      const data = await res.json();
      if (data.sucesso) {
        carregarDados();
      } else {
        alert(`Erro: ${data.erro}`);
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
        const texto = data.mensagens
          .map(m => `[Sessão ${m.sessao}]: ${m.texto}`)
          .join('\n');
        alert(`Conversa ${conversaId}:\n\n${texto}`);
      }
    } catch (err) {
      alert(`Erro: ${err.message}`);
    }
  };

  if (carregando) return <div>Carregando...</div>;

  return (
    <div className="fade-in">
      <div className="header-actions">
        <h1>🔥 Warmup - Conversa Cruzada entre Bots</h1>
      </div>

      <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 1fr', maxWidth: '1200px', margin: '0 auto' }}>
        {/* Painel de Controle */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h2>🎬 Iniciar Nova Conversa</h2>

          <div className="form-group">
            <label className="form-label">Sessão 1</label>
            <input
              type="number"
              min="1"
              value={selecionado.sessao1}
              onChange={(e) => setSelecionado({ ...selecionado, sessao1: e.target.value })}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Sessão 2</label>
            <input
              type="number"
              min="1"
              value={selecionado.sessao2}
              onChange={(e) => setSelecionado({ ...selecionado, sessao2: e.target.value })}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Tema (Opcional)</label>
            <select
              value={selecionado.tema}
              onChange={(e) => setSelecionado({ ...selecionado, tema: e.target.value })}
              className="form-input"
            >
              <option value="">Aleatório</option>
              {temas.map(t => (
                <option key={t.id} value={t.id}>
                  {t.nome} ({t.qtdConversas} conversas)
                </option>
              ))}
            </select>
          </div>

          <button
            className="btn btn-primary"
            onClick={iniciarConversa}
            disabled={iniciando}
            style={{ width: '100%', marginTop: '1rem' }}
          >
            <Play size={18} /> {iniciando ? 'Iniciando...' : 'Iniciar Conversa'}
          </button>

          <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#334155', borderRadius: '8px', fontSize: '0.85rem', lineHeight: '1.6', color: '#cbd5e1' }}>
            <strong>📚 Temas Disponíveis:</strong>
            <ul style={{ margin: '0.5rem 0 0 1.5rem' }}>
              {temas.map(t => (
                <li key={t.id}>{t.nome}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Conversas Ativas */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0 }}>💬 Conversas Ativas</h2>
            <button
              className="btn btn-secondary"
              onClick={carregarDados}
              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
            >
              <RefreshCw size={14} />
            </button>
          </div>

          {conversasAtivas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
              Nenhuma conversa ativa
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {conversasAtivas.map(conv => (
                <div
                  key={conv.conversaId}
                  style={{
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '1rem',
                    backgroundColor: '#1e293b'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', color: '#fff' }}>
                      Sessão {conv.sessao1} ↔️ Sessão {conv.sessao2}
                    </h3>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => verHistorico(conv.conversaId)}
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                      >
                        <Eye size={12} />
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => pararConversa(conv.conversaId)}
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', backgroundColor: '#ef4444' }}
                      >
                        <Square size={12} />
                      </button>
                    </div>
                  </div>

                  <p style={{ margin: '0.25rem 0', fontSize: '0.85rem', color: '#cbd5e1' }}>
                    📝 {conv.mensagens} mensagens
                  </p>
                  <p style={{ margin: '0.25rem 0', fontSize: '0.85rem', color: '#94a3b8' }}>
                    🎯 Tema: {conv.tema}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
