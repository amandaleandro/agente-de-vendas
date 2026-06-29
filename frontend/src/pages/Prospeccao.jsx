import { useState } from 'react'

export default function Prospeccao() {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleLoad = async () => {
    if (!file) return
    setLoading(true)
    try {
      const text = await file.text()
      // Simulando chamada para backend
      console.log("Enviando CSV:", text.substring(0, 50))
      // setPreview(mockData)
      setPreview([{ nome: 'Empresa Teste', telefone: '5511999999999', categoria: 'Varejo' }])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="page-title">Lista de Prospecção</h1>
      <p className="page-subtitle">Envie sua planilha CSV para iniciar os envios</p>

      <div className="glass-card" style={{ maxWidth: '600px' }}>
        <div className="input-group">
          <label className="input-label">Selecione o arquivo CSV</label>
          <input type="file" accept=".csv" className="input-field" onChange={handleFileChange} />
        </div>
        
        <button 
          className="btn btn-primary" 
          disabled={!file || loading}
          onClick={handleLoad}
        >
          {loading ? 'Carregando...' : 'Carregar e Conferir'}
        </button>

        {preview && (
          <div style={{ marginTop: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Amostra da Lista</h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Empresa</th>
                    <th>Telefone</th>
                    <th>Segmento</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((p, i) => (
                    <tr key={i}>
                      <td>{p.nome}</td>
                      <td>{p.telefone}</td>
                      <td>{p.categoria}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <button className="btn btn-primary" style={{ marginTop: '1.5rem', background: 'var(--success)' }}>
              ▶ Iniciar Prospecção
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
