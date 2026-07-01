import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { AlertTriangle, CheckCircle, AlertCircle, Cpu, HardDrive, Zap, Database } from 'lucide-react';
import './SystemMonitor.css';

export default function SystemMonitor() {
  const [status, setStatus] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarDados();
    const interval = setInterval(carregarDados, 60000); // Atualizar a cada 60s
    return () => clearInterval(interval);
  }, []);

  const carregarDados = async () => {
    try {
      const [statusRes, historicoRes] = await Promise.all([
        fetch('/api/monitor/status'),
        fetch('/api/monitor/historico?horas=2')
      ]);

      if (statusRes.ok) setStatus(await statusRes.json());
      if (historicoRes.ok) {
        const data = await historicoRes.json();
        setHistorico(data.historico || []);
      }
      setLoading(false);
    } catch (e) {
      console.error('Erro ao carregar dados:', e);
      setLoading(false);
    }
  };

  if (loading || !status) {
    return <div className="monitor-loading">⏳ Carregando monitor...</div>;
  }

  const { metricas, alertas, uptime_horas, saudavel } = status;
  const cor_memoria = metricas.memoria.uso_pct > 80 ? '#ef4444' : metricas.memoria.uso_pct > 60 ? '#f59e0b' : '#10b981';
  const cor_cpu = metricas.cpu.uso > 80 ? '#ef4444' : metricas.cpu.uso > 60 ? '#f59e0b' : '#10b981';
  const cor_disco = metricas.disco.uso_pct > 85 ? '#ef4444' : metricas.disco.uso_pct > 70 ? '#f59e0b' : '#10b981';

  return (
    <div className="system-monitor">
      <div className="monitor-header">
        <h1>🖥️ Monitor de Sistema 24/7</h1>
        <p>Status em tempo real do servidor FechaPro</p>
      </div>

      {/* Status Geral */}
      <div className="health-status">
        <div className={`health-badge ${saudavel ? 'healthy' : 'warning'}`}>
          {saudavel ? (
            <>
              <CheckCircle size={32} />
              <span>Sistema Saudável</span>
            </>
          ) : (
            <>
              <AlertTriangle size={32} />
              <span>Atenção Necessária</span>
            </>
          )}
        </div>
        <div className="health-info">
          <div className="info-item">
            <span className="label">Uptime</span>
            <span className="value">{uptime_horas}h</span>
          </div>
          <div className="info-item">
            <span className="label">Alertas</span>
            <span className={`value ${alertas.ativos > 0 ? 'warning' : 'ok'}`}>
              {alertas.ativos}
            </span>
          </div>
          <div className="info-item">
            <span className="label">Última Verificação</span>
            <span className="value">Agora</span>
          </div>
        </div>
      </div>

      {/* Alertas */}
      {alertas.ativos > 0 && (
        <div className="alerts-section">
          <h2>🚨 Alertas Ativos ({alertas.ativos})</h2>
          <div className="alerts-list">
            {alertas.alertas.slice(0, 5).map((alerta, i) => (
              <div key={i} className={`alert-item alert-${alerta.severidade}`}>
                <div className="alert-icon">
                  {alerta.severidade === 'critical' && <AlertTriangle size={20} />}
                  {alerta.severidade === 'error' && <AlertCircle size={20} />}
                  {alerta.severidade === 'warning' && <AlertCircle size={20} />}
                </div>
                <div className="alert-content">
                  <div className="alert-title">{alerta.tipo}</div>
                  <div className="alert-message">{alerta.mensagem}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Métricas Grid */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-header">
            <Cpu size={24} />
            <h3>CPU</h3>
          </div>
          <div className="metric-gauge">
            <div className="gauge-circle" style={{ background: `conic-gradient(${cor_cpu} 0deg ${metricas.cpu.uso * 3.6}deg, #374151 0deg)` }}>
              <div className="gauge-text">{metricas.cpu.uso}%</div>
            </div>
          </div>
          <p className="metric-label">{metricas.cpu.cores} cores</p>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <HardDrive size={24} />
            <h3>Memória RAM</h3>
          </div>
          <div className="metric-gauge">
            <div className="gauge-circle" style={{ background: `conic-gradient(${cor_memoria} 0deg ${metricas.memoria.uso_pct * 3.6}deg, #374151 0deg)` }}>
              <div className="gauge-text">{metricas.memoria.uso_pct}%</div>
            </div>
          </div>
          <p className="metric-label">{metricas.memoria.livre}/{metricas.memoria.total}MB</p>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <Zap size={24} />
            <h3>Disco</h3>
          </div>
          <div className="metric-gauge">
            <div className="gauge-circle" style={{ background: `conic-gradient(${cor_disco} 0deg ${metricas.disco.uso_pct * 3.6}deg, #374151 0deg)` }}>
              <div className="gauge-text">{metricas.disco.uso_pct}%</div>
            </div>
          </div>
          <p className="metric-label">{metricas.disco.livre}/{metricas.disco.total}GB</p>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <Database size={24} />
            <h3>Banco de Dados</h3>
          </div>
          <div className="db-status">
            <div className={`status-indicator ${metricas.banco_dados.conectado ? 'online' : 'offline'}`}>
              {metricas.banco_dados.conectado ? 'Online' : 'Offline'}
            </div>
            <p className="metric-label">Latência: {metricas.banco_dados.latencia_ms}ms</p>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="charts-section">
        <h2>📊 Histórico (últimas 2 horas)</h2>

        <div className="chart-container">
          <h3>Uso de Memória (%)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={historico}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="timestamp" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" domain={[0, 100]} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                labelStyle={{ color: '#fff' }}
              />
              <Area
                type="monotone"
                dataKey={(d) => d.memoria?.uso_pct || 0}
                stroke="#10b981"
                fill="rgba(16, 185, 129, 0.2)"
                name="Memória (%)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container">
          <h3>Uso de CPU & Disco (%)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={historico}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="timestamp" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" domain={[0, 100]} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                labelStyle={{ color: '#fff' }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey={(d) => d.cpu?.uso || 0}
                stroke="#818cf8"
                dot={false}
                name="CPU (%)"
              />
              <Line
                type="monotone"
                dataKey={(d) => d.disco?.uso_pct || 0}
                stroke="#f59e0b"
                dot={false}
                name="Disco (%)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recomendações */}
      <div className="recommendations">
        <h2>💡 Recomendações</h2>
        <ul>
          {metricas.memoria.uso_pct > 70 && <li>💾 Memória em uso elevado. Considere aumentar RAM.</li>}
          {metricas.cpu.uso > 80 && <li>⚡ CPU em alta carga. Otimize processos ou escale horizontalmente.</li>}
          {metricas.disco.uso_pct > 80 && <li>💿 Espaço em disco baixo. Limpe arquivos antigos.</li>}
          {!metricas.banco_dados.conectado && <li>🔴 Banco de dados offline! Verifique conexão.</li>}
          {metricas.banco_dados.latencia_ms > 1000 && <li>🐌 BD lenta. Considere otimizar queries.</li>}
          {metricas.memoria.uso_pct < 70 && metricas.cpu.uso < 70 && metricas.disco.uso_pct < 70 && (
            <li>✅ Tudo funcionando perfeitamente!</li>
          )}
        </ul>
      </div>

      {/* Info */}
      <div className="monitor-info">
        <p>
          ℹ️ O monitor verifica a saúde do sistema a cada minuto e envia alertas para Slack quando limites são ultrapassados.
          Limites: CPU &lt;80%, Memória &lt;85%, Disco &lt;90%
        </p>
      </div>
    </div>
  );
}
