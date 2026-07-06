import React, { useState, useEffect } from 'react';
import { FileText, Download, Clock, CheckCircle, TrendingUp, Loader } from 'lucide-react';
import './Relatorios.css';

export default function Relatorios() {
  const [status, setStatus] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gerando, setGerando] = useState(false);

  useEffect(() => {
    carregarDados();
    const interval = setInterval(carregarDados, 30000);
    return () => clearInterval(interval);
  }, []);

  const carregarDados = async () => {
    try {
      const [statusRes, historicoRes] = await Promise.all([
        fetch('/api/reports/status'),
        fetch('/api/reports/historico')
      ]);

      if (statusRes.ok) setStatus(await statusRes.json());
      if (historicoRes.ok) {
        const data = await historicoRes.json();
        setHistorico(data.relatorios || []);
      }
      setLoading(false);
    } catch (e) {
      console.error('Erro ao carregar relatórios:', e);
      setLoading(false);
    }
  };

  const gerarRelatorioAgora = async () => {
    setGerando(true);
    try {
      const res = await fetch('/api/reports/gerar', { method: 'POST' });
      const data = await res.json();
      if (data.sucesso) {
        alert('✅ Relatório gerado com sucesso!');
        carregarDados();
      } else {
        alert('❌ Erro ao gerar relatório: ' + data.erro);
      }
    } catch (e) {
      alert('❌ Erro: ' + e.message);
    } finally {
      setGerando(false);
    }
  };

  if (loading) {
    return <div className="relatorios-loading">⏳ Carregando relatórios...</div>;
  }

  return (
    <div className="relatorios-page">
      <div className="relatorios-header">
        <h1>📄 Relatórios PDF</h1>
        <p>Relatório periódico com as principais métricas do dashboard, funil e IA</p>
      </div>

      <div className="relatorios-status-grid">
        <div className="status-card">
          <div className="status-icon active">
            <CheckCircle size={32} />
          </div>
          <div className="status-content">
            <h3>Agendamento Automático</h3>
            <p className="status-value">{status?.ativo ? '✅ Ativo' : '⚠️ Inativo'}</p>
            <p className="status-meta">
              {status?.proximo_relatorio
                ? `Próximo: ${new Date(status.proximo_relatorio).toLocaleString('pt-BR')}`
                : 'Sem agendamento'}
            </p>
          </div>
        </div>

        <div className="status-card">
          <div className="status-icon data">
            <Clock size={32} />
          </div>
          <div className="status-content">
            <h3>Último Relatório</h3>
            <p className="status-value">
              {historico[0]
                ? new Date(historico[0].gerado_em).toLocaleDateString('pt-BR', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : 'Nenhum'}
            </p>
            <p className="status-meta">{historico[0]?.tamanho_kb ? `${historico[0].tamanho_kb}KB` : '-'}</p>
          </div>
        </div>

        <div className="status-card">
          <div className="status-icon storage">
            <TrendingUp size={32} />
          </div>
          <div className="status-content">
            <h3>Taxa de Sucesso (último)</h3>
            <p className="status-value">
              {historico[0] ? `${historico[0].taxa_sucesso}%` : '-'}
            </p>
            <p className="status-meta">
              {historico[0] ? `${historico[0].total_conversas} conversas` : 'Gere um relatório'}
            </p>
          </div>
        </div>
      </div>

      <div className="relatorios-actions">
        <button className="btn btn-primary" onClick={gerarRelatorioAgora} disabled={gerando}>
          {gerando ? (
            <>
              <Loader size={18} className="spinner" /> Gerando...
            </>
          ) : (
            <>
              <FileText size={18} /> Gerar Relatório Agora
            </>
          )}
        </button>
      </div>

      <div className="relatorios-history">
        <h2>📋 Histórico de Relatórios</h2>

        {historico.length === 0 ? (
          <div className="empty-state">
            <p>Nenhum relatório gerado ainda. Clique em "Gerar Relatório Agora" para criar o primeiro.</p>
          </div>
        ) : (
          <div className="history-table-wrapper">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Data/Hora</th>
                  <th>Taxa de Sucesso</th>
                  <th>Conversas</th>
                  <th>Tamanho</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {historico.map((relatorio, idx) => (
                  <tr key={idx}>
                    <td>
                      <span className="date">
                        {new Date(relatorio.gerado_em).toLocaleDateString('pt-BR')}
                      </span>
                      <span className="time">
                        {new Date(relatorio.gerado_em).toLocaleTimeString('pt-BR')}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-info">{relatorio.taxa_sucesso}%</span>
                    </td>
                    <td>
                      <span className="badge badge-primary">{relatorio.total_conversas}</span>
                    </td>
                    <td>
                      <span className="badge badge-size">{relatorio.tamanho_kb}KB</span>
                    </td>
                    <td>
                      <a
                        className="btn-action download"
                        href={`/api/reports/download/${encodeURIComponent(relatorio.nome)}`}
                        title="Baixar PDF"
                      >
                        <Download size={16} />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="relatorios-info">
        <h3>ℹ️ Como Funciona</h3>
        <ul>
          <li>✅ <strong>Automático:</strong> gerado toda segunda-feira às 8h (configurável via <code>REPORT_SCHEDULE_CRON</code>)</li>
          <li>✅ <strong>Conteúdo:</strong> taxa de sucesso, funil de prospecção, funil de vendas (CRM), top intenções e leads quentes</li>
          <li>✅ <strong>Notificação:</strong> um aviso é enviado ao Slack a cada relatório gerado</li>
          <li>✅ <strong>Manual:</strong> use "Gerar Relatório Agora" para criar um relatório sob demanda</li>
        </ul>
      </div>
    </div>
  );
}
