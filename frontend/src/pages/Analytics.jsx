import React, { useState, useEffect } from 'react';
import { BarChart, Clock, Hash, TrendingUp, Users, Download, ArrowRight } from 'lucide-react';

export default function Analytics() {
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const carregarDados = () => {
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
    };

    carregarDados();
    const interval = setInterval(carregarDados, 10000);
    return () => clearInterval(interval);
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
  const ultimosEnvios = dados?.ultimosEnvios || [];
  const filas = dados?.filas || { duracaoMedia: '0min', totalPlanilhasMedidas: 0, planilhas: [] };
  const envios = dados?.envios || dados?.mensagens || { porTelefone: [], porNumeroDia: [], porNumeroHora: [] };

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
      <h2 style={{ marginBottom: '1rem', fontSize: '1.2rem', color: 'var(--primary)' }}>Tempo medio por fila / planilha</h2>
      <div className="grid-cards" style={{ marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
          <Clock size={44} color="#34d399" style={{ margin: '0 auto 1rem' }} />
          <h3>Media de duracao</h3>
          <p style={{ fontSize: '2.2rem', fontWeight: 'bold', color: '#fff', marginTop: '1rem' }}>{filas.duracaoMedia}</p>
          <p style={{ fontSize: '0.875rem' }}>{filas.totalPlanilhasMedidas} planilhas medidas</p>
        </div>

        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
          <BarChart size={44} color="#818cf8" style={{ margin: '0 auto 1rem' }} />
          <h3>Total de planilhas</h3>
          <p style={{ fontSize: '2.2rem', fontWeight: 'bold', color: '#fff', marginTop: '1rem' }}>{filas.planilhas.length}</p>
          <p style={{ fontSize: '0.875rem' }}>Concluidas, pendentes ou em execucao</p>
        </div>
      </div>

      <div className="glass-panel" style={{ overflow: 'hidden', marginBottom: '2rem' }}>
        {filas.planilhas.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-dim)' }}>
            <p>Nenhuma fila registrada ainda.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold' }}>Planilha</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold' }}>Status</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold' }}>Duracao</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold' }}>Enviados</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold' }}>Erros</th>
              </tr>
            </thead>
            <tbody>
              {filas.planilhas.slice(0, 20).map((fila) => (
                <tr key={`${fila.nome}-${fila.inicio}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '1rem' }}>{fila.nome}</td>
                  <td style={{ padding: '1rem', color: 'var(--text-dim)' }}>{fila.status}</td>
                  <td style={{ padding: '1rem' }}>{fila.duracao}</td>
                  <td style={{ padding: '1rem' }}>{fila.contatos_enviados}/{fila.contatos_totais}</td>
                  <td style={{ padding: '1rem' }}>{fila.erros}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <h2 style={{ marginBottom: '1rem', fontSize: '1.2rem', color: 'var(--primary)' }}>Mensagens enviadas por numero</h2>
      <div className="grid-cards" style={{ marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <Hash size={18} color="#34d399" />
            <h3 style={{ margin: 0 }}>Por dia</h3>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.2)' }}>
                <th style={{ padding: '0.8rem', textAlign: 'left' }}>Dia</th>
                <th style={{ padding: '0.8rem', textAlign: 'left' }}>Numero</th>
                <th style={{ padding: '0.8rem', textAlign: 'left' }}>Enviadas</th>
              </tr>
            </thead>
            <tbody>
              {envios.porNumeroDia.slice(0, 30).map((item) => (
                <tr key={`${item.numero}-${item.dia}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '0.8rem', color: 'var(--text-dim)' }}>{new Date(`${item.dia}T00:00:00`).toLocaleDateString()}</td>
                  <td style={{ padding: '0.8rem' }}>{item.numero}</td>
                  <td style={{ padding: '0.8rem', fontWeight: 'bold' }}>{item.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <Clock size={18} color="#818cf8" />
            <h3 style={{ margin: 0 }}>Por hora</h3>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.2)' }}>
                <th style={{ padding: '0.8rem', textAlign: 'left' }}>Hora</th>
                <th style={{ padding: '0.8rem', textAlign: 'left' }}>Numero</th>
                <th style={{ padding: '0.8rem', textAlign: 'left' }}>Enviadas</th>
              </tr>
            </thead>
            <tbody>
              {envios.porNumeroHora.slice(0, 30).map((item) => (
                <tr key={`${item.numero}-${item.hora}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '0.8rem', color: 'var(--text-dim)' }}>{item.hora}</td>
                  <td style={{ padding: '0.8rem' }}>{item.numero}</td>
                  <td style={{ padding: '0.8rem', fontWeight: 'bold' }}>{item.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <h2 style={{ marginBottom: '1rem', fontSize: '1.2rem', color: 'var(--primary)' }}>Mensagens enviadas por telefone do lead</h2>
      <div className="glass-panel" style={{ overflow: 'hidden', marginBottom: '2rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold' }}>Telefone</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold' }}>Nome</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold' }}>Empresa</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold' }}>Msgs enviadas</th>
            </tr>
          </thead>
          <tbody>
            {envios.porTelefone.slice(0, 50).map((item) => (
              <tr key={item.telefone} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '1rem' }}>{item.telefone}</td>
                <td style={{ padding: '1rem' }}>{item.nome}</td>
                <td style={{ padding: '1rem', color: 'var(--text-dim)' }}>{item.empresa}</td>
                <td style={{ padding: '1rem', fontWeight: 'bold' }}>{item.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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

      <h2 style={{ fontSize: '1.2rem', color: 'var(--primary)', margin: '2rem 0 1rem' }}>Ultimos Envios</h2>
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        {ultimosEnvios.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-dim)' }}>
            <p>Nenhum envio registrado ainda.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold' }}>Data</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold' }}>Telefone</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold' }}>Nome</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold' }}>Empresa</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold' }}>Chip</th>
              </tr>
            </thead>
            <tbody>
              {ultimosEnvios.slice(0, 50).map((envio, idx) => (
                <tr key={`${envio.telefone}-${envio.data}-${idx}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '1rem', color: 'var(--text-dim)' }}>{new Date(envio.data).toLocaleString()}</td>
                  <td style={{ padding: '1rem' }}>{envio.telefone}</td>
                  <td style={{ padding: '1rem' }}>{envio.nome}</td>
                  <td style={{ padding: '1rem', color: 'var(--text-dim)' }}>{envio.empresa}</td>
                  <td style={{ padding: '1rem' }}>Sessao {envio.sessao}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
