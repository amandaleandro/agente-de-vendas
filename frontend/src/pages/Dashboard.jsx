import { useState, useEffect } from 'react'

export default function Dashboard() {
  const [status, setStatus] = useState(null)

  useEffect(() => {
    fetch('/api/status')
      .then(r => r.json())
      .then(d => setStatus(d))
      .catch(e => console.error(e))
  }, [])

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>
      <p className="page-subtitle">Visão geral do sistema de vendas Fezinha</p>

      <div className="grid-cards">
        <div className="glass-card">
          <h2 style={{ color: 'var(--accent-primary)', marginBottom: '1rem' }}>📱 WhatsApp</h2>
          <div className="grid-stats" style={{ marginBottom: '1rem' }}>
            <div className="stat-box">
              <div className="num">4</div>
              <div className="label">Configurados</div>
            </div>
            <div className="stat-box">
              <div className="num">1</div>
              <div className="label">Conectados</div>
            </div>
          </div>
          <span className="badge badge-warning">⏳ Aguardando QR Codes</span>
        </div>

        <div className="glass-card">
          <h2 style={{ color: 'var(--accent-primary)', marginBottom: '1rem' }}>📞 Prospecção</h2>
          <div className="grid-stats" style={{ marginBottom: '1rem' }}>
            <div className="stat-box">
              <div className="num">20</div>
              <div className="label">Carregados</div>
            </div>
            <div className="stat-box">
              <div className="num">0</div>
              <div className="label">Enviados</div>
            </div>
          </div>
          <span className="badge badge-success">✅ Ativa</span>
        </div>
      </div>

      <div className="glass-card">
        <h2 style={{ color: 'var(--accent-primary)', marginBottom: '1rem' }}>🎉 Status do Sistema</h2>
        {status ? (
          <div>
            <p><strong>WhatsApp:</strong> {status.conectado ? 'Conectado' : 'Desconectado'}</p>
            <p><strong>Última atualização:</strong> {new Date(status.timestamp).toLocaleString()}</p>
          </div>
        ) : (
          <p>Carregando status do backend...</p>
        )}
      </div>
    </div>
  )
}
