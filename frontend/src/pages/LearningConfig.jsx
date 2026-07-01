import React, { useState, useEffect } from 'react';
import './LearningConfig.css';

const LearningConfig = () => {
  const [alertConfig, setAlertConfig] = useState(null);
  const [responseConfig, setResponseConfig] = useState(null);
  const [slackStatus, setSlackStatus] = useState(null);
  const [tab, setTab] = useState('alerts');
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    carregarConfigs();
  }, []);

  const carregarConfigs = async () => {
    try {
      setCarregando(true);
      const [alertRes, responseRes, slackRes] = await Promise.all([
        fetch('/api/learning/alerts/status'),
        fetch('/api/learning/responses/status'),
        fetch('/api/learning/slack/status')
      ]);

      if (alertRes.ok) setAlertConfig(await alertRes.json());
      if (responseRes.ok) setResponseConfig(await responseRes.json());
      if (slackRes.ok) setSlackStatus(await slackRes.json());
    } catch (err) {
      console.error('Erro:', err);
    } finally {
      setCarregando(false);
    }
  };

  const salvarAlertConfig = async () => {
    try {
      setSalvando(true);
      const res = await fetch('/api/learning/alerts/configurar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alertConfig.thresholds)
      });

      const data = await res.json();
      if (data.sucesso) {
        alert('✅ Configuração salva!');
        carregarConfigs();
      } else {
        alert('❌ Erro: ' + data.erro);
      }
    } catch (err) {
      alert('❌ Erro: ' + err.message);
    } finally {
      setSalvando(false);
    }
  };

  const salvarResponseConfig = async () => {
    try {
      setSalvando(true);
      const res = await fetch('/api/learning/responses/configurar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          useAiRecommendations: responseConfig.enabled,
          minTaxaSucesso: responseConfig.minTaxaSucesso
        })
      });

      const data = await res.json();
      if (data.sucesso) {
        alert('✅ Configuração salva!');
        carregarConfigs();
      } else {
        alert('❌ Erro: ' + data.erro);
      }
    } catch (err) {
      alert('❌ Erro: ' + err.message);
    } finally {
      setSalvando(false);
    }
  };

  const testarSlack = async () => {
    try {
      setSalvando(true);
      const res = await fetch('/api/learning/slack/teste', { method: 'POST' });
      const data = await res.json();

      if (data.sucesso) {
        alert('✅ Mensagem Slack enviada com sucesso!');
      } else {
        alert('❌ Erro: ' + data.erro);
      }
    } catch (err) {
      alert('❌ Erro: ' + err.message);
    } finally {
      setSalvando(false);
    }
  };

  if (carregando) {
    return <div className="learning-config loading">⏳ Carregando...</div>;
  }

  return (
    <div className="learning-config">
      <h1>⚙️ Configuração do Sistema de Learning</h1>

      <div className="config-tabs">
        <button
          className={`tab ${tab === 'alerts' ? 'active' : ''}`}
          onClick={() => setTab('alerts')}
        >
          🚨 Alertas
        </button>
        <button
          className={`tab ${tab === 'responses' ? 'active' : ''}`}
          onClick={() => setTab('responses')}
        >
          💬 Respostas
        </button>
        <button
          className={`tab ${tab === 'slack' ? 'active' : ''}`}
          onClick={() => setTab('slack')}
        >
          📱 Slack
        </button>
      </div>

      {/* TAB: ALERTAS */}
      {tab === 'alerts' && alertConfig && (
        <div className="config-content">
          <div className="config-card">
            <h3>🚨 Configuração de Alertas</h3>

            <div className="config-item">
              <label>Taxa Mínima de Sucesso (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={alertConfig.thresholds?.taxa_sucesso_minima || 50}
                onChange={(e) =>
                  setAlertConfig({
                    ...alertConfig,
                    thresholds: {
                      ...alertConfig.thresholds,
                      taxa_sucesso_minima: parseInt(e.target.value)
                    }
                  })
                }
              />
              <small>Dispara alerta se taxa cair abaixo deste valor</small>
            </div>

            <div className="config-item">
              <label>Tempo Sem Retreino (minutos)</label>
              <input
                type="number"
                min="60"
                max="1440"
                value={alertConfig.thresholds?.tempo_sem_retrain || 240}
                onChange={(e) =>
                  setAlertConfig({
                    ...alertConfig,
                    thresholds: {
                      ...alertConfig.thresholds,
                      tempo_sem_retrain: parseInt(e.target.value)
                    }
                  })
                }
              />
              <small>Alerta se passar muito tempo sem retreinar</small>
            </div>

            <div className="config-item">
              <label>Mínimo de Conversas</label>
              <input
                type="number"
                min="1"
                max="100"
                value={alertConfig.thresholds?.conversas_minimas || 10}
                onChange={(e) =>
                  setAlertConfig({
                    ...alertConfig,
                    thresholds: {
                      ...alertConfig.thresholds,
                      conversas_minimas: parseInt(e.target.value)
                    }
                  })
                }
              />
              <small>Mínimo de conversas para alertas serem confiáveis</small>
            </div>

            <div className="config-info">
              <p><strong>Alertas Ativos:</strong> {alertConfig.total_alertas}</p>
              {alertConfig.alertas?.map((a, i) => (
                <div key={i} className="alert-item">
                  {a.tipo} - {a.nivel}
                </div>
              ))}
            </div>

            <button
              className="btn btn-primary"
              onClick={salvarAlertConfig}
              disabled={salvando}
            >
              {salvando ? '💾 Salvando...' : '💾 Salvar'}
            </button>
          </div>
        </div>
      )}

      {/* TAB: RESPOSTAS */}
      {tab === 'responses' && responseConfig && (
        <div className="config-content">
          <div className="config-card">
            <h3>💬 Seleção de Respostas</h3>

            <div className="config-item checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={responseConfig.enabled}
                  onChange={(e) =>
                    setResponseConfig({ ...responseConfig, enabled: e.target.checked })
                  }
                />
                Usar Respostas Otimizadas (baseado em histórico)
              </label>
            </div>

            {responseConfig.enabled && (
              <>
                <div className="config-item">
                  <label>Taxa Mínima de Sucesso (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={responseConfig.minTaxaSucesso || 60}
                    onChange={(e) =>
                      setResponseConfig({
                        ...responseConfig,
                        minTaxaSucesso: parseInt(e.target.value)
                      })
                    }
                  />
                  <small>Só usa respostas com taxa maior que este valor</small>
                </div>
              </>
            )}

            <div className="config-info">
              <p><strong>Status:</strong> {responseConfig.enabled ? '✅ Ativo' : '❌ Inativo'}</p>
              <p><strong>Cache:</strong> {responseConfig.cacheSize} entradas</p>
              <p><strong>Tempo Expiração:</strong> {responseConfig.cacheExpirado}</p>
            </div>

            <button
              className="btn btn-primary"
              onClick={salvarResponseConfig}
              disabled={salvando}
            >
              {salvando ? '💾 Salvando...' : '💾 Salvar'}
            </button>
          </div>
        </div>
      )}

      {/* TAB: SLACK */}
      {tab === 'slack' && (
        <div className="config-content">
          <div className="config-card">
            <h3>📱 Notificações Slack</h3>

            {slackStatus?.enabled ? (
              <>
                <div className="status-badge success">✅ Slack Conectado</div>

                <p>Seu sistema está configurado para receber notificações no Slack!</p>

                <div className="notification-types">
                  <h4>📬 Tipos de Notificações:</h4>
                  <ul>
                    <li>🚨 Alertas de taxa de sucesso baixa</li>
                    <li>🔴 Alertas de alta taxa de fracasso</li>
                    <li>🔄 Notificações de retreinamento concluído</li>
                    <li>📊 Relatórios diários de status</li>
                  </ul>
                </div>

                <button
                  className="btn btn-secondary"
                  onClick={testarSlack}
                  disabled={salvando}
                >
                  {salvando ? '⏳ Enviando...' : '🧪 Testar Conexão'}
                </button>
              </>
            ) : (
              <>
                <div className="status-badge">❌ Slack não configurado</div>

                <p>Para habilitar notificações no Slack:</p>

                <ol>
                  <li>Acesse <code>https://api.slack.com/messaging/webhooks</code></li>
                  <li>Crie um novo Incoming Webhook</li>
                  <li>Copie a URL gerada</li>
                  <li>Adicione ao .env:
                    <pre>SLACK_WEBHOOK_URL=https://hooks.slack.com/services/XXX/YYY/ZZZ</pre>
                  </li>
                  <li>Reinicie o backend</li>
                </ol>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LearningConfig;
