import React, { useState, useEffect } from 'react';
import { Save, Key } from 'lucide-react';

export default function Configuracao() {
  const [config, setConfig] = useState({
    WHATSAPP_NUMEROS: 1,
    BOT_NUMEROS_ATIVOS: '1',
    GEMINI_API_KEY: '',
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

  const salvar = async () => {
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
      } else {
        alert('Erro ao salvar');
      }
    } catch (e) {
      alert('Falha na comunicação com a API');
    }
  };

  if (loading) return <div>Carregando configurações...</div>;

  const arrNumeros = Array.from({ length: config.WHATSAPP_NUMEROS }, (_, i) => i + 1);

  return (
    <div>
      <h1>Configurações do Sistema</h1>
      <p style={{ marginBottom: '2rem' }}>Ajuste parâmetros do bot e defina a atuação da IA.</p>

      <div className="grid-cards">
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h2>📱 Configuração de Linhas</h2>
          
          <div className="form-group">
            <label className="form-label">Quantidade de Números Vinculados (Total de QRs)</label>
            <input type="number" name="WHATSAPP_NUMEROS" value={config.WHATSAPP_NUMEROS} onChange={handleChange} min="1" max="10" className="form-input" />
            <p style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: '#f59e0b' }}>⚠️ Reinicie o bot para aplicar conexões adicionais.</p>
          </div>
          
          <div className="form-group" style={{ marginTop: '2rem' }}>
            <label className="form-label">Em quais números a Inteligência Artificial deve atuar?</label>
            <p style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>Marque apenas os chips de prospecção. Chips desmarcados podem ser usados por você manualmente.</p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {arrNumeros.map(n => {
                const checked = config.BOT_NUMEROS_ATIVOS.split(',').includes(n.toString());
                return (
                  <label key={n} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: checked ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', border: checked ? '1px solid #10b981' : '1px solid transparent' }}>
                    <input type="checkbox" checked={checked} onChange={() => toggleAtivo(n)} style={{ display: 'none' }} />
                    <span style={{ fontWeight: 'bold' }}>Chip {n}</span>
                  </label>
                );
              })}
            </div>
          </div>
          
          <div className="form-group" style={{ marginTop: '2rem' }}>
            <label className="form-label">Nome dos Agentes (Chips)</label>
            <p style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>Identifique quem ou qual bot está usando cada número.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {arrNumeros.map(n => (
                <div key={n} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ minWidth: '70px', fontWeight: 'bold' }}>Chip {n}:</span>
                  <input 
                    type="text" 
                    name={`WHATSAPP_${n}_NOME`} 
                    value={config[`WHATSAPP_${n}_NOME`] || ''} 
                    onChange={handleChange} 
                    className="form-input" 
                    placeholder={`Nome para o Chip ${n}`}
                  />
                </div>
              ))}
            </div>
          </div>
          
          <button className="btn btn-primary" onClick={salvar} style={{ marginTop: '1rem' }}>
            <Save size={18} /> Salvar Configurações
          </button>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h2>🤖 Inteligência Artificial</h2>
          
          <div className="form-group">
            <label className="form-label">Google Gemini API Key</label>
            <div style={{ position: 'relative' }}>
              <Key size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: '#94a3b8' }} />
              <input type="password" name="GEMINI_API_KEY" placeholder="AIzaSy..." value={config.GEMINI_API_KEY} onChange={handleChange} className="form-input" style={{ paddingLeft: '2.5rem' }} />
            </div>
          </div>
          
          <div className="form-group">
            <label className="form-label">Temperatura da IA (0.0 a 1.0)</label>
            <input type="number" name="IA_TEMPERATURE" step="0.1" value={config.IA_TEMPERATURE} onChange={handleChange} className="form-input" />
          </div>
          
          <button className="btn btn-primary" onClick={salvar}>
            <Save size={18} /> Salvar IA
          </button>
        </div>
      </div>
    </div>
  );
}
