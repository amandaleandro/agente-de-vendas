import React, { useState, useEffect } from 'react';
import { HardDrive, DownloadCloud, RotateCcw, Trash2, Clock, AlertTriangle, CheckCircle, Loader } from 'lucide-react';
import './BackupManager.css';

export default function BackupManager() {
  const [status, setStatus] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [espaco, setEspaco] = useState(null);
  const [loading, setLoading] = useState(true);
  const [executandoBackup, setExecutandoBackup] = useState(false);
  const [restaurando, setRestaurando] = useState(null);

  useEffect(() => {
    carregarDados();
    const interval = setInterval(carregarDados, 30000); // Atualizar a cada 30s
    return () => clearInterval(interval);
  }, []);

  const carregarDados = async () => {
    try {
      const [statusRes, historicoRes, espacoRes] = await Promise.all([
        fetch('/api/backup/status'),
        fetch('/api/backup/historico'),
        fetch('/api/backup/espaco')
      ]);

      if (statusRes.ok) setStatus(await statusRes.json());
      if (historicoRes.ok) {
        const data = await historicoRes.json();
        setHistorico(data.backups || []);
      }
      if (espacoRes.ok) setEspaco(await espacoRes.json());
      setLoading(false);
    } catch (e) {
      console.error('Erro ao carregar dados:', e);
      setLoading(false);
    }
  };

  const executarBackupAgora = async () => {
    setExecutandoBackup(true);
    try {
      const res = await fetch('/api/backup/executar', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        alert('✅ Backup executado com sucesso!');
        carregarDados();
      } else {
        alert('❌ Erro ao executar backup');
      }
    } catch (e) {
      alert('❌ Erro: ' + e.message);
    } finally {
      setExecutandoBackup(false);
    }
  };

  const restaurarBackup = async (nomeBackup) => {
    if (!window.confirm('⚠️ Deseja restaurar este backup? Isso pode levar alguns minutos.')) {
      return;
    }

    setRestaurando(nomeBackup);
    try {
      const res = await fetch(`/api/backup/restaurar/${nomeBackup}`, { method: 'POST' });
      const data = await res.json();

      if (data.sucesso) {
        alert('✅ Backup restaurado! Registros disponíveis: ' + data.registros);
      } else {
        alert('❌ Erro ao restaurar: ' + data.erro);
      }
    } catch (e) {
      alert('❌ Erro: ' + e.message);
    } finally {
      setRestaurando(null);
    }
  };

  if (loading) {
    return <div className="backup-loading">⏳ Carregando status de backups...</div>;
  }

  return (
    <div className="backup-manager">
      <div className="backup-header">
        <h1>🛡️ Gerenciador de Backups</h1>
        <p>Sistema automático de proteção de dados com 30 dias de histórico</p>
      </div>

      {/* Status Cards */}
      <div className="backup-status-grid">
        <div className="status-card">
          <div className="status-icon active">
            <CheckCircle size={32} />
          </div>
          <div className="status-content">
            <h3>Status Automático</h3>
            <p className="status-value">
              {status?.em_execucao ? '⏳ Em execução...' : '✅ Ativo'}
            </p>
            <p className="status-meta">Próximo backup às 2:00 AM</p>
          </div>
        </div>

        <div className="status-card">
          <div className="status-icon storage">
            <HardDrive size={32} />
          </div>
          <div className="status-content">
            <h3>Espaço em Disco</h3>
            <p className="status-value">{espaco?.total_mb} MB</p>
            <p className="status-meta">{espaco?.arquivos || 0} backups salvos</p>
          </div>
        </div>

        <div className="status-card">
          <div className="status-icon data">
            <Clock size={32} />
          </div>
          <div className="status-content">
            <h3>Último Backup</h3>
            <p className="status-value">
              {historico[0]
                ? new Date(historico[0].timestamp).toLocaleDateString('pt-BR', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : 'Nenhum'}
            </p>
            <p className="status-meta">{historico[0]?.tamanho_kb}KB</p>
          </div>
        </div>

        <div className="status-card">
          <div className="status-icon warning">
            <AlertTriangle size={32} />
          </div>
          <div className="status-content">
            <h3>Retenção</h3>
            <p className="status-value">30 dias</p>
            <p className="status-meta">Backups automáticos mantidos</p>
          </div>
        </div>
      </div>

      {/* Ações Principais */}
      <div className="backup-actions">
        <button
          className="btn btn-primary"
          onClick={executarBackupAgora}
          disabled={executandoBackup}
        >
          {executandoBackup ? (
            <>
              <Loader size={18} className="spinner" /> Executando...
            </>
          ) : (
            <>
              <DownloadCloud size={18} /> Backup Manual Agora
            </>
          )}
        </button>

        <button className="btn btn-secondary" disabled>
          <RotateCcw size={18} /> Download Backup (em desenvolvimento)
        </button>
      </div>

      {/* Histórico de Backups */}
      <div className="backup-history">
        <h2>📋 Histórico de Backups (últimos 30)</h2>

        {historico.length === 0 ? (
          <div className="empty-state">
            <p>Nenhum backup realizado ainda. Clique em "Backup Manual Agora" para criar um.</p>
          </div>
        ) : (
          <div className="history-table-wrapper">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Data/Hora</th>
                  <th>Tamanho</th>
                  <th>Registros</th>
                  <th>Tabelas</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {historico.map((backup, idx) => (
                  <tr key={idx}>
                    <td>
                      <span className="date">
                        {new Date(backup.timestamp).toLocaleDateString('pt-BR')}
                      </span>
                      <span className="time">
                        {new Date(backup.timestamp).toLocaleTimeString('pt-BR')}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-size">{backup.tamanho_kb}KB</span>
                    </td>
                    <td>
                      <span className="badge badge-info">{backup.linhas_total}</span>
                    </td>
                    <td>
                      <span className="badge badge-primary">{backup.tabelas}</span>
                    </td>
                    <td>
                      <button
                        className="btn-action restore"
                        onClick={() => restaurarBackup(backup.nome)}
                        disabled={restaurando === backup.nome}
                        title="Restaurar este backup"
                      >
                        {restaurando === backup.nome ? (
                          <Loader size={16} className="spinner" />
                        ) : (
                          <RotateCcw size={16} />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Informações */}
      <div className="backup-info">
        <h3>ℹ️ Como Funciona</h3>
        <ul>
          <li>✅ <strong>Automático:</strong> Backup diário às 2:00 AM</li>
          <li>✅ <strong>Completo:</strong> Todas as tabelas + conhecimento base</li>
          <li>✅ <strong>Seguro:</strong> Histórico de 30 dias mantido</li>
          <li>✅ <strong>Restaurável:</strong> Clique em "Restaurar" para voltar a um ponto anterior</li>
          <li>⚠️ <strong>Atenção:</strong> Backup é LOCAL. Para segurança em produção, configure sincronização com AWS S3 ou Google Drive</li>
        </ul>
      </div>

      {/* Enterprise Feature */}
      <div className="backup-enterprise">
        <h3>🚀 Features Enterprise (em desenvolvimento)</h3>
        <ul>
          <li>☁️ Sincronização automática com AWS S3 / Google Drive</li>
          <li>📧 Notificações de backup por email</li>
          <li>🔐 Encriptação de backups</li>
          <li>📦 Compressão GZIP para economizar espaço</li>
          <li>⏰ Agendamento customizável</li>
        </ul>
      </div>
    </div>
  );
}
