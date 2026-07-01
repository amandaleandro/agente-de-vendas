import React, { useState, useEffect } from 'react';
import './LearningDashboard.css';

const LearningDashboard = () => {
  const [stats, setStats] = useState(null);
  const [padroes, setPadroes] = useState([]);
  const [conversas, setConversas] = useState([]);
  const [relatorio, setRelatorio] = useState(null);
  const [autoRetrainStatus, setAutoRetrainStatus] = useState(null);
  const [tab, setTab] = useState('stats');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [retreinando, setRetreinando] = useState(false);
  const [configurando, setConfigurando] = useState(false);

  useEffect(() => {
    carregarDados();
    const intervalo = setInterval(carregarDados, 30000); // Atualizar a cada 30s
    return () => clearInterval(intervalo);
  }, []);

  const carregarDados = async () => {
    try {
      setCarregando(true);
      const [statsRes, padroesRes, conversasRes, relatorioRes, autoRetrainRes] = await Promise.all([
        fetch('/api/learning/stats'),
        fetch('/api/learning/padroes'),
        fetch('/api/learning/conversas?limite=10'),
        fetch('/api/learning/relatorio'),
        fetch('/api/learning/auto-retrain/status')
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (padroesRes.ok) setPadroes((await padroesRes.json()).padroes);
      if (conversasRes.ok) setConversas(await conversasRes.json());
      if (relatorioRes.ok) setRelatorio(await relatorioRes.json());
      if (autoRetrainRes.ok) setAutoRetrainStatus(await autoRetrainRes.json());
      setErro(null);
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  };

  const dispararRetreino = async () => {
    try {
      setRetreinando(true);
      const res = await fetch('/api/learning/retreinar', { method: 'POST' });
      const data = await res.json();

      if (data.sucesso) {
        alert(`✅ Retreinamento concluído!\n\nNovas frases: ${data.resultado.sucessos}\nTotal: ${data.resultado.novo_total}\nNovas intenções: ${data.resultado.novas_intencoes.length}`);
        carregarDados();
      } else {
        alert('❌ Erro no retreinamento: ' + data.erro);
      }
    } catch (err) {
      alert('❌ Erro ao disparar retreinamento: ' + err.message);
    } finally {
      setRetreinando(false);
    }
  };

  const exportarCSV = async () => {
    try {
      const res = await fetch('/api/learning/export/csv');
      const csv = await res.text();
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `conversas_bot_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('❌ Erro ao exportar: ' + err.message);
    }
  };

  const forcaAutoRetrain = async () => {
    try {
      setRetreinando(true);
      const res = await fetch('/api/learning/auto-retrain/forca', { method: 'POST' });
      const data = await res.json();

      if (data.sucesso) {
        alert(`✅ Auto retrain forçado!\n\nFrases: ${data.resultado.sucessos}\nNovas intenções: ${data.resultado.novas_intencoes.length}`);
        carregarDados();
      } else {
        alert('❌ Erro: ' + data.erro);
      }
    } catch (err) {
      alert('❌ Erro: ' + err.message);
    } finally {
      setRetreinando(false);
    }
  };

  const salvarConfigAutoRetrain = async (config) => {
    try {
      setConfigurando(true);
      const res = await fetch('/api/learning/auto-retrain/configurar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      const data = await res.json();
      if (data.sucesso) {
        alert('✅ Configuração salva!');
        carregarDados();
      } else {
        alert('❌ Erro: ' + data.erro);
      }
    } catch (err) {
      alert('❌ Erro: ' + err.message);
    } finally {
      setConfigurando(false);
    }
  };

  if (carregando && !stats) {
    return <div className="learning-dashboard loading">⏳ Carregando dados...</div>;
  }

  return (
    <div className="learning-dashboard">
      <h1>🧠 Sistema de Aprendizado do Bot</h1>

      {erro && <div className="error-banner">⚠️ Erro: {erro}</div>}

      {/* Abas */}
      <div className="tabs">
        <button
          className={`tab ${tab === 'stats' ? 'active' : ''}`}
          onClick={() => setTab('stats')}
        >
          📊 Estatísticas
        </button>
        <button
          className={`tab ${tab === 'padroes' ? 'active' : ''}`}
          onClick={() => setTab('padroes')}
        >
          🎯 Padrões
        </button>
        <button
          className={`tab ${tab === 'conversas' ? 'active' : ''}`}
          onClick={() => setTab('conversas')}
        >
          💬 Conversas
        </button>
        <button
          className={`tab ${tab === 'relatorio' ? 'active' : ''}`}
          onClick={() => setTab('relatorio')}
        >
          📋 Relatório
        </button>
        <button
          className={`tab ${tab === 'autoretrain' ? 'active' : ''}`}
          onClick={() => setTab('autoretrain')}
        >
          🔄 Auto Retrain
        </button>
      </div>

      {/* TAB: ESTATÍSTICAS */}
      {tab === 'stats' && stats && (
        <div className="tab-content stats-section">
          <div className="stats-grid">
            <div className="stat-card total">
              <div className="stat-label">Total de Conversas</div>
              <div className="stat-value">{stats.total}</div>
            </div>

            <div className="stat-card success">
              <div className="stat-label">Sucessos</div>
              <div className="stat-value">{stats.sucessos}</div>
              <div className="stat-sub">{stats.taxa_sucesso}%</div>
            </div>

            <div className="stat-card failure">
              <div className="stat-label">Fracassos</div>
              <div className="stat-value">{stats.fracassos}</div>
            </div>

            <div className="stat-card indeciso">
              <div className="stat-label">Indeciso</div>
              <div className="stat-value">{stats.indeciso}</div>
            </div>

            <div className="stat-card duration">
              <div className="stat-label">Duração Média</div>
              <div className="stat-value">{Math.round(stats.duracao_media_ms / 1000)}s</div>
            </div>

            <div className="stat-card patterns">
              <div className="stat-label">Padrões Descobertos</div>
              <div className="stat-value">{padroes.length}</div>
            </div>
          </div>

          {/* Taxa de Sucesso Visualizada */}
          <div className="progress-section">
            <div className="progress-label">Taxa de Sucesso</div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${stats.taxa_sucesso}%` }}
              >
                {stats.taxa_sucesso}%
              </div>
            </div>
          </div>

          {/* Intenções */}
          <div className="intencoes-section">
            <h3>Intenções Detectadas</h3>
            <div className="intencoes-grid">
              {Object.entries(stats.intencoes || {})
                .sort((a, b) => b[1] - a[1])
                .map(([intencao, count]) => (
                  <div key={intencao} className="intencao-badge">
                    <div className="intencao-nome">{intencao}</div>
                    <div className="intencao-count">{count}</div>
                  </div>
                ))}
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="action-buttons">
            <button
              className="btn btn-primary"
              onClick={dispararRetreino}
              disabled={retreinando}
            >
              {retreinando ? '🔄 Retreinando...' : '🔄 Retreinar NLP'}
            </button>
            <button className="btn btn-secondary" onClick={exportarCSV}>
              💾 Exportar CSV
            </button>
            <button className="btn btn-secondary" onClick={carregarDados}>
              🔄 Atualizar
            </button>
          </div>
        </div>
      )}

      {/* TAB: PADRÕES */}
      {tab === 'padroes' && (
        <div className="tab-content padroes-section">
          {padroes.length === 0 ? (
            <p className="empty-state">Sem padrões descobertos ainda. Precise de mais conversas bem-sucedidas.</p>
          ) : (
            <div className="padroes-list">
              {padroes.map((p, i) => (
                <div key={i} className="padrao-card">
                  <div className="padrao-header">
                    <span className="padrao-num">#{i + 1}</span>
                    <span className="padrao-intencao">{p.intencao}</span>
                    <span className={`padrao-taxa ${parseFloat(p.taxaSucesso) >= 70 ? 'high' : 'medium'}`}>
                      {p.taxaSucesso}%
                    </span>
                  </div>
                  <div className="padrao-resposta">
                    "{p.resposta.substring(0, 150)}{p.resposta.length > 150 ? '...' : ''}"
                  </div>
                  <div className="padrao-meta">
                    Usado {p.tentativas} vezes
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: CONVERSAS */}
      {tab === 'conversas' && (
        <div className="tab-content conversas-section">
          {conversas.length === 0 ? (
            <p className="empty-state">Nenhuma conversa registrada.</p>
          ) : (
            <div className="conversas-table">
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Telefone</th>
                    <th>Resultado</th>
                    <th>Duração</th>
                    <th>Etapa Final</th>
                    <th>Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {conversas.map((c, i) => (
                    <tr key={i} className={`resultado-${c.resultado}`}>
                      <td>{new Date(c.data).toLocaleString('pt-BR')}</td>
                      <td className="telefone">{c.telefone}</td>
                      <td>
                        <span className={`badge resultado-${c.resultado}`}>
                          {c.resultado === 'sucesso' && '✅'}
                          {c.resultado === 'fracasso' && '❌'}
                          {c.resultado === 'indeciso' && '⏳'}
                          {' ' + c.resultado}
                        </span>
                      </td>
                      <td>{c.duracao_ms}ms</td>
                      <td className="etapa">{c.etapa_final}</td>
                      <td className="motivo">{c.motivoEncerramento}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB: RELATÓRIO */}
      {tab === 'relatorio' && relatorio && (
        <div className="tab-content relatorio-section">
          <div className="relatorio-resumo">
            <h3>📋 Resumo de Melhoria</h3>
            <div className="resumo-grid">
              <div className="resumo-item">
                <div className="resumo-label">Total de Conversas</div>
                <div className="resumo-value">{relatorio.resumo?.total_conversas}</div>
              </div>
              <div className="resumo-item">
                <div className="resumo-label">Taxa de Sucesso</div>
                <div className="resumo-value">{relatorio.resumo?.taxa_sucesso}</div>
              </div>
              <div className="resumo-item">
                <div className="resumo-label">Taxa de Fracasso</div>
                <div className="resumo-value">{relatorio.resumo?.taxa_fracasso}</div>
              </div>
            </div>
          </div>

          <div className="relatorio-section">
            <h3>🏆 Melhores Respostas</h3>
            <div className="melhores-list">
              {(relatorio.melhores_respostas || []).map((r, i) => (
                <div key={i} className="melhor-item">
                  <div className="melhor-rank">#{i + 1}</div>
                  <div className="melhor-info">
                    <div className="melhor-intencao">{r.intencao}</div>
                    <div className="melhor-taxa">{r.taxa_sucesso} | Usado {r.vezes_usado}x</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relatorio-section">
            <h3>💡 Recomendações</h3>
            <ul className="recomendacoes-list">
              {(relatorio.recomendacoes || []).map((rec, i) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* TAB: AUTO RETRAIN */}
      {tab === 'autoretrain' && autoRetrainStatus && (
        <div className="tab-content autoretrain-section">
          <div className="autoretrain-header">
            <h3>🔄 Retreinamento Automático</h3>
            <div className={`status-badge ${autoRetrainStatus.enabled ? 'ativo' : 'inativo'}`}>
              {autoRetrainStatus.enabled ? '🟢 Ativo' : '🔴 Inativo'}
            </div>
          </div>

          {autoRetrainStatus.retreinando && (
            <div className="alert alert-info">⏳ Retreinamento em andamento...</div>
          )}

          <div className="autoretrain-stats">
            <div className="autoretrain-stat">
              <div className="stat-label">Último Retreino</div>
              <div className="stat-value">
                {new Date(autoRetrainStatus.ultimoRetreino).toLocaleString('pt-BR')}
              </div>
            </div>

            <div className="autoretrain-stat">
              <div className="stat-label">Tempo Desde Último</div>
              <div className="stat-value">{autoRetrainStatus.tempoDesdeUltimo}</div>
            </div>

            <div className="autoretrain-stat">
              <div className="stat-label">Próximo Retreino</div>
              <div className="stat-value highlight">{autoRetrainStatus.proximoRetreino}</div>
            </div>

            <div className="autoretrain-stat">
              <div className="stat-label">Intervalo</div>
              <div className="stat-value">{autoRetrainStatus.intervaloConfigurarado}</div>
            </div>

            <div className="autoretrain-stat">
              <div className="stat-label">Conversas (Sucesso)</div>
              <div className="stat-value">
                {autoRetrainStatus.statsAtual.sucessos}/{autoRetrainStatus.statsAtual.totalConversas}
              </div>
            </div>

            <div className="autoretrain-stat">
              <div className="stat-label">Taxa de Sucesso</div>
              <div className="stat-value">{autoRetrainStatus.statsAtual.taxaSucesso}</div>
            </div>
          </div>

          {autoRetrainStatus.historico && autoRetrainStatus.historico.length > 0 && (
            <div className="historico-autoretrain">
              <h4>📋 Últimos Retreinamentos</h4>
              <div className="historico-list">
                {autoRetrainStatus.historico.map((h, i) => (
                  <div key={i} className="historico-item">
                    <span className="data">{new Date(h.data).toLocaleString('pt-BR')}</span>
                    <span className="badge">{h.frasesAdicionadas} frases</span>
                    {h.novasIntencoes > 0 && (
                      <span className="badge novas">{h.novasIntencoes} novas</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="autoretrain-actions">
            <button
              className="btn btn-primary"
              onClick={forcaAutoRetrain}
              disabled={retreinando || autoRetrainStatus.retreinando}
            >
              {retreinando ? '🔄 Retreinando...' : '⚡ Forçar Agora'}
            </button>
            <button className="btn btn-secondary" onClick={carregarDados}>
              🔄 Atualizar
            </button>
          </div>

          <div className="info-box">
            <p><strong>ℹ️ Como funciona:</strong></p>
            <ul>
              <li>O bot aprende automaticamente com cada conversa bem-sucedida</li>
              <li>Retreinamentos adicionam novas frases descobertas ao modelo NLP</li>
              <li>Intervalo padrão: {autoRetrainStatus.intervaloConfigurarado}</li>
              <li>Mínimo de conversas para retreinar: {autoRetrainStatus.minConversasParaRetreinar}</li>
              <li>Você pode forçar um retreinamento a qualquer momento</li>
            </ul>
          </div>
        </div>
      )}

      {/* Rodapé */}
      <div className="dashboard-footer">
        <small>
          🔄 Atualizado automaticamente a cada 30s
          {' '} | {' '}
          Arquivos: <code>aprendizado_bot.jsonl</code> + <code>padroes_sucesso.json</code>
        </small>
      </div>
    </div>
  );
};

export default LearningDashboard;
