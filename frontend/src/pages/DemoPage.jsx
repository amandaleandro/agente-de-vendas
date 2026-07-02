import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle, TrendingUp, Zap, BarChart3, ChevronRight } from 'lucide-react';
import './DemoPage.css';

export default function DemoPage() {
  const [mensagens, setMensagens] = useState([]);
  const [demoDados, setDemoDados] = useState(null);
  const [input, setInput] = useState('');
  const [carregando, setCarregando] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [mensagens]);

  useEffect(() => {
    buscarResposta('apresentacao inicial').catch((e) => {
      console.error('Erro:', e);
      setMensagens([{
        tipo: 'bot',
        texto: 'Nao consegui buscar a resposta da API agora. Tente novamente em instantes.',
        timestamp: new Date()
      }]);
    });
    carregarDadosDemo();
  }, []);

  const carregarDadosDemo = async () => {
    try {
      const [statusRes, analyticsRes, learningRes] = await Promise.all([
        fetch('/api/status'),
        fetch('/api/analytics/dados'),
        fetch('/api/learning/stats')
      ]);

      const status = statusRes.ok ? await statusRes.json() : null;
      const analytics = analyticsRes.ok ? await analyticsRes.json() : null;
      const learning = learningRes.ok ? await learningRes.json() : null;
      setDemoDados({ status, analytics, learning });
    } catch (e) {
      console.error('Erro ao carregar dados da demo:', e);
    }
  };

  const buscarResposta = async (texto) => {
    const response = await fetch('/api/demo/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mensagem: texto })
    });

    if (!response.ok) {
      throw new Error('Falha ao buscar resposta da API');
    }

    const data = await response.json();
    setMensagens(prev => [...prev, {
      tipo: 'bot',
      texto: data.resposta,
      timestamp: new Date()
    }]);
  };

  const enviarMensagem = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Adicionar mensagem do usuário
    const novaMensagem = {
      tipo: 'user',
      texto: input,
      timestamp: new Date()
    };
    setMensagens([...mensagens, novaMensagem]);
    setInput('');
    setCarregando(true);

    try {
      await buscarResposta(input);
    } catch (e) {
      console.error('Erro:', e);
      setMensagens(prev => [...prev, {
        tipo: 'bot',
        texto: 'Nao consegui buscar a resposta da API agora. Tente novamente em instantes.',
        timestamp: new Date()
      }]);
    } finally {
      setCarregando(false);
    }
  };


  const sugestoesRapidas = [
    'Qual é o preço?',
    'Como funciona?',
    'Quero uma demo',
    'Integrações disponíveis'
  ];

  return (
    <div className="demo-page">
      {/* Header */}
      <div className="demo-hero">
        <h1>🤖 Conheça o FechaPro</h1>
        <p>Seu assistente de vendas inteligente 24/7 via WhatsApp</p>
        <div className="hero-badges">
          <span className="badge">✨ IA Consultiva</span>
          <span className="badge">📱 WhatsApp</span>
          <span className="badge">🎯 Automático</span>
        </div>
      </div>

      <div className="demo-container">
        {/* Chat */}
        <div className="chat-section">
          <div className="chat-box">
            <div className="messages">
              {mensagens.map((msg, i) => (
                <div key={i} className={`message message-${msg.tipo}`}>
                  <div className="message-avatar">
                    {msg.tipo === 'bot' ? '🤖' : '👤'}
                  </div>
                  <div className="message-content">
                    <p className="message-text">
                      {msg.texto.split('\n').map((linha, idx) => (
                        <React.Fragment key={idx}>
                          {linha}
                          {idx < msg.texto.split('\n').length - 1 && <br />}
                        </React.Fragment>
                      ))}
                    </p>
                    <span className="message-time">
                      {msg.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
              {carregando && (
                <div className="message message-bot">
                  <div className="message-avatar">🤖</div>
                  <div className="message-content">
                    <div className="typing-indicator">
                      <span></span><span></span><span></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Sugestões */}
            {mensagens.length <= 1 && (
              <div className="sugestoes">
                {sugestoesRapidas.map((sug, i) => (
                  <button
                    key={i}
                    className="sugestao-btn"
                    onClick={() => {
                      setInput(sug);
                      setTimeout(() => {
                        const form = document.querySelector('.chat-input form');
                        form?.dispatchEvent(new Event('submit', { bubbles: true }));
                      }, 100);
                    }}
                  >
                    {sug}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <form onSubmit={enviarMensagem} className="chat-input">
              <input
                type="text"
                placeholder="Digite sua pergunta..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={carregando}
              />
              <button type="submit" disabled={carregando || !input.trim()}>
                <Send size={20} />
              </button>
            </form>
          </div>
        </div>

        {/* Features */}
        <div className="features-section">
          <h2>Por que FechaPro?</h2>

          <div className="features-list">
            <div className="feature-card">
              <div className="feature-icon">
                <Zap size={32} />
              </div>
              <h3>Automático 24/7</h3>
              <p>Prospect, qualifica e acompanha leads enquanto você dorme</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <TrendingUp size={32} />
              </div>
              <h3>{demoDados?.analytics?.funil?.taxaConversao || 0}% Conversao</h3>
              <p>Taxa calculada com as respostas registradas no funil</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <BarChart3 size={32} />
              </div>
              <h3>Dashboard Completo</h3>
              <p>Veja tudo em tempo real: conversas, métricas, alertas</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <MessageCircle size={32} />
              </div>
              <h3>IA que Aprende</h3>
              <p>Sistema de aprendizado melhora respostas a cada conversa</p>
            </div>
          </div>

          {/* CTA */}
          <div className="cta-section">
            <h2>Pronto para crescer suas vendas?</h2>
            <p>Comece com a demo agora. Não precisa cartão de crédito.</p>
            <div className="cta-buttons">
              <button className="cta-primary">
                Agendar Demo <ChevronRight size={20} />
              </button>
              <button className="cta-secondary">Ver Documentação</button>
            </div>
          </div>

          {/* Stats */}
          <div className="stats-grid">
            <div className="stat">
              <div className="stat-number">{demoDados?.analytics?.funil?.prospectados || 0}</div>
              <div className="stat-label">Contatos prospectados</div>
            </div>
            <div className="stat">
              <div className="stat-number">{demoDados?.learning?.taxa_sucesso || 0}%</div>
              <div className="stat-label">Taxa de sucesso</div>
            </div>
            <div className="stat">
              <div className="stat-number">{demoDados?.status?.numerosConectados || 0}/{demoDados?.status?.numerosConfigurados || 0}</div>
              <div className="stat-label">WhatsApps conectados</div>
            </div>
            <div className="stat">
              <div className="stat-number">{demoDados?.analytics?.funil?.responderam || 0}</div>
              <div className="stat-label">Leads que responderam</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
