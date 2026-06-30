import React, { useState, useEffect } from 'react';
import { BarChart, PieChart, TrendingUp, Users, Download, ArrowRight } from 'lucide-react';

export default function Analytics() {
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics/dados')
      .then(r => r.json())
      .then(d => {
        setDados(d);
        setLoading(false);
      })
      .catch(e => {
        console.error(e);
        setLoading(false);
      });
  }, []);

  const handleExportCSV = () => {
    if (!dados || !dados.leadsQuentes) return;
    
    // Converter leads para CSV
    const cabecalho = "Telefone,Nome,Empresa,Data_Envio,Total_Mensagens,Ultima_Mensagem\n";
    const linhas = dados.leadsQuentes.map(l => {
      // Limpar campos que podem quebrar o CSV
      const msg = (l.ultima_mensagem || '').replace(/"/g, '""').replace(/\n/g, ' ');
      return `${l.telefone},"${l.nome}","${l.empresa}",${l.data},${l.total_mensagens},"${msg}"`;
    }).join('\n');

    const csvData = new Blob(["\uFEFF" + cabecalho + linhas], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(csvData);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `leads_quentes_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return <div style={{ padding: '2rem' }}>Carregando dados do funil...</div>;
  }

  const funil = dados?.funil || { prospectados: 0, responderam: 0, taxaConversao: 0 };
  const leads = dados?.leadsQuentes || [];

  return (
    <div style={{ paddingBottom: '3rem' }}>
      <h1>Analytics & Histórico</h1>
      <p style={{ marginBottom: '2rem' }}>Métricas de prospecção e conversão do Agente de Vendas.</p>

      {/* Funil Visual */}
      <h2 style={{ marginBottom: '1rem', fontSize: '1.2rem', color: 'var(--primary)' }}>Funil de Vendas (Geral)</h2>
      
      <div className="grid-cards" style={{ marginBottom: '3rem' }}>
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', position: 'relative' }}>
          <Users size={48} color="#34d399" style={{ margin: '0 auto 1rem' }} />
          <h3>1. Contatos Prospectados</h3>
          <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#fff', marginTop: '1rem' }}>{funil.prospectados}</p>
          <p style={{ fontSize: '0.875rem' }}>Mensagens iniciais enviadas</p>
          
          <div style={{ position: 'absolute', right: '-24px', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}>
            <ArrowRight size={32} color="var(--primary)" />
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
          <TrendingUp size={48} color="#818cf8" style={{ margin: '0 auto 1rem' }} />
          <h3>2. Respostas Recebidas</h3>
          <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#fff', marginTop: '1rem' }}>{funil.responderam}</p>
          <p style={{ fontSize: '0.875rem', color: '#34d399', fontWeight: 'bold' }}>Taxa de conversão: {funil.taxaConversao}%</p>
        </div>
      </div>

      {/* CRM Básico - Leads Quentes */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.2rem', color: 'var(--primary)', margin: 0 }}>Oportunidades / Leads Quentes</h2>
        <button className="btn btn-primary" onClick={handleExportCSV} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Download size={18} /> Exportar CSV
        </button>
      </div>
      
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        {leads.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)' }}>
            <p>Nenhum lead respondeu ainda.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold' }}>Data</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold' }}>Telefone</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold' }}>Nome</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold' }}>Empresa</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold' }}>Msgs</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold' }}>Última Mensagem</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '1rem', color: 'var(--text-dim)' }}>{new Date(lead.data).toLocaleDateString()}</td>
                  <td style={{ padding: '1rem' }}>{lead.telefone}</td>
                  <td style={{ padding: '1rem' }}>{lead.nome}</td>
                  <td style={{ padding: '1rem', color: 'var(--text-dim)' }}>{lead.empresa}</td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <span style={{ background: 'rgba(129, 140, 248, 0.2)', color: '#818cf8', padding: '2px 8px', borderRadius: '12px', fontSize: '0.85rem' }}>
                      {lead.total_mensagens}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.9rem', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {lead.ultima_mensagem}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
