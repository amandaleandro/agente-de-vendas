import React from 'react';
import { Save, Key } from 'lucide-react';

export default function Configuracao() {
  const salvar = () => {
    alert('Configurações salvas com sucesso! (Simulado - conecte com seu endpoint .env)');
  };

  return (
    <div>
      <h1>Configurações do Sistema</h1>
      <p style={{ marginBottom: '2rem' }}>Ajuste parâmetros do bot e chaves de IA.</p>

      <div className="grid-cards">
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h2>🤖 Inteligência Artificial</h2>
          
          <div className="form-group">
            <label className="form-label">Google Gemini API Key</label>
            <div style={{ position: 'relative' }}>
              <Key size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: '#94a3b8' }} />
              <input type="password" placeholder="AIzaSy..." className="form-input" style={{ paddingLeft: '2.5rem' }} />
            </div>
          </div>
          
          <div className="form-group">
            <label className="form-label">Temperatura da IA (0.0 a 1.0)</label>
            <input type="number" step="0.1" defaultValue="0.7" className="form-input" />
          </div>
          
          <button className="btn btn-primary" onClick={salvar}>
            <Save size={18} /> Salvar IA
          </button>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h2>📱 WhatsApp</h2>
          
          <div className="form-group">
            <label className="form-label">Quantidade de Números Conectados</label>
            <input type="number" defaultValue="2" min="1" max="10" className="form-input" />
          </div>
          
          <div className="form-group">
            <label className="form-label">Intervalo de Prospecção (segundos)</label>
            <input type="number" defaultValue="120" min="30" className="form-input" />
          </div>

          <button className="btn btn-primary" onClick={salvar}>
            <Save size={18} /> Salvar WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}
