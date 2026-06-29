export default function Conexao() {
  return (
    <div>
      <h1 className="page-title">Conexão WhatsApp</h1>
      <p className="page-subtitle">Escaneie os QR Codes para conectar os números</p>

      <div className="grid-cards">
        {[1, 2, 3, 4].map(num => (
          <div key={num} className="glass-card" style={{ textAlign: 'center' }}>
            <h3 style={{ marginBottom: '0.5rem', color: 'var(--accent-primary)' }}>🤖 Número {num}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>
              Aguardando conexão...
            </p>
            <div style={{ 
              background: '#fff', 
              width: '200px', 
              height: '200px', 
              margin: '0 auto', 
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#333'
            }}>
              [QR CODE]
            </div>
            <div style={{ marginTop: '1rem' }}>
              <span className="badge badge-warning">⏳ Aguardando</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
