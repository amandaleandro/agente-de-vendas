import React, { useState, useEffect } from 'react';
import { QrCode as QrCodeIcon, CheckCircle2, RefreshCw } from 'lucide-react';
import QRCode from 'react-qr-code';

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
                <span className="badge badge-success" style={{ marginBottom: '1rem', display: 'inline-block' }}>Conectado e Operacional</span>
                <div style={{ marginTop: '1rem' }}>
                  <button className="btn btn-danger" onClick={async () => {
                    if (window.confirm('Tem certeza que deseja desconectar? Você precisará ler o QR Code novamente.')) {
                      await fetch(`/api/whatsapp/clear/${sessao.sessao}`, { method: 'POST' });
                      fetchData();
                    }
                  }}>Desconectar</button>
                </div>
              </div>
            ) : sessao.temQR && qrcodes[sessao.sessao] ? (
              <div>
                <span className="badge badge-warning" style={{ marginBottom: '1rem', display: 'inline-block' }}>Aguardando Leitura</span>
                <div style={{ 
                  background: '#fff', 
                  padding: '1rem', 
                  borderRadius: '12px',
                  display: 'inline-block',
                  margin: '0 auto'
                }}>
                  <QRCode value={qrcodes[sessao.sessao]} size={200} />
                </div>
                <p style={{ fontSize: '0.875rem', marginTop: '1rem' }}>Abra o WhatsApp e leia o QR Code acima.</p>
              </div>
            ) : (
              <div style={{ padding: '2rem 0' }}>
                <QrCodeIcon size={48} color="#94a3b8" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                {sessao.motivo ? (
                  <>
                    <span className="badge badge-error" style={{ marginBottom: '0.5rem', display: 'inline-block' }}>Desconectado</span>
                    <p style={{ color: 'var(--error)', fontSize: '0.875rem', marginBottom: '1rem' }}>Motivo: {sessao.motivo}</p>
                  </>
                ) : (
                  <span className="badge badge-error" style={{ marginBottom: '1rem', display: 'inline-block' }}>Inicializando Sessão...</span>
                )}
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                  <button className="btn btn-warning" onClick={async () => {
                    await fetch(`/api/whatsapp/reconnect/${sessao.sessao}`, { method: 'POST' });
                    fetchData();
                  }}>Reconectar</button>
                  <button className="btn btn-danger" onClick={async () => {
                    if (window.confirm('Tem certeza que deseja limpar a conexão deste número? Você precisará ler o QR Code novamente.')) {
                      await fetch(`/api/whatsapp/clear/${sessao.sessao}`, { method: 'POST' });
                      fetchData();
                    }
                  }}>Limpar</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
