import React, { useState, useEffect } from 'react';
import './LearningDashboardMobile.css';

const LearningDashboardMobile = () => {
  const [stats, setStats] = useState(null);
  const [autoRetrainStatus, setAutoRetrainStatus] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [tab, setTab] = useState('home');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    carregarDados();
    const intervalo = setInterval(carregarDados, 20000); // Atualizar a cada 20s
    return () => clearInterval(intervalo);
  }, []);

  const carregarDados = async () => {
    try {
      const [statsRes, autoRetrainRes, alertsRes] = await Promise.all([
        fetch('/api/learning/stats'),
        fetch('/api/learning/auto-retrain/status'),
        fetch('/api/learning/alerts/status')
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (autoRetrainRes.ok) setAutoRetrainStatus(await autoRetrainRes.json());
      if (alertsRes.ok) setAlerts((await alertsRes.json()).alertas || []);
    } catch (err) {
      console.error('Erro:', err);
    } finally {
      setCarregando(false);
    }
  };

  const forcaRetreino = async () => {
    try {
      const res = await fetch('/api/learning/auto-retrain/forca', { method: 'POST' });
      const data = await res.json();
      if (data.sucesso) {
        alert('✅ Retreinamento iniciado!');
        carregarDados();
      }
    } catch (err) {
      alert('❌ Erro: ' + err.message);
    }
  };

  if (carregando) {
    return <div className="mobile-dashboard loading">⏳</div>;
  }

  return (
    <div className="mobile-dashboard">
      {/* TAB: HOME */}
      {tab === 'home' && stats && (
        <div className="mobile-tab">
          <div className="mobile-card big">
            <div className="card-label">Taxa de Sucesso</div>
            <div className="card-big-value">{stats.taxa_sucesso}%</div>
            <div className="progress-mini">
              <div className="progress-bar-mini" style={{ width: `${stats.taxa_sucesso}%` }}></div>
            </div>
          </div>

          <div className="mobile-row">
            <div className="mobile-card">
              <div className="card-label">Conversas</div>
              <div className="card-value">{stats.total}</div>
            </div>
            <div className="mobile-card">
              <div className="card-label">Sucessos</div>
              <div className="card-value success">{stats.sucessos}</div>
            </div>
          </div>

          <div className="mobile-row">
            <div className="mobile-card">
              <div className="card-label">Fracassos</div>
              <div className="card-value error">{stats.fracassos}</div>
            </div>
            <div className="mobile-card">
              <div className="card-label">Indeciso</div>
              <div className="card-value">{stats.indeciso}</div>
            </div>
          </div>

          <div className="mobile-card">
            <div className="card-label">Duração Média</div>
            <div className="card-value">{Math.round(stats.duracao_media_ms / 1000)}s</div>
          </div>
        </div>
      )}

      {/* TAB: AUTO RETRAIN */}
      {tab === 'retrain' && autoRetrainStatus && (
        <div className="mobile-tab">
          <div className={`mobile-card status-badge ${autoRetrainStatus.enabled ? 'ativo' : 'inativo'}`}>
            <div>{autoRetrainStatus.enabled ? '🟢 Ativo' : '🔴 Inativo'}</div>
          </div>

          <div className="mobile-card">
            <div className="card-label">Próximo Retrain</div>
            <div className="card-value highlight">{autoRetrainStatus.proximoRetreino}</div>
          </div>

          <div className="mobile-card">
            <div className="card-label">Último Retrain</div>
            <div className="card-small">
              {new Date(autoRetrainStatus.ultimoRetreino).toLocaleString('pt-BR')}
            </div>
          </div>

          <div className="mobile-row">
            <div className="mobile-card">
              <div className="card-label">Intervalo</div>
              <div className="card-value">{autoRetrainStatus.intervaloConfigurarado}</div>
            </div>
            <div className="mobile-card">
              <div className="card-label">Conversas</div>
              <div className="card-value">{autoRetrainStatus.statsAtual.sucessos}</div>
            </div>
          </div>

          <button className="mobile-btn btn-primary" onClick={forcaRetreino}>
            ⚡ Forçar Agora
          </button>
        </div>
      )}

      {/* TAB: ALERTAS */}
      {tab === 'alerts' && (
        <div className="mobile-tab">
          {alerts.length === 0 ? (
            <div className="empty-state">
              ✅ Nenhum alerta ativo
            </div>
          ) : (
            alerts.map((alert, i) => (
              <div key={i} className={`alert-card alert-${alert.nivel}`}>
                <div className="alert-titulo">{alert.tipo}</div>
                <div className="alert-details">
                  {Object.entries(alert.dados).map(([key, value]) => (
                    <div key={key} className="alert-item">
                      <span className="label">{key}:</span>
                      <span className="value">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="mobile-nav">
        <button
          className={`nav-btn ${tab === 'home' ? 'active' : ''}`}
          onClick={() => setTab('home')}
        >
          📊 Status
        </button>
        <button
          className={`nav-btn ${tab === 'retrain' ? 'active' : ''}`}
          onClick={() => setTab('retrain')}
        >
          🔄 Retrain
        </button>
        <button
          className={`nav-btn ${tab === 'alerts' ? 'active' : ''}`}
          onClick={() => setTab('alerts')}
        >
          🚨 Alertas
        </button>
        <button className="nav-btn" onClick={carregarDados}>
          🔄 Atualizar
        </button>
      </div>
    </div>
  );
};

export default LearningDashboardMobile;
