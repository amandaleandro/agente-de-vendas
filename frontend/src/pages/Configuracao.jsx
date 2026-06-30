import React, { useState, useEffect } from 'react';
import { Save, Key, Cpu } from 'lucide-react';

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
      </div>
    </div>
  );
}
