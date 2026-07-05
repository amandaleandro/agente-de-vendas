import React, { useEffect, useState } from 'react';
import { RefreshCw, DollarSign, Target, TrendingDown, TrendingUp } from 'lucide-react';

const ESTAGIOS = [
  { key: 'novo', label: 'Novo', cor: '#818cf8' },
  { key: 'respondeu', label: 'Respondeu', cor: '#38bdf8' },
  { key: 'qualificado', label: 'Qualificado', cor: '#f59e0b' },
  { key: 'proposta', label: 'Proposta', cor: '#a855f7' },
  { key: 'ganho', label: 'Ganho', cor: '#34d399' },
  { key: 'perdido', label: 'Perdido', cor: '#ef4444' }
];

const cardStyle = { padding: '1rem', minHeight: 110 };

function moeda(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function CRMFunnel() {
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendentePerda, setPendentePerda] = useState(null); // { sessao, jid, motivo }

  const carregar = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/crm/funil');
      setDados(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
    const timer = setInterval(carregar, 15000);
    return () => clearInterval(timer);
  }, []);

  const moverEstagio = async (lead, estagio, motivoPerda = null) => {
    await fetch('/api/crm/funil/estagio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessao: lead.sessao, jid: lead.jid, estagio, motivoPerda })
    });
    carregar();
  };

  const selecionarEstagio = (lead, estagio) => {
    if (estagio === 'perdido') {
      const motivos = dados?.motivosPerda || [];
      setPendentePerda({ sessao: lead.sessao, jid: lead.jid, motivo: motivos[0]?.key || 'nao_informado' });
      return;
    }
    moverEstagio(lead, estagio);
  };

  const confirmarPerda = () => {
    if (!pendentePerda) return;
    moverEstagio(pendentePerda, 'perdido', pendentePerda.motivo);
    setPendentePerda(null);
  };

  const editarValor = async (lead) => {
    const valor = window.prompt('Valor estimado (R$):', lead.valorEstimado || 0);
    if (valor === null) return;
    await fetch('/api/crm/funil/valor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessao: lead.sessao, jid: lead.jid, valor })
    });
    carregar();
  };

  const editarOrigem = async (lead) => {
    const origem = window.prompt('Origem da campanha:', lead.origem || '');
    if (origem === null) return;
    await fetch('/api/crm/funil/origem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessao: lead.sessao, jid: lead.jid, origem })
    });
    carregar();
  };

  if (loading && !dados) return <div style={{ padding: '2rem' }}>Carregando funil de vendas...</div>;

  const resumo = dados?.resumo || {};
  const estagios = dados?.estagios || {};
  const motivosPerda = dados?.motivosPerda || [];

  return (
    <div style={{ paddingBottom: '3rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h1>Funil de Vendas</h1>
          <p>Estágio, valor estimado, origem e motivo de perda de cada lead em prospecção.</p>
        </div>
        <button className="btn btn-primary" onClick={carregar}><RefreshCw size={18} /> Atualizar</button>
      </div>

      <div className="grid-cards" style={{ marginBottom: '1.5rem' }}>
        <div className="glass-panel" style={cardStyle}><Target color="#818cf8" /><h3>Total de leads</h3><strong style={{ fontSize: '2rem' }}>{resumo.total || 0}</strong></div>
        <div className="glass-panel" style={cardStyle}><DollarSign color="#f59e0b" /><h3>Em aberto</h3><strong style={{ fontSize: '1.5rem' }}>{moeda(resumo.valorTotalAberto)}</strong></div>
        <div className="glass-panel" style={cardStyle}><TrendingUp color="#34d399" /><h3>Ganho</h3><strong style={{ fontSize: '1.5rem' }}>{moeda(resumo.valorGanho)}</strong></div>
        <div className="glass-panel" style={cardStyle}><TrendingDown color="#ef4444" /><h3>Taxa de conversão</h3><strong style={{ fontSize: '2rem' }}>{resumo.taxaConversao || 0}%</strong></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${ESTAGIOS.length}, minmax(230px, 1fr))`, gap: '1rem', overflowX: 'auto' }}>
        {ESTAGIOS.map(estagio => {
          const leads = estagios[estagio.key] || [];
          return (
            <div key={estagio.key} className="glass-panel" style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `2px solid ${estagio.cor}`, paddingBottom: '0.4rem' }}>
                <strong style={{ color: estagio.cor }}>{estagio.label}</strong>
                <span className="badge badge-success" style={{ background: 'rgba(255,255,255,0.08)' }}>{leads.length}</span>
              </div>

              {leads.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Vazio</p>}

              {leads.map(lead => (
                <div key={`${lead.sessao}:${lead.jid}`} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '0.6rem' }}>
                  <strong style={{ fontSize: '0.9rem' }}>{lead.nome}</strong>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Chip {lead.sessao} · score {lead.score}</div>
                  <div style={{ fontSize: '0.78rem', marginBottom: '0.3rem' }}>{lead.proximaAcao}</div>
                  <div style={{ fontSize: '0.78rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>
                    {lead.valorEstimado > 0 ? moeda(lead.valorEstimado) : 'sem valor'} · {lead.origem}
                  </div>
                  {lead.estagio === 'perdido' && lead.motivoPerda && (
                    <div style={{ fontSize: '0.75rem', color: '#ef4444', marginBottom: '0.3rem' }}>
                      Motivo: {motivosPerda.find(m => m.key === lead.motivoPerda)?.label || lead.motivoPerda}
                    </div>
                  )}

                  {pendentePerda && pendentePerda.sessao === lead.sessao && pendentePerda.jid === lead.jid ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginTop: '0.4rem' }}>
                      <select
                        value={pendentePerda.motivo}
                        onChange={e => setPendentePerda({ ...pendentePerda, motivo: e.target.value })}
                        className="form-input"
                        style={{ fontSize: '0.75rem', padding: '0.2rem' }}
                      >
                        {motivosPerda.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
                      </select>
                      <div style={{ display: 'flex', gap: '0.3rem' }}>
                        <button className="btn btn-primary" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }} onClick={confirmarPerda}>Confirmar perda</button>
                        <button className="btn btn-secondary" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }} onClick={() => setPendentePerda(null)}>Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.4rem' }}>
                      <select
                        value={lead.estagio}
                        onChange={e => selecionarEstagio(lead, e.target.value)}
                        className="form-input"
                        style={{ fontSize: '0.75rem', padding: '0.2rem' }}
                      >
                        {ESTAGIOS.map(op => <option key={op.key} value={op.key}>{op.label}</option>)}
                      </select>
                      <button className="btn btn-secondary" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }} onClick={() => editarValor(lead)}>Valor</button>
                      <button className="btn btn-secondary" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }} onClick={() => editarOrigem(lead)}>Origem</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
