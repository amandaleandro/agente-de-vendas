import React, { useState, useEffect } from 'react';
import { Upload, Play, Pause, Trash2, Users, History, CheckCircle, Download } from 'lucide-react';

export default function Prospeccao() {
  const [file, setFile] = useState(null);
  const [contatos, setContatos] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [loadingContatos, setLoadingContatos] = useState(true);
  const [activeTab, setActiveTab] = useState('fila'); // 'fila' ou 'historico'

  const fetchData = async () => {
    try {
      setLoadingContatos(true);
      // Busca Fila
      const resLista = await fetch('/api/prospeccao/lista');
      if (resLista.ok) {
        const data = await resLista.json();
        if (data.success && data.contatos) setContatos(data.contatos);
      }
      // Busca Histórico
      const resHist = await fetch('/api/prospeccao/historico');
      if (resHist.ok) {
        const dataHist = await resHist.json();
        if (dataHist.success && dataHist.historico) setHistorico(dataHist.historico);
      }
    } catch (e) {
      console.error('Erro ao buscar dados:', e);
    } finally {
      setLoadingContatos(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
      if (data.success) {
        alert(data.message || 'Upload concluído');
        fetchData(); // Atualiza tabelas
        setFile(null); // Limpa input
        document.querySelector('input[type="file"]').value = '';
      } else {
        alert('Erro no servidor: ' + (data.error || 'Erro desconhecido'));
      }
    } catch (e) {
      alert('Erro ao enviar arquivo.');
    }
  };

  const acao = async (endpoint) => {
    try {
      const res = await fetch(`/api/prospeccao/${endpoint}`, { method: 'POST' });
      const data = await res.json();
      alert(data.message || 'Comando enviado');
      if (endpoint === 'limpar') fetchData();
    } catch (e) {
      alert('Erro ao executar comando.');
    }
  };

  return (
    <div>
      <h1>Prospecção e Liderança de IA</h1>
      <p style={{ marginBottom: '2rem' }}>Gerencie suas campanhas de envio e aquecimento de leads.</p>
      
      <div className="grid-cards" style={{ marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', gridColumn: 'span 2' }}>
          <h2>📤 Carregar Base de Leads (CSV)</h2>
          <p style={{ marginBottom: '1rem' }}>O arquivo deve conter as colunas "numero" e "nome". A IA pula automaticamente contatos já prospectados.</p>
          
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
            <button className="btn btn-success" onClick={() => acao('iniciar')} style={{ width: '100%', justifyContent: 'center' }}>
              <Play size={18} /> Iniciar Prospecção
            </button>
            <button className="btn btn-warning" onClick={() => acao('pausar')} style={{ width: '100%', justifyContent: 'center', background: 'var(--warning)', color: '#fff' }}>
              <Pause size={18} /> Pausar Envios
            </button>
            <button className="btn btn-danger" onClick={() => acao('limpar')} style={{ width: '100%', justifyContent: 'center' }}>
              <Trash2 size={18} /> Limpar Fila Atual
            </button>
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '0' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <button 
            className="btn" 
            onClick={() => setActiveTab('fila')}
            style={{ flex: 1, padding: '1.5rem', borderRadius: 0, background: activeTab === 'fila' ? 'rgba(255,255,255,0.05)' : 'transparent', color: activeTab === 'fila' ? 'var(--primary)' : 'var(--text-dim)', borderBottom: activeTab === 'fila' ? '2px solid var(--primary)' : 'none' }}>
            <Users size={20} /> Contatos na Fila ({contatos.length})
          </button>
          <button 
            className="btn" 
            onClick={() => setActiveTab('historico')}
            style={{ flex: 1, padding: '1.5rem', borderRadius: 0, background: activeTab === 'historico' ? 'rgba(255,255,255,0.05)' : 'transparent', color: activeTab === 'historico' ? 'var(--success)' : 'var(--text-dim)', borderBottom: activeTab === 'historico' ? '2px solid var(--success)' : 'none' }}>
            <History size={20} /> Já Prospectados ({historico.length})
          </button>
        </div>

        <div style={{ padding: '1.5rem' }}>
          {loadingContatos ? (
            <p style={{ textAlign: 'center' }}>Carregando dados...</p>
          ) : activeTab === 'fila' ? (
            contatos.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                <p style={{ color: 'var(--text-dim)' }}>Nenhum contato na fila atual. Faça o upload de uma planilha CSV acima.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <th style={{ padding: '1rem', color: 'var(--text-dim)' }}>#</th>
                      <th style={{ padding: '1rem', color: 'var(--text-dim)' }}>Número</th>
                      <th style={{ padding: '1rem', color: 'var(--text-dim)' }}>Nome</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contatos.slice(0, 50).map((contato, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '1rem' }}>{index + 1}</td>
                        <td style={{ padding: '1rem' }}>{contato.numero || contato.telefone || contato['telefone/whatsapp'] || contato['whatsapp'] || contato['celular'] || (Object.values(contato).find(v => typeof v === 'string' && v.replace(/\\D/g, '').length >= 10)) || contato[0]}</td>
                        <td style={{ padding: '1rem' }}>{contato.nome || contato.empresa || contato['empresa/nome'] || (Object.values(contato).find(v => typeof v === 'string' && isNaN(v.replace(/\\D/g, '')))) || contato[1] || '---'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {contatos.length > 50 && (
                  <p style={{ textAlign: 'center', marginTop: '1rem', color: 'var(--text-dim)' }}>
                    Mostrando os primeiros 50 de {contatos.length} contatos.
                  </p>
                )}
              </div>
            )
          ) : (
            historico.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                <p style={{ color: 'var(--text-dim)' }}>Você ainda não prospectou nenhum contato. Eles aparecerão aqui após o envio.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <div style={{ padding: '1rem', display: 'flex', justifyContent: 'flex-end', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <button className="btn btn-primary" onClick={() => window.open('http://localhost:3099/api/prospeccao/exportar-historico', '_blank')}>
                    <Download size={18} /> Exportar para CSV
                  </button>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <th style={{ padding: '1rem', color: 'var(--text-dim)' }}>Status</th>
                      <th style={{ padding: '1rem', color: 'var(--text-dim)' }}>Número</th>
                      <th style={{ padding: '1rem', color: 'var(--text-dim)' }}>Contato/Empresa</th>
                      <th style={{ padding: '1rem', color: 'var(--text-dim)' }}>Data do Envio</th>
                      <th style={{ padding: '1rem', color: 'var(--text-dim)' }}>Chip Usado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historico.slice(0, 50).map((hist, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '1rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <CheckCircle size={16} /> Enviado
                        </td>
                        <td style={{ padding: '1rem' }}>{hist.telefone}</td>
                        <td style={{ padding: '1rem' }}>
                          {hist.nome || '-'} 
                          {hist.empresa && <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-dim)' }}>{hist.empresa}</span>}
                        </td>
                        <td style={{ padding: '1rem' }}>{new Date(hist.enviado_em).toLocaleString()}</td>
                        <td style={{ padding: '1rem' }}>Sessão {hist.sessao || 1}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {historico.length > 50 && (
                  <p style={{ textAlign: 'center', marginTop: '1rem', color: 'var(--text-dim)' }}>
                    Mostrando os 50 envios mais recentes de {historico.length} no total.
                  </p>
                )}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
