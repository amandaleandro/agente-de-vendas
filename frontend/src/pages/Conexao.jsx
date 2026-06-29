import React, { useState, useEffect } from 'react';
import { QrCode, CheckCircle2, RefreshCw } from 'lucide-react';

export default function Conexao() {
  const [status, setStatus] = useState([]);
  const [qrcodes, setQrcodes] = useState({});

  const fetchData = async () => {
    try {
      const [resStatus, resQr] = await Promise.all([
        fetch('/api/whatsapp-status').then(r => r.json()),
        fetch('/api/qrcodes').then(r => r.json())
      ]);
      setStatus(resStatus.status || []);
      setQrcodes(resQr.qrcodes || {});
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1>Conexão WhatsApp</h1>
          <p>Vincule seus números lendo o QR Code.</p>
        </div>
        <button className="btn btn-primary" onClick={fetchData}>
          <RefreshCw size={18} /> Atualizar
        </button>
      </div>
      
      <div className="grid-cards">
        {status.map((sessao) => (
          <div key={sessao.sessao} className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <h3 style={{ marginBottom: '1rem' }}>{sessao.nome}</h3>
            
            {sessao.conectado ? (
              <div style={{ padding: '2rem 0' }}>
                <CheckCircle2 size={48} color="#34d399" style={{ margin: '0 auto 1rem' }} />
                <span className="badge badge-success">Conectado e Operacional</span>
              </div>
            ) : sessao.temQR && qrcodes[sessao.sessao] ? (
              <div>
                <span className="badge badge-warning" style={{ marginBottom: '1rem', display: 'inline-block' }}>Aguardando Leitura</span>
                <div style={{ 
                  background: '#f8fafc', 
                  padding: '1rem', 
                  borderRadius: '8px',
                  fontFamily: 'monospace',
                  fontSize: '8px',
                  lineHeight: '1',
                  color: '#000',
                  maxHeight: '220px',
                  overflowY: 'auto',
                  wordBreak: 'break-all'
                }}>
                  {qrcodes[sessao.sessao]}
                </div>
                <p style={{ fontSize: '0.875rem', marginTop: '1rem' }}>Abra o WhatsApp e leia o QR Code acima.</p>
              </div>
            ) : (
              <div style={{ padding: '2rem 0' }}>
                <QrCode size={48} color="#94a3b8" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                <span className="badge badge-error">Inicializando Sessão...</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
