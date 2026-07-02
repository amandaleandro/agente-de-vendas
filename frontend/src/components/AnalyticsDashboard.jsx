import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  FunnelChart, Funnel
} from 'recharts';
import { Download, TrendingUp, AlertCircle, Clock } from 'lucide-react';
import './AnalyticsDashboard.css';

export default function AnalyticsDashboard() {
  const [stats, setStats] = useState(null);
  const [padroes, setPadroes] = useState(null);
  const [conversas, setConversas] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarDados();
    const interval = setInterval(carregarDados, 30000);
    return () => clearInterval(interval);
  }, []);

  const carregarDados = async () => {
    try {
      const [statsRes, padroesRes, conversasRes, analyticsRes] = await Promise.all([
        fetch('/api/learning/stats'),
        fetch('/api/learning/padroes?limite=10'),
        fetch('/api/learning/conversas?limite=100'),
        fetch('/api/analytics/dados')
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (padroesRes.ok) {
        const data = await padroesRes.json();
        setPadroes(Array.isArray(data) ? data : data.padroes || []);
      }
      if (conversasRes.ok) {
        const data = await conversasRes.json();
        setConversas(Array.isArray(data) ? data : data.conversas || []);
      }
      if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
      setLoading(false);
    } catch (e) {
      console.error('Erro ao carregar dados:', e);
      setLoading(false);
    }
  };

  const exportarRelatorio = () => {
    const data = {
      data_export: new Date().toISOString(),
      stats,
      padroes,
      conversas: Array.isArray(conversas) ? conversas.slice(0, 50) : []
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  if (loading) {
    return <div className="analytics-loading">⏳ Carregando dados...</div>;
  }

  // Gráfico 1: Conversas por dia (últimos 30 dias)
  const conversasPorDia = gerarDadosUltimos30Dias(conversas);

  // Gráfico 2: Taxa de sucesso vs fracasso
  const sucessoData = [
    { name: 'Sucesso', value: stats?.sucessos || 0, fill: '#10b981' },
    { name: 'Fracasso', value: stats?.fracassos || 0, fill: '#ef4444' },
    { name: 'Indeciso', value: (stats?.total || 0) - (stats?.sucessos || 0) - (stats?.fracassos || 0), fill: '#f59e0b' }
  ];

  // Gráfico 3: Top intenções
  const topIntencoes = Object.entries(stats?.intencoes || {})
    .map(([intencao, count]) => ({ intencao: intencao.replace(/_/g, ' '), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Gráfico 4: Funil (prospectados → responderam → sucesso)
  const funil = [
    { name: 'Prospectados', value: analytics?.funil?.prospectados || 0 },
    { name: 'Com Resposta', value: analytics?.funil?.responderam || 0 },
    { name: 'Sucesso', value: stats?.sucessos || 0 }
  ];

  // Cores
  const CORES = ['#10b981', '#818cf8', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#06b6d4', '#14b8a6'];

  return (
    <div className="analytics-dashboard">
      <div className="analytics-header">
        <h1>📊 Dashboard Analytics</h1>
        <button className="btn-export" onClick={exportarRelatorio}>
          <Download size={18} /> Exportar Relatório
        </button>
      </div>

      {/* KPIs */}
      <div className="analytics-kpis">
        <div className="kpi-card">
          <div className="kpi-label">Taxa de Sucesso</div>
          <div className="kpi-value">{stats?.taxa_sucesso || 0}%</div>
          <div className="kpi-meta">De {stats?.total || 0} conversas</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Conversas Hoje</div>
          <div className="kpi-value">{conversasPorDia[conversasPorDia.length - 1]?.conversas || 0}</div>
          <div className="kpi-meta">Última 24h</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Duração Média</div>
          <div className="kpi-value">{Math.round((stats?.duracao_media_ms || 0) / 1000)}s</div>
          <div className="kpi-meta">Por conversa</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Padrões Descobertos</div>
          <div className="kpi-value">{padroes?.length || 0}</div>
          <div className="kpi-meta">Respostas otimizadas</div>
        </div>
      </div>

      {/* Gráficos 2x2 */}
      <div className="charts-grid">
        {/* Gráfico 1: Conversas por dia */}
        <div className="chart-container">
          <h3>📈 Conversas por Dia (últimos 30 dias)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={conversasPorDia} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="data" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                labelStyle={{ color: '#fff' }}
              />
              <Line
                type="monotone"
                dataKey="conversas"
                stroke="#10b981"
                dot={{ fill: '#10b981', r: 4 }}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico 2: Sucesso vs Fracasso */}
        <div className="chart-container">
          <h3>🎯 Distribuição de Resultados</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={sucessoData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {sucessoData.map((entry, idx) => (
                  <Cell key={`cell-${idx}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                labelStyle={{ color: '#fff' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico 3: Top Intenções */}
        <div className="chart-container">
          <h3>💬 Top Intenções Detectadas</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topIntencoes} margin={{ top: 5, right: 30, left: 0, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="intencao"
                stroke="#9ca3af"
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                labelStyle={{ color: '#fff' }}
              />
              <Bar dataKey="count" fill="#818cf8" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico 4: Funil de Vendas */}
        <div className="chart-container">
          <h3>🔥 Funil de Vendas</h3>
          <ResponsiveContainer width="100%" height={300}>
            <FunnelChart margin={{ top: 20, right: 160, bottom: 20, left: 0 }}>
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                labelStyle={{ color: '#fff' }}
              />
              <Funnel dataKey="value" data={funil} fill="#818cf8">
                {funil.map((entry, idx) => (
                  <Cell key={`cell-${idx}`} fill={CORES[idx]} />
                ))}
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Respostas com Melhor Conversão */}
      <div className="top-respostas">
        <h3>⭐ Respostas com Melhor Conversão</h3>
        <div className="respostas-list">
          {(Array.isArray(padroes) ? padroes : []).slice(0, 5).map((p, i) => (
            <div key={i} className="resposta-item">
              <div className="resposta-rank">#{i + 1}</div>
              <div className="resposta-content">
                <div className="resposta-text">{p.resposta?.substring(0, 80)}...</div>
                <div className="resposta-meta">
                  Taxa: <strong className="taxa-sucesso">{p.taxaSucesso}%</strong> |
                  Usado: <strong>{p.vezes || 1}x</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Alertas Importantes */}
      {stats?.taxa_sucesso < 50 && (
        <div className="alert-box alert-warning">
          <AlertCircle size={20} />
          <div>
            <strong>⚠️ Taxa de sucesso baixa</strong>
            <p>Sua taxa de sucesso está em {stats?.taxa_sucesso}%. Considere retreinar o modelo.</p>
          </div>
        </div>
      )}

      {Array.isArray(conversas) && conversas.length > 0 && (
        <div className="recent-conversations">
          <h3>🕐 Conversas Recentes</h3>
          <div className="conv-table">
            <table>
              <thead>
                <tr>
                  <th>Telefone</th>
                  <th>Resultado</th>
                  <th>Duração</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {conversas.slice(0, 10).map((c, i) => (
                  <tr key={i}>
                    <td><code>{String(c.telefone || '').slice(-4)}</code></td>
                    <td>
                      <span className={`status status-${c.resultado}`}>
                        {c.resultado}
                      </span>
                    </td>
                    <td>{Math.round(c.duracao_ms / 1000)}s</td>
                    <td>{new Date(c.data).toLocaleDateString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// Gera dados dos últimos 30 dias
function gerarDadosUltimos30Dias(conversas) {
  const dados = {};

  if (!Array.isArray(conversas)) return [];

  conversas.forEach(c => {
    const data = new Date(c.data).toLocaleDateString('pt-BR');
    dados[data] = (dados[data] || 0) + 1;
  });

  const hoje = new Date();
  const ultimos30 = [];

  for (let i = 29; i >= 0; i--) {
    const d = new Date(hoje);
    d.setDate(d.getDate() - i);
    const dataStr = d.toLocaleDateString('pt-BR');
    ultimos30.push({
      data: dataStr.substring(0, 5),
      conversas: dados[dataStr] || 0
    });
  }

  return ultimos30;
}
