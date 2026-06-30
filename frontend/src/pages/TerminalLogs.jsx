import React, { useState, useEffect, useRef } from 'react';
import { Terminal, RefreshCw, Download } from 'lucide-react';

export default function TerminalLogs() {
  const [logs, setLogs] = useState('');
  const bottomRef = useRef(null);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/logs');
      const data = await res.json();
      if (data.logs) {
        setLogs(data.logs);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div style={{ height: 'calc(100vh - 4rem)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h1><Terminal size={28} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem' }} />Terminal de Logs</h1>
          <p>Monitoramento do cérebro do bot em tempo real.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-primary" onClick={fetchLogs}>
            <RefreshCw size={18} /> Forçar Atualização
          </button>
        </div>
      </div>
      
      <div className="glass-panel" style={{ 
        flex: 1, 
        padding: '1.5rem', 
        background: '#050505',
        color: '#34d399',
        fontFamily: 'monospace',
        fontSize: '0.875rem',
        lineHeight: '1.6',
        overflowY: 'auto',
        border: '1px solid #333'
      }}>
        {logs.split('\\n').map((linha, i) => (
          <div key={i} style={{ wordBreak: 'break-all' }}>{linha}</div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
