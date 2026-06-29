export default function Config() {
  return (
    <div>
      <h1 className="page-title">Configurações</h1>
      <p className="page-subtitle">Ajuste os parâmetros da Inteligência Artificial, Roteiros e Sistema</p>

      <div className="grid-cards">
        <div className="glass-card">
          <h2 style={{ color: 'var(--accent-primary)', marginBottom: '1.5rem' }}>🤖 Configuração de IA</h2>
          
          <div className="input-group">
            <label className="input-label">Gemini API Key</label>
            <input type="password" placeholder="Sua chave API" className="input-field" />
          </div>
          
          <div className="input-group">
            <label className="input-label">Modelo Padrão</label>
            <select className="input-field">
              <option>gemini-2.5-flash</option>
              <option>gemini-2.5-pro</option>
            </select>
          </div>

          <div className="input-group">
            <label className="input-label">Temperatura (0-1)</label>
            <input type="number" step="0.1" defaultValue="0.3" className="input-field" />
          </div>

          <button className="btn btn-primary">💾 Salvar Alterações</button>
        </div>

        <div className="glass-card">
          <h2 style={{ color: 'var(--accent-primary)', marginBottom: '1.5rem' }}>⚙️ Configurações do Sistema</h2>
          
          <div className="input-group">
            <label className="input-label">Limite de Memória (GB)</label>
            <input type="number" defaultValue="3" className="input-field" />
          </div>

          <div className="input-group">
            <label className="input-label">Intervalo de Backup (horas)</label>
            <input type="number" defaultValue="6" className="input-field" />
          </div>

          <div className="input-group">
            <label className="input-label">Nível de Log</label>
            <select className="input-field">
              <option>🐛 Debug</option>
              <option selected>ℹ️ Info</option>
              <option>⚠️ Warn</option>
            </select>
          </div>

          <button className="btn btn-primary">💾 Salvar Sistema</button>
        </div>
      </div>
    </div>
  )
}
