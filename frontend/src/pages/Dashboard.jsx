import React, { useState, useEffect } from 'react';
import { Activity, MessageSquare, Zap, Cpu } from 'lucide-react';

export default function Dashboard() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    fetch('/api/status')
      .then(res => res.json())
      .then(data => setStatus(data))
      .catch(console.error);
  }, []);

  return (
    <div>
      <h1>Dashboard Geral</h1>
      <p style={{ marginBottom: '2rem' }}>Visão geral em tempo real do sistema.</p>
      
      <div className="grid-cards">
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ background: 'rgba(99, 102, 241, 0.2)', padding: '0.75rem', borderRadius: '12px', color: '#818cf8' }}>
              <Activity size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0 }}>Status do Bot</h3>
              <p style={{ fontSize: '0.875rem' }}>Conexão com WhatsApp</p>
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
            {status ? (status.conectado ? <span style={{ color: '#34d399' }}>Online</span> : <span style={{ color: '#f87171' }}>Offline</span>) : '...'}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.2)', padding: '0.75rem', borderRadius: '12px', color: '#34d399' }}>
              <MessageSquare size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0 }}>Números</h3>
              <p style={{ fontSize: '0.875rem' }}>WhatsApp Vinculados</p>
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
            {status ? \`\${status.numerosConectados} / \${status.numerosConfigurados}\` : '...'}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ background: 'rgba(245, 158, 11, 0.2)', padding: '0.75rem', borderRadius: '12px', color: '#fbbf24' }}>
              <Zap size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0 }}>Prospecções</h3>
              <p style={{ fontSize: '0.875rem' }}>Hoje</p>
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
            --
          </div>
        </div>
        
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ background: 'rgba(236, 72, 153, 0.2)', padding: '0.75rem', borderRadius: '12px', color: '#f472b6' }}>
              <Cpu size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0 }}>Inteligência Artifical</h3>
              <p style={{ fontSize: '0.875rem' }}>Status do Agente</p>
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
            <span className="badge badge-success">Pronta</span>
          </div>
        </div>
      </div>
    </div>
  );
}
