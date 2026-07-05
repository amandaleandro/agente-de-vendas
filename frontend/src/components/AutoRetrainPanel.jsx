import React, { useState, useEffect } from 'react';
import './AutoRetrainPanel.css';

const AutoRetrainPanel = () => {
  const [status, setStatus] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [forcando, setForcando] = useState(false);
  const [configurando, setConfigurando] = useState(false);
  const [config, setConfig] = useState({
    enabled: true,
    intervaloMinutos: 60,
    minConversasParaRetreinar: 20
  });

  useEffect(() => {
    carregarStatus();
    const intervalo = setInterval(carregarStatus, 30000); // Atualizar a cada 30s
    return () => clearInterval(intervalo);
  }, []);

  const carregarStatus = async () => {
    try {
      const res = await fetch('/api/learning/auto-retrain/status');
      if (res.ok) {
        const dados = await res.json();
        setStatus(dados);
        setConfig({
          enabled: dados.enabled,
          intervaloMinutos: dados.intervaloConfigurarado?.replace('min', '').trim() || 60,
          minConversasParaRetreinar: dados.minConversasParaRetreinar
        });
      }
    } catch (err) {
      console.error('Erro ao carregar status:', err);
    } finally {
      setCarregando(false);
    }
  };

  const forcaRetreino = async () => {
    try {
      setForcando(true);
      const res = await fetch('/api/learning/auto-retrain/forca', { method: 'POST' });
      const dados = await res.json();

      if (dados.sucesso && dados.resultado) {
        alert(`✅ Retreinamento forçado concluído!\n\nFrases adicionadas: ${dados.resultado.sucessos}\nNovas intenções: ${dados.resultado.novas_intencoes?.length || 0}`);
        carregarStatus();
      } else {
        const errorMsg = dados.erro || 'Erro desconhecido ao executar retreinamento';
        alert('❌ Erro: ' + errorMsg);
      }
    } catch (err) {
      alert('❌ Erro ao forçar retrain: ' + err.message);
    } finally {
      setForcando(false);
    }
  };

  const salvarConfiguracao = async () => {
    try {
      setConfigurando(true);
      const res = await fetch('/api/learning/auto-retrain/configurar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: config.enabled,
          intervaloMinutos: parseInt(config.intervaloMinutos),
          minConversasParaRetreinar: parseInt(config.minConversasParaRetreinar)
        })
      });

      const dados = await res.json();
      if (dados.sucesso) {
        alert('✅ Configuração salva com sucesso!');
        carregarStatus();
      } else {
        alert('❌ Erro: ' + dados.erro);
      }
    } catch (err) {
      alert('❌ Erro ao salvar: ' + err.message);
    } finally {
      setConfigurando(false);
    }
  };

  if (carregando) {
    return <div className="auto-retrain-panel loading">⏳ Carregando...</div>;
  }

  return (
    <div className="auto-retrain-panel">
      <h2>🔄 Retreinamento Automático do NLP</h2>

      {status && (
        <>
          {/* Status Card */}
          <div className="status-card">
            <div className="status-header">
              <h3>Status</h3>
              <div className={`status-badge ${status.enabled ? 'ativo' : 'inativo'}`}>
                {status.enabled ? '🟢 Ativo' : '🔴 Inativo'}
              </div>
            </div>

            {status.retreinando && (
              <div className="alert alert-info">
                ⏳ Retreinamento em andamento...
              </div>
            )}

            <div className="status-grid">
              <div className="status-item">
                <span className="label">Último Retreino:</span>
                <span className="value">{new Date(status.ultimoRetreino).toLocaleString('pt-BR')}</span>
              </div>

              <div className="status-item">
                <span className="label">Tempo Desde Último:</span>
                <span className="value">{status.tempoDesdeUltimo}</span>
              </div>

              <div className="status-item">
                <span className="label">Próximo Retreino:</span>
                <span className="value next-retrain">{status.proximoRetreino}</span>
              </div>

              <div className="status-item">
                <span className="label">Conversas (Sucesso):</span>
                <span className="value">{status.statsAtual.sucessos}/{status.statsAtual.totalConversas}</span>
              </div>

              <div className="status-item">
                <span className="label">Taxa de Sucesso:</span>
                <span className="value">{status.statsAtual.taxaSucesso}</span>
              </div>

              <div className="status-item">
                <span className="label">Intervalo Configurado:</span>
                <span className="value">{status.intervaloConfigurarado}</span>
              </div>
            </div>
          </div>

          {/* Histórico */}
          {status.historico && status.historico.length > 0 && (
            <div className="historico-card">
              <h3>📋 Últimos Retreinamentos</h3>
              <div className="historico-list">
                {status.historico.map((h, i) => (
                  <div key={i} className="historico-item">
                    <div className="historico-data">
                      {new Date(h.data).toLocaleString('pt-BR')}
                    </div>
                    <div className="historico-detalhes">
                      <span className="badge">{h.frasesAdicionadas} frases</span>
                      {h.novasIntencoes > 0 && (
                        <span className="badge novas-intencoes">{h.novasIntencoes} novas intenções</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Configuração */}
          <div className="config-card">
            <h3>⚙️ Configurações</h3>

            <div className="config-item">
              <label>
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                />
                Ativar Retreinamento Automático
              </label>
            </div>

            <div className="config-item">
              <label>Intervalo entre Retreinamentos (minutos)</label>
              <input
                type="number"
                min="15"
                max="1440"
                value={config.intervaloMinutos}
                onChange={(e) => setConfig({ ...config, intervaloMinutos: e.target.value })}
              />
              <small>Mínimo: 15 | Máximo: 1440 (1 dia)</small>
            </div>

            <div className="config-item">
              <label>Mínimo de Conversas com Sucesso</label>
              <input
                type="number"
                min="5"
                max="100"
                value={config.minConversasParaRetreinar}
                onChange={(e) => setConfig({ ...config, minConversasParaRetreinar: e.target.value })}
              />
              <small>Mínimo: 5 | Máximo: 100</small>
            </div>

            <button
              className="btn btn-primary"
              onClick={salvarConfiguracao}
              disabled={configurando}
            >
              {configurando ? '💾 Salvando...' : '💾 Salvar Configurações'}
            </button>
          </div>

          {/* Ações */}
          <div className="actions-card">
            <h3>⚡ Ações</h3>

            <button
              className="btn btn-danger"
              onClick={forcaRetreino}
              disabled={forcando || status.retreinando}
            >
              {forcando ? '🔄 Retreinando...' : '🔄 Forçar Retreinamento Agora'}
            </button>

            <button className="btn btn-secondary" onClick={carregarStatus}>
              🔄 Atualizar Status
            </button>
          </div>

          {/* Informações */}
          <div className="info-card">
            <h3>ℹ️ Informações</h3>
            <ul>
              <li>O retreinamento adiciona novas frases descobertas ao modelo NLP</li>
              <li>Quanto mais conversas bem-sucedidas, melhor o modelo fica</li>
              <li>Retreinamentos regulares melhoram a taxa de sucesso do bot fallback</li>
              <li>Você pode forçar um retreinamento a qualquer momento</li>
              <li>Nenhuma conversa é perdida - tudo fica em aprendizado_bot.jsonl</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
};

export default AutoRetrainPanel;
