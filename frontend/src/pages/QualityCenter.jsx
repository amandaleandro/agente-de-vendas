import React, { useEffect, useState } from 'react';
import { AlertTriangle, Bot, ClipboardCheck, FlaskConical, MessageSquare, PauseCircle, PlayCircle, RefreshCw, ShieldAlert, TrendingUp, UserCheck } from 'lucide-react';

const cardStyle = { padding: '1rem', minHeight: 120 };
const tableCell = { padding: '0.85rem', borderBottom: '1px solid rgba(255,255,255,0.06)', verticalAlign: 'top' };

function Badge({ tone = 'success', children }) {
  const cls = tone === 'danger' ? 'badge-error' : tone === 'warning' ? 'badge-warning' : 'badge-success';
  return <span className={`badge ${cls}`}>{children}</span>;
}

export default function QualityCenter() {
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [textoSimulador, setTextoSimulador] = useState('Mando 30 orçamentos por semana mas o cliente some depois da proposta');
  const [simulacao, setSimulacao] = useState(null);

  const carregar = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/quality/dashboard');
      setDados(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
    const timer = setInterval(carregar, 8000);
    return () => clearInterval(timer);
  }, []);

  const assumir = async (item) => {
    await fetch('/api/quality/handoff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessao: item.sessao, jid: item.jid, motivo: 'central_qualidade' })
    });
    carregar();
  };

  const simular = async () => {
    const res = await fetch('/api/quality/simular', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texto: textoSimulador })
    });
    setSimulacao(await res.json());
  };

  if (loading && !dados) return <div style={{ padding: '2rem' }}>Carregando central de qualidade...</div>;

  const resumo = dados?.resumo || {};
  const fila = dados?.fila || [];
  const oportunidades = dados?.oportunidades || [];
  const riscos = dados?.risco?.sessoes || [];
  const experimentos = dados?.experimentos || [];

  return (
    <div style={{ paddingBottom: '3rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h1>Central de Qualidade</h1>
          <p>Fila de atendimento, oportunidades, risco dos chips, A/B testing e simulador do cérebro do bot.</p>
        </div>
        <button className="btn btn-primary" onClick={carregar}><RefreshCw size={18} /> Atualizar</button>
      </div>

      <div className="grid-cards" style={{ marginBottom: '1.5rem' }}>
        <div className="glass-panel" style={cardStyle}><MessageSquare color="#34d399" /><h3>Conversas</h3><strong style={{ fontSize: '2rem' }}>{resumo.conversas || 0}</strong></div>
        <div className="glass-panel" style={cardStyle}><UserCheck color="#f59e0b" /><h3>Fila humana</h3><strong style={{ fontSize: '2rem' }}>{resumo.filaHumana || 0}</strong></div>
        <div className="glass-panel" style={cardStyle}><TrendingUp color="#818cf8" /><h3>Leads quentes</h3><strong style={{ fontSize: '2rem' }}>{resumo.leadsQuentes || 0}</strong></div>
        <div className="glass-panel" style={cardStyle}><AlertTriangle color="#ef4444" /><h3>Frustrados</h3><strong style={{ fontSize: '2rem' }}>{resumo.frustrados || 0}</strong></div>
      </div>

      <h2>Assumir Agora</h2>
      <div className="glass-panel" style={{ overflow: 'hidden', marginBottom: '1.5rem' }}>
        {fila.length === 0 ? (
          <div style={{ padding: '1.5rem', color: 'var(--text-muted)' }}>Nenhuma conversa crítica no momento.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: 'rgba(0,0,0,0.2)' }}><th style={tableCell}>Lead</th><th style={tableCell}>Score</th><th style={tableCell}>Motivo</th><th style={tableCell}>Próxima ação</th><th style={tableCell}>Ação</th></tr></thead>
            <tbody>
              {fila.map(item => (
                <tr key={`${item.sessao}:${item.jid}`}>
                  <td style={tableCell}><strong>{item.nome}</strong><br /><small>Chip {item.sessao} - {item.telefone}</small></td>
                  <td style={tableCell}><Badge tone={item.score >= 85 ? 'danger' : 'warning'}>{item.score}</Badge></td>
                  <td style={tableCell}>{item.motivo}<br /><small style={{ color: 'var(--text-muted)' }}>{item.lastMessage}</small></td>
                  <td style={tableCell}>{item.proximaAcao}</td>
                  <td style={tableCell}><button className="btn btn-primary" onClick={() => assumir(item)}><PauseCircle size={16} /> Assumir</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="grid-cards" style={{ marginBottom: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '1rem' }}>
          <h2><ShieldAlert size={20} /> Risco dos Chips</h2>
          {riscos.map(risco => (
            <div key={risco.sessao} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', padding: '0.8rem 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div><strong>Chip {risco.sessao}</strong><p>{risco.recomendacao}</p></div>
              <Badge tone={risco.nivel === 'alto' ? 'danger' : risco.nivel === 'medio' ? 'warning' : 'success'}>{risco.score}</Badge>
            </div>
          ))}
        </div>

        <div className="glass-panel" style={{ padding: '1rem' }}>
          <h2><FlaskConical size={20} /> A/B Testing</h2>
          {experimentos.length === 0 ? <p>Nenhum experimento registrado ainda.</p> : experimentos.map(test => (
            <div key={test.nome} style={{ marginBottom: '1rem' }}>
              <strong>{test.nome}</strong>
              {test.variants.map(v => (
                <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                  <span>{v.label} ({v.sent} envios)</span>
                  <span>{v.replyRate}% resp. / {v.winRate}% ganho</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
        <h2><Bot size={20} /> Simulador</h2>
        <textarea className="form-input" value={textoSimulador} onChange={e => setTextoSimulador(e.target.value)} style={{ minHeight: 90, marginBottom: '0.75rem' }} />
        <button className="btn btn-primary" onClick={simular}><PlayCircle size={16} /> Simular</button>
        {simulacao && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
            <div><h3>Análise</h3><pre style={{ whiteSpace: 'pre-wrap', color: 'var(--text-muted)' }}>{JSON.stringify(simulacao.analise, null, 2)}</pre></div>
            <div><h3>Resposta sugerida</h3><p>{simulacao.respostaSugerida}</p><h3>Risco</h3><p>{simulacao.risco?.risco}</p></div>
          </div>
        )}
      </div>

      <h2>Oportunidades Monitoradas</h2>
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: 'rgba(0,0,0,0.2)' }}><th style={tableCell}>Lead</th><th style={tableCell}>Score</th><th style={tableCell}>Status</th><th style={tableCell}>Última mensagem</th></tr></thead>
          <tbody>
            {oportunidades.slice(0, 25).map(item => (
              <tr key={`${item.sessao}:${item.jid}`}>
                <td style={tableCell}>{item.nome}<br /><small>Chip {item.sessao}</small></td>
                <td style={tableCell}><Badge tone={item.score >= 75 ? 'danger' : item.score >= 50 ? 'warning' : 'success'}>{item.score}</Badge></td>
                <td style={tableCell}>{item.paused ? 'Pausado' : item.precisaHumano ? 'Handoff' : 'IA ativa'}</td>
                <td style={tableCell}>{item.lastMessage}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
