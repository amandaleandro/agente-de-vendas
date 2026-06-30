import React, { useState, useEffect } from 'react';
import { Save, Key, Cpu, RotateCcw } from 'lucide-react';

export default function Configuracao() {
  const [config, setConfig] = useState({
    WHATSAPP_NUMEROS: 1,
    BOT_NUMEROS_ATIVOS: '1',
    GEMINI_API_KEY: '',
    OPENAI_API_KEY: '',
    IA_PROVIDER: 'gemini',
    IA_TEMPERATURE: 0.7
  });

  const [loading, setLoading] = useState(true);
  const [warmupStatus, setWarmupStatus] = useState([]);
  const [resettingSession, setResettingSession] = useState(null);

  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(data => {
        setConfig({
          ...data,
          WHATSAPP_NUMEROS: Number(data.WHATSAPP_NUMEROS) || 1,
          BOT_NUMEROS_ATIVOS: data.BOT_NUMEROS_ATIVOS || '1',
          GEMINI_API_KEY: data.GEMINI_API_KEY || '',
          OPENAI_API_KEY: data.OPENAI_API_KEY || '',
          IA_PROVIDER: data.IA_PROVIDER || 'gemini',
          IA_TEMPERATURE: Number(data.IA_TEMPERATURE) || 0.7
        });
        setLoading(false);
      });

    // Carregar status do warmup
    fetch('/api/warmup/status')
      .then(r => r.json())
      .then(data => setWarmupStatus(data.status || []))
      .catch(() => {});

    // Atualizar a cada 30 segundos
    const interval = setInterval(() => {
      fetch('/api/warmup/status')
        .then(r => r.json())
        .then(data => setWarmupStatus(data.status || []))
        .catch(() => {});
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleChange = (e) => {
    setConfig({ ...config, [e.target.name]: e.target.value });
  };

  const toggleAtivo = (num) => {
    let ativos = config.BOT_NUMEROS_ATIVOS.split(',').filter(Boolean);
    const n = num.toString();
    if (ativos.includes(n)) {
      ativos = ativos.filter(x => x !== n);
    } else {
      ativos.push(n);
    }
    setConfig({ ...config, BOT_NUMEROS_ATIVOS: ativos.join(',') });
  };

  const salvar = () => {
    fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    }).then(r => r.json())
      .then(data => {
        if (data.success) {
          alert('Configurações salvas!');
          fetch('/api/reiniciar-bot', { method: 'POST' }); // auto-restart
        }
      });
  };

  const resetarSessao = (sessao) => {
    if (!confirm(`Tem certeza que quer resetar a sessão ${sessao}? Isso limpará todos os dados de warmup.`)) return;

    setResettingSession(sessao);
    fetch('/api/warmup/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessao })
    }).then(r => r.json())
      .then(data => {
        if (data.success) {
          alert(`Sessão ${sessao} resetada com sucesso!`);
          // Recarregar warmup status
          fetch('/api/warmup/status')
            .then(r => r.json())
            .then(d => setWarmupStatus(d.status || []))
            .finally(() => setResettingSession(null));
        }
      })
      .catch(() => setResettingSession(null));
  };

  const resetarDia = () => {
    if (!confirm('Resetar todos os contadores do dia?')) return;

    fetch('/api/warmup/reset-dia', { method: 'POST' })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          alert('Contadores diários resetados!');
          setWarmupStatus(data.relatorio || []);
        }
      });
  };

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="fade-in">
      <div className="header-actions">
        <h1>Configurações do Sistema</h1>
      </div>

      <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr', maxWidth: '800px', margin: '0 auto' }}>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h2>📱 WhatsApp</h2>
          
          <div className="form-group">
            <label className="form-label">Quantidade de Chips (Contas)</label>
            <input type="number" name="WHATSAPP_NUMEROS" min="1" max="10" value={config.WHATSAPP_NUMEROS} onChange={handleChange} className="form-input" />
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <label className="form-label">Configuração dos Chips</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginTop: '0.5rem' }}>
              {Array.from({ length: config.WHATSAPP_NUMEROS }).map((_, i) => {
                const n = i + 1;
                const isAtivo = config.BOT_NUMEROS_ATIVOS.split(',').includes(n.toString());
                const nomeKey = `WHATSAPP_${n}_NOME`;
                return (
                  <div key={n} style={{ border: '1px solid #334155', borderRadius: '8px', padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <strong style={{ color: '#fff' }}>Chip {n}</strong>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                        <input type="checkbox" checked={isAtivo} onChange={() => toggleAtivo(n)} /> Ativar Bot
                      </label>
                    </div>
                    <input 
                      type="text" 
                      name={nomeKey} 
                      value={config[nomeKey] || ''} 
                      onChange={handleChange} 
                      className="form-input" 
                      placeholder={`Nome para o Chip ${n}`}
                    />
                  </div>
                );
              })}
            </div>
          </div>
          
          <button className="btn btn-primary" onClick={salvar} style={{ marginTop: '1rem' }}>
            <Save size={18} /> Salvar Configurações
          </button>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h2>🤖 Inteligência Artificial</h2>
          
          <div className="form-group">
            <label className="form-label">Provedor Principal (Cérebro da IA)</label>
            <div style={{ position: 'relative' }}>
              <Cpu size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: '#94a3b8' }} />
              <select name="IA_PROVIDER" value={config.IA_PROVIDER} onChange={handleChange} className="form-input" style={{ paddingLeft: '2.5rem', appearance: 'none' }}>
                <option value="gemini">Google Gemini (Flash)</option>
                <option value="openai">OpenAI (ChatGPT)</option>
                <option value="xai">xAI (Grok)</option>
              </select>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>
              Qual modelo de IA irá processar as mensagens e gerar respostas.
            </p>
          </div>

          {config.IA_PROVIDER === 'gemini' && (
            <div className="form-group slide-in">
              <label className="form-label">Google Gemini API Key</label>
              <div style={{ position: 'relative' }}>
                <Key size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: '#94a3b8' }} />
                <input type="password" name="GEMINI_API_KEY" placeholder="AIzaSy..." value={config.GEMINI_API_KEY} onChange={handleChange} className="form-input" style={{ paddingLeft: '2.5rem' }} />
              </div>
            </div>
          )}

          {config.IA_PROVIDER === 'openai' && (
            <div className="form-group slide-in">
              <label className="form-label">OpenAI API Key</label>
              <div style={{ position: 'relative' }}>
                <Key size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: '#94a3b8' }} />
                <input type="password" name="OPENAI_API_KEY" placeholder="sk-..." value={config.OPENAI_API_KEY} onChange={handleChange} className="form-input" style={{ paddingLeft: '2.5rem' }} />
              </div>
            </div>
          )}
          
          <div className="form-group">
            <label className="form-label">Temperatura da IA (0.0 a 1.0)</label>
            <input type="number" name="IA_TEMPERATURE" step="0.1" value={config.IA_TEMPERATURE} onChange={handleChange} className="form-input" />
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>Valores mais baixos (0.3) deixam a IA mais direta e vendedora. Valores altos (0.8) deixam mais criativa.</p>
          </div>
          
          <button className="btn btn-primary" onClick={salvar}>
            <Save size={18} /> Salvar IA
          </button>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0 }}>🔥 Warmup - Limite de Envios</h2>
            <button className="btn btn-secondary" onClick={resetarDia} style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}>
              <RotateCcw size={14} style={{ marginRight: '0.25rem' }} /> Reset Diário
            </button>
          </div>

          <p style={{ color: '#94a3b8', marginBottom: '1rem', fontSize: '0.9rem' }}>
            O warmup controla quantas mensagens cada número pode enviar por dia, aumentando gradualmente conforme o número "aquece".
          </p>

          {warmupStatus.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
              Carregando dados de warmup...
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
              {warmupStatus.map(status => (
                <div key={status.sessao} style={{
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  padding: '1rem',
                  backgroundColor: '#1e293b'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
                    <div>
                      <h3 style={{ margin: '0 0 0.25rem 0', color: '#fff', fontSize: '1rem' }}>
                        Sessão {status.sessao}
                      </h3>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>
                        {status.nivelTexto}
                      </p>
                    </div>
                    <button
                      className="btn btn-secondary"
                      onClick={() => resetarSessao(status.sessao)}
                      disabled={resettingSession === status.sessao}
                      style={{
                        fontSize: '0.75rem',
                        padding: '0.25rem 0.5rem',
                        opacity: resettingSession === status.sessao ? 0.6 : 1
                      }}
                    >
                      <RotateCcw size={12} />
                    </button>
                  </div>

                  {/* Barra de progresso */}
                  <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                      <span style={{ color: '#e2e8f0' }}>
                        {status.enviados}/{status.quota}
                      </span>
                      <span style={{ color: '#94a3b8' }}>
                        {status.diasAtivos} dia(s)
                      </span>
                    </div>
                    <div style={{
                      width: '100%',
                      height: '8px',
                      backgroundColor: '#334155',
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${Math.min((status.enviados / status.quota) * 100, 100)}%`,
                        height: '100%',
                        backgroundColor: status.podeEnviar ? '#10b981' : '#ef4444',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  </div>

                  {/* Métricas */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem' }}>
                    <div style={{ padding: '0.5rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: '4px', border: '1px solid #10b98133' }}>
                      <div style={{ color: '#94a3b8' }}>Erros</div>
                      <div style={{ color: '#10b981', fontWeight: 'bold' }}>
                        {status.erros}
                      </div>
                    </div>
                    <div style={{ padding: '0.5rem', backgroundColor: status.podeEnviar ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', borderRadius: '4px', border: status.podeEnviar ? '1px solid #10b98133' : '1px solid #ef444433' }}>
                      <div style={{ color: '#94a3b8' }}>Status</div>
                      <div style={{ color: status.podeEnviar ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>
                        {status.podeEnviar ? '✅ Ativo' : '⏸️ Pausado'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#334155', borderRadius: '8px', fontSize: '0.8rem', lineHeight: '1.6', color: '#cbd5e1' }}>
            <strong>📚 Níveis do Warmup:</strong>
            <ul style={{ margin: '0.5rem 0 0 1.5rem' }}>
              <li>❄️ Nível 1: 10 msgs/dia (Dias 1-2)</li>
              <li>🧊 Nível 2: 20 msgs/dia (Dias 3-4)</li>
              <li>🔥 Nível 3: 50 msgs/dia (Dias 5-6)</li>
              <li>🚀 Nível 4: 100 msgs/dia (Dia 7+)</li>
              <li>⚡ Nível 5: 200 msgs/dia (Sem erros)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
