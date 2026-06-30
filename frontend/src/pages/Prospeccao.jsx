import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Download,
  History,
  Pause,
  Play,
  Smartphone,
  Trash2,
  Upload,
  Users,
  Zap
} from 'lucide-react';

export default function Prospeccao() {
  const [file, setFile] = useState(null);
  const [contatos, setContatos] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [erros, setErros] = useState([]);
  const [status, setStatus] = useState(null);
  const [loadingContatos, setLoadingContatos] = useState(true);
  const [activeTab, setActiveTab] = useState('fila');

  const progressoAtual = useMemo(() => status?.progresso_atual || {}, [status]);
  const emAndamento = Boolean(progressoAtual.emAndamento);

  const resumo = useMemo(() => {
    const total = Number(progressoAtual.total || 0);
    const enviados = Number(progressoAtual.enviados || 0);
    const erros = Number(progressoAtual.erros || 0);
    const processados = enviados + erros;
    const percentual = total > 0 ? Math.min(100, Math.round((processados / total) * 100)) : 0;
    const intervaloSegundos = progressoAtual.intervaloMs ? Math.round(progressoAtual.intervaloMs / 1000) : null;

    return {
      total,
      enviados,
      erros,
      processados,
      percentual,
      intervaloSegundos,
      chips: Number(progressoAtual.chipsConectados || 0),
      pulados: Number(progressoAtual.pulados || 0)
    };
  }, [progressoAtual]);

  const fetchData = async (background = false) => {
    try {
      if (!background) setLoadingContatos(true);

      const [resLista, resHist, resErros, resStatus] = await Promise.all([
        fetch('/api/prospeccao/lista'),
        fetch('/api/prospeccao/historico'),
        fetch('/api/prospeccao/erros'),
        fetch('/api/prospeccao/status')
      ]);

      if (resLista.ok) {
        const data = await resLista.json();
        if (data.success && data.contatos) setContatos(data.contatos);
      }

      if (resHist.ok) {
        const dataHist = await resHist.json();
        if (dataHist.success && dataHist.historico) setHistorico(dataHist.historico);
      }

      if (resErros.ok) {
        const dataErros = await resErros.json();
        if (dataErros.success && dataErros.erros) setErros(dataErros.erros);
      }

      if (resStatus.ok) {
        setStatus(await resStatus.json());
      }
    } catch (e) {
      console.error('Erro ao buscar dados:', e);
    } finally {
      if (!background) setLoadingContatos(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), emAndamento ? 2000 : 5000);
    return () => clearInterval(interval);
  }, [emAndamento]);

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
        alert(data.message || 'Upload concluido');
        fetchData();
        setFile(null);
        document.querySelector('input[type="file"]').value = '';
      } else {
        alert('Erro no servidor: ' + (data.error || 'Erro desconhecido'));
      }
    } catch {
      alert('Erro ao enviar arquivo.');
    }
  };

  const acao = async (endpoint) => {
    try {
      const res = await fetch(`/api/prospeccao/${endpoint}`, { method: 'POST' });
      const data = await res.json();
      alert(data.message || 'Comando enviado');
      fetchData();
    } catch {
      alert('Erro ao executar comando.');
    }
  };

  const obterNumero = (contato) =>
    contato.numero ||
    contato.telefone ||
    contato['telefone/whatsapp'] ||
    contato.whatsapp ||
    contato.celular ||
    Object.values(contato).find((v) => typeof v === 'string' && v.replace(/\D/g, '').length >= 10) ||
    contato[0];

  const obterNome = (contato) =>
    contato.nome ||
    contato.empresa ||
    contato['empresa/nome'] ||
    Object.values(contato).find((v) => typeof v === 'string' && Number.isNaN(Number(v.replace(/\D/g, '')))) ||
    contato[1] ||
    '---';

  return (
    <div>
      <h1>Prospeccao e Lideranca de IA</h1>
      <p style={{ marginBottom: '2rem' }}>Gerencie suas campanhas de envio e aquecimento de leads.</p>

      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 320px' }}>
            <div
              className={emAndamento ? 'badge badge-success' : progressoAtual.ativo ? 'badge badge-warning' : 'badge badge-error'}
              style={{ marginBottom: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Activity size={14} />
              {emAndamento ? 'Prospecção rodando' : progressoAtual.ativo ? 'Pronta para rodar' : 'Pausada'}
            </div>
            <h2 style={{ marginBottom: '0.35rem' }}>{progressoAtual.planilha || status?.planilha_atual || 'Fila de prospeccao'}</h2>
            <p>{progressoAtual.mensagem || 'Aguardando uma campanha ser iniciada.'}</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(112px, 1fr))', gap: '0.75rem', flex: '1 1 360px' }}>
            <div style={metricStyle}>
              <div style={metricLabelStyle}>
                <Smartphone size={16} /> Chips
              </div>
              <strong style={metricValueStyle}>{resumo.chips}</strong>
            </div>
            <div style={metricStyle}>
              <div style={metricLabelStyle}>
                <Zap size={16} /> Ritmo
              </div>
              <strong style={metricValueStyle}>{resumo.intervaloSegundos ? `${resumo.intervaloSegundos}s` : '--'}</strong>
            </div>
            <div style={metricStyle}>
              <div style={metricLabelStyle}>Enviados</div>
              <strong style={metricValueStyle}>{resumo.enviados}/{resumo.total || contatos.length}</strong>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '1.25rem', height: '10px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${resumo.percentual}%`, background: emAndamento ? 'var(--success)' : 'var(--primary)', transition: 'width 0.3s ease' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.6rem', color: 'var(--text-muted)', fontSize: '0.85rem', gap: '1rem', flexWrap: 'wrap' }}>
          <span>{resumo.percentual}% processado</span>
          <span>{resumo.erros || erros.length} erros - {resumo.pulados} ja estavam no historico</span>
        </div>
      </div>

      <div className="grid-cards" style={{ marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', gridColumn: 'span 2' }}>
          <h2>Carregar Base de Leads (CSV)</h2>
          <p style={{ marginBottom: '1rem' }}>O arquivo deve conter as colunas "numero" e "nome". A IA pula automaticamente contatos ja prospectados.</p>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <input type="file" accept=".csv" onChange={handleFileChange} className="form-input" style={{ flex: '1 1 260px' }} />
            <button className="btn btn-primary" onClick={uploadCSV}>
              <Upload size={18} /> Processar
            </button>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h2>Controle da Fila</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <button className="btn btn-success" onClick={() => acao('iniciar')} style={{ width: '100%', justifyContent: 'center' }}>
              <Play size={18} /> Iniciar Prospeccao
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
            style={{ flex: 1, padding: '1.5rem', borderRadius: 0, background: activeTab === 'fila' ? 'rgba(255,255,255,0.05)' : 'transparent', color: activeTab === 'fila' ? 'var(--primary)' : 'var(--text-muted)', borderBottom: activeTab === 'fila' ? '2px solid var(--primary)' : 'none' }}
          >
            <Users size={20} /> Contatos na Fila ({contatos.length})
          </button>
          <button
            className="btn"
            onClick={() => setActiveTab('historico')}
            style={{ flex: 1, padding: '1.5rem', borderRadius: 0, background: activeTab === 'historico' ? 'rgba(255,255,255,0.05)' : 'transparent', color: activeTab === 'historico' ? 'var(--success)' : 'var(--text-muted)', borderBottom: activeTab === 'historico' ? '2px solid var(--success)' : 'none' }}
          >
            <History size={20} /> Ja Prospectados ({historico.length})
          </button>
          <button
            className="btn"
            onClick={() => setActiveTab('erros')}
            style={{ flex: 1, padding: '1.5rem', borderRadius: 0, background: activeTab === 'erros' ? 'rgba(255,255,255,0.05)' : 'transparent', color: activeTab === 'erros' ? 'var(--error)' : 'var(--text-muted)', borderBottom: activeTab === 'erros' ? '2px solid var(--error)' : 'none' }}
          >
            <AlertTriangle size={20} /> Erros ({erros.length})
          </button>
        </div>

        <div style={{ padding: '1.5rem' }}>
          {loadingContatos ? (
            <p style={{ textAlign: 'center' }}>Carregando dados...</p>
          ) : activeTab === 'fila' ? (
            contatos.length === 0 ? (
              <div style={emptyStateStyle}>
                <p style={{ color: 'var(--text-muted)' }}>Nenhum contato na fila atual. Faca o upload de uma planilha CSV acima.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={tableStyle}>
                  <thead>
                    <tr style={tableRowBorderStyle}>
                      <th style={tableHeadStyle}>#</th>
                      <th style={tableHeadStyle}>Numero</th>
                      <th style={tableHeadStyle}>Nome</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contatos.slice(0, 50).map((contato, index) => (
                      <tr key={index} style={tableRowLightStyle}>
                        <td style={tableCellStyle}>{index + 1}</td>
                        <td style={tableCellStyle}>{obterNumero(contato)}</td>
                        <td style={tableCellStyle}>{obterNome(contato)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {contatos.length > 50 && (
                  <p style={{ textAlign: 'center', marginTop: '1rem', color: 'var(--text-muted)' }}>
                    Mostrando os primeiros 50 de {contatos.length} contatos.
                  </p>
                )}
              </div>
            )
          ) : activeTab === 'historico' ? (
            historico.length === 0 ? (
              <div style={emptyStateStyle}>
                <p style={{ color: 'var(--text-muted)' }}>Voce ainda nao prospectou nenhum contato. Eles aparecerao aqui apos o envio.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <div style={{ padding: '1rem', display: 'flex', justifyContent: 'flex-end', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <button className="btn btn-primary" onClick={() => window.open('http://localhost:3099/api/prospeccao/exportar-historico', '_blank')}>
                    <Download size={18} /> Exportar para CSV
                  </button>
                </div>
                <table style={tableStyle}>
                  <thead>
                    <tr style={tableRowBorderStyle}>
                      <th style={tableHeadStyle}>Status</th>
                      <th style={tableHeadStyle}>Numero</th>
                      <th style={tableHeadStyle}>Contato/Empresa</th>
                      <th style={tableHeadStyle}>Data do Envio</th>
                      <th style={tableHeadStyle}>Chip Usado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historico.slice(0, 50).map((hist, index) => (
                      <tr key={index} style={tableRowLightStyle}>
                        <td style={{ ...tableCellStyle, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <CheckCircle size={16} /> Enviado
                        </td>
                        <td style={tableCellStyle}>{hist.telefone}</td>
                        <td style={tableCellStyle}>
                          {hist.nome || '-'}
                          {hist.empresa && <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{hist.empresa}</span>}
                        </td>
                        <td style={tableCellStyle}>{new Date(hist.enviado_em).toLocaleString()}</td>
                        <td style={tableCellStyle}>Sessao {hist.sessao || 1}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {historico.length > 50 && (
                  <p style={{ textAlign: 'center', marginTop: '1rem', color: 'var(--text-muted)' }}>
                    Mostrando os 50 envios mais recentes de {historico.length} no total.
                  </p>
                )}
              </div>
            )
          ) : erros.length === 0 ? (
            <div style={emptyStateStyle}>
              <p style={{ color: 'var(--text-muted)' }}>Nenhum erro registrado ate agora.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr style={tableRowBorderStyle}>
                    <th style={tableHeadStyle}>Status</th>
                    <th style={tableHeadStyle}>Numero</th>
                    <th style={tableHeadStyle}>Contato/Empresa</th>
                    <th style={tableHeadStyle}>Erro</th>
                    <th style={tableHeadStyle}>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {erros.slice(0, 50).map((erro, index) => (
                    <tr key={index} style={tableRowLightStyle}>
                      <td style={{ ...tableCellStyle, color: 'var(--error)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <AlertTriangle size={16} /> Erro
                      </td>
                      <td style={tableCellStyle}>{erro.telefone}</td>
                      <td style={tableCellStyle}>
                        {erro.nome || '-'}
                        {erro.empresa && <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{erro.empresa}</span>}
                      </td>
                      <td style={tableCellStyle}>{erro.erro || 'Erro desconhecido'}</td>
                      <td style={tableCellStyle}>{erro.erro_em ? new Date(erro.erro_em).toLocaleString() : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {erros.length > 50 && (
                <p style={{ textAlign: 'center', marginTop: '1rem', color: 'var(--text-muted)' }}>
                  Mostrando os 50 erros mais recentes de {erros.length} no total.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const metricStyle = {
  padding: '1rem',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '8px',
  background: 'rgba(15,23,42,0.35)'
};

const metricLabelStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  color: 'var(--text-muted)',
  fontSize: '0.85rem'
};

const metricValueStyle = {
  display: 'block',
  fontSize: '1.6rem',
  marginTop: '0.25rem'
};

const emptyStateStyle = {
  textAlign: 'center',
  padding: '2rem',
  background: 'rgba(255,255,255,0.02)',
  borderRadius: '8px'
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  textAlign: 'left'
};

const tableHeadStyle = {
  padding: '1rem',
  color: 'var(--text-muted)'
};

const tableCellStyle = {
  padding: '1rem'
};

const tableRowBorderStyle = {
  borderBottom: '1px solid rgba(255,255,255,0.1)'
};

const tableRowLightStyle = {
  borderBottom: '1px solid rgba(255,255,255,0.05)'
};
