import React, { useState } from 'react';
import { Upload, Play, Pause, Trash2, List } from 'lucide-react';

export default function Prospeccao() {
  const [file, setFile] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const uploadCSV = async () => {
    if (!file) return alert('Selecione um arquivo CSV primeiro.');
    const formData = new FormData();
    formData.append('csv', file);

    try {
      const res = await fetch('/api/prospeccao/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      alert(data.mensagem || 'Upload concluído');
    } catch (e) {
      alert('Erro ao enviar arquivo.');
    }
  };

  return (
    <div>
      <h1>Prospecção e Liderança de IA</h1>
      <p style={{ marginBottom: '2rem' }}>Gerencie suas campanhas de envio e aquecimento de leads.</p>
      
      <div className="grid-cards">
        <div className="glass-panel" style={{ padding: '1.5rem', gridColumn: 'span 2' }}>
          <h2>📤 Carregar Base de Leads (CSV)</h2>
          <p style={{ marginBottom: '1rem' }}>O arquivo deve conter as colunas "numero" e "nome".</p>
          
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <input type="file" accept=".csv" onChange={handleFileChange} className="form-input" style={{ flex: 1 }} />
            <button className="btn btn-primary" onClick={uploadCSV}>
              <Upload size={18} /> Processar
            </button>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h2>⚙️ Controle da Fila</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <button className="btn btn-success" style={{ width: '100%', justifyContent: 'center' }}>
              <Play size={18} /> Iniciar Prospecção
            </button>
            <button className="btn btn-warning" style={{ width: '100%', justifyContent: 'center', background: 'var(--warning)', color: '#fff' }}>
              <Pause size={18} /> Pausar Envios
            </button>
            <button className="btn btn-danger" style={{ width: '100%', justifyContent: 'center' }}>
              <Trash2 size={18} /> Limpar Fila Atual
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
