import React, { useState, useEffect } from 'react';
import { Zap, CheckCircle, AlertCircle, Eye, EyeOff, LinkIcon } from 'lucide-react';
import './CRMConfig.css';

export default function CRMConfig() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pipedriveKey, setPipedriveKey] = useState('');
  const [hubspotKey, setHubspotKey] = useState('');
  const [showPipedriveKey, setShowPipedriveKey] = useState(false);
  const [showHubspotKey, setShowHubspotKey] = useState(false);
  const [testando, setTestando] = useState(null);
  const [salvando, setSalvando] = useState(null);
  const [historico, setHistorico] = useState([]);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      const [statusRes, historicoRes] = await Promise.all([
        fetch('/api/crm/status'),
        fetch('/api/crm/historico?limite=10')
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

  const salvarPipedrive = async () => {
    setSalvando('pipedrive');
    try {
      const res = await fetch('/api/crm/pipedrive/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: pipedriveKey })
      });

      if (res.ok) {
        const data = await res.json();
        alert('✅ Pipedrive configurado com sucesso!');
        carregarDados();
        setPipedriveKey('');
      } else {
        alert('❌ Erro ao configurar Pipedrive');
      }
    } catch (e) {
      alert('❌ Erro: ' + e.message);
    } finally {
      setSalvando(null);
    }
  };

  const salvarHubspot = async () => {
    setSalvando('hubspot');
    try {
      const res = await fetch('/api/crm/hubspot/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: hubspotKey })
      });

      if (res.ok) {
        const data = await res.json();
        alert('✅ HubSpot configurado com sucesso!');
        carregarDados();
        setHubspotKey('');
      } else {
        alert('❌ Erro ao configurar HubSpot');
      }
    } catch (e) {
      alert('❌ Erro: ' + e.message);
    } finally {
      setSalvando(null);
    }
  };

  const testarConexao = async (crm) => {
    setTestando(crm);
    try {
      const res = await fetch(`/api/crm/teste/${crm}`);
      const data = await res.json();

      if (data.ok) {
        alert(`✅ ${crm.toUpperCase()} conectado com sucesso!`);
      } else {
        alert(`❌ Erro ao conectar ${crm}: ${data.erro}`);
      }
    } catch (e) {
      alert('❌ Erro: ' + e.message);
    } finally {
      setTestando(null);
    }
  };

  if (loading || !status) {
    return <div className="crm-loading">⏳ Carregando...</div>;
  }

  return (
    <div className="crm-config">
      <div className="crm-header">
        <h1>🔗 Integrações com CRM</h1>
        <p>Sincronize seus leads automaticamente com Pipedrive ou HubSpot</p>
      </div>

      {/* Status Cards */}
      <div className="crm-status-grid">
        <div className={`crm-card ${status.pipedrive.configurado ? 'conectado' : 'desconectado'}`}>
          <div className="crm-card-header">
            <div className="crm-logo pipedrive-logo">🟢</div>
            <h2>Pipedrive</h2>
          </div>

          <div className="crm-status-badge">
            {status.pipedrive.configurado ? (
              <>
                <CheckCircle size={20} />
                <span>Conectado</span>
              </>
            ) : (
              <>
                <AlertCircle size={20} />
                <span>Não configurado</span>
              </>
            )}
          </div>

          <div className="crm-form">
            <label>API Key</label>
            <div className="input-group">
              <input
                type={showPipedriveKey ? 'text' : 'password'}
                placeholder="Sua API key do Pipedrive"
                value={pipedriveKey}
                onChange={(e) => setPipedriveKey(e.target.value)}
              />
              <button
                className="btn-toggle"
                onClick={() => setShowPipedriveKey(!showPipedriveKey)}
              >
                {showPipedriveKey ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="crm-actions">
              <button
                className="btn btn-primary"
                onClick={salvarPipedrive}
                disabled={!pipedriveKey || salvando === 'pipedrive'}
              >
                {salvando === 'pipedrive' ? 'Salvando...' : 'Salvar'}
              </button>

              <button
                className="btn btn-secondary"
                onClick={() => testarConexao('pipedrive')}
                disabled={!status.pipedrive.configurado || testando === 'pipedrive'}
              >
                {testando === 'pipedrive' ? 'Testando...' : 'Testar Conexão'}
              </button>
            </div>
          </div>

          <div className="crm-info">
            <p>
              Para obter sua API key, acesse:{' '}
              <a href="https://app.pipedrive.com/settings/personal" target="_blank" rel="noopener noreferrer">
                Configurações Pipedrive →
              </a>
            </p>
          </div>
        </div>

        <div className={`crm-card ${status.hubspot.configurado ? 'conectado' : 'desconectado'}`}>
          <div className="crm-card-header">
            <div className="crm-logo hubspot-logo">🟣</div>
            <h2>HubSpot</h2>
          </div>

          <div className="crm-status-badge">
            {status.hubspot.configurado ? (
              <>
                <CheckCircle size={20} />
                <span>Conectado</span>
              </>
            ) : (
              <>
                <AlertCircle size={20} />
                <span>Não configurado</span>
              </>
            )}
          </div>

          <div className="crm-form">
            <label>API Key</label>
            <div className="input-group">
              <input
                type={showHubspotKey ? 'text' : 'password'}
                placeholder="Sua API key do HubSpot"
                value={hubspotKey}
                onChange={(e) => setHubspotKey(e.target.value)}
              />
              <button
                className="btn-toggle"
                onClick={() => setShowHubspotKey(!showHubspotKey)}
              >
                {showHubspotKey ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="crm-actions">
              <button
                className="btn btn-primary"
                onClick={salvarHubspot}
                disabled={!hubspotKey || salvando === 'hubspot'}
              >
                {salvando === 'hubspot' ? 'Salvando...' : 'Salvar'}
              </button>

              <button
                className="btn btn-secondary"
                onClick={() => testarConexao('hubspot')}
                disabled={!status.hubspot.configurado || testando === 'hubspot'}
              >
                {testando === 'hubspot' ? 'Testando...' : 'Testar Conexão'}
              </button>
            </div>
          </div>

          <div className="crm-info">
            <p>
              Para obter sua API key, acesse:{' '}
              <a href="https://app.hubspot.com/l/settings/api-key" target="_blank" rel="noopener noreferrer">
                HubSpot API →
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Como Funciona */}
      <div className="crm-section">
        <h2>Como Funciona?</h2>
        <div className="crm-steps">
          <div className="step">
            <div className="step-number">1</div>
            <h3>Configurar API</h3>
            <p>Copie a API key do seu CRM e cole acima</p>
          </div>

          <div className="step">
            <div className="step-number">2</div>
            <h3>Leads Automáticos</h3>
            <p>Cada lead do bot é sincronizado automaticamente</p>
          </div>

          <div className="step">
            <div className="step-number">3</div>
            <h3>Cria Deal</h3>
            <p>Um novo deal é criado com histórico da conversa</p>
          </div>

          <div className="step">
            <div className="step-number">4</div>
            <h3>Acompanhe</h3>
            <p>Gerencie oportunidades no seu CRM preferido</p>
          </div>
        </div>
      </div>

      {/* Histórico */}
      {historico.length > 0 && (
        <div className="crm-section">
          <h2>📋 Últimas Sincronizações</h2>
          <div className="historico-table">
            <table>
              <thead>
                <tr>
                  <th>CRM</th>
                  <th>Status</th>
                  <th>Data/Hora</th>
                </tr>
              </thead>
              <tbody>
                {historico.map((item, i) => (
                  <tr key={i}>
                    <td>
                      <span className="crm-badge">{item.crm.toUpperCase()}</span>
                    </td>
                    <td>
                      <span className="status-badge sucesso">✅ Sincronizado</span>
                    </td>
                    <td>{new Date(item.timestamp).toLocaleString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Features */}
      <div className="crm-features">
        <h2>Funcionalidades</h2>
        <div className="features-grid">
          <div className="feature">
            <Zap size={24} />
            <h3>Sincronização Automática</h3>
            <p>Leads são sincronizados em tempo real</p>
          </div>

          <div className="feature">
            <LinkIcon size={24} />
            <h3>Histórico Completo</h3>
            <p>Conversas do bot integradas no deal</p>
          </div>

          <div className="feature">
            <Zap size={24} />
            <h3>Qualificação Automática</h3>
            <p>Leads são pré-qualificados pelo bot</p>
          </div>

          <div className="feature">
            <LinkIcon size={24} />
            <h3>Múltiplos CRMs</h3>
            <p>Use Pipedrive, HubSpot ou ambos</p>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="crm-info-box">
        <h3>📚 Documentação</h3>
        <ul>
          <li><a href="https://developers.pipedrive.com/" target="_blank" rel="noopener noreferrer">Documentação Pipedrive API</a></li>
          <li><a href="https://developers.hubspot.com/" target="_blank" rel="noopener noreferrer">Documentação HubSpot API</a></li>
          <li><a href="https://docs.fechapro.com/crm" target="_blank" rel="noopener noreferrer">Guia FechaPro + CRM</a></li>
        </ul>
      </div>
    </div>
  );
}
