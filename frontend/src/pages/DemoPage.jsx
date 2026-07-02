import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle, TrendingUp, Zap, BarChart3, Check, ChevronRight } from 'lucide-react';
import './DemoPage.css';

export default function DemoPage() {
  const [mensagens, setMensagens] = useState([
    {
      tipo: 'bot',
      texto: 'Olá! Sou o bot FechaPro. Estou aqui para ajudar com dúvidas sobre vendas, preços, ou agendar uma demo. Como posso ajudar?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [carregando, setCarregando] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [mensagens]);

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
      // Simular resposta do bot com delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      const respostaBot = gerarRespostaDemo(input);
      setMensagens(prev => [...prev, {
        tipo: 'bot',
        texto: respostaBot,
        timestamp: new Date()
      }]);
    } catch (e) {
      console.error('Erro:', e);
    } finally {
      setCarregando(false);
    }
  };

  const gerarRespostaDemo = (input) => {
    const texto = input.toLowerCase();

    // Respostas predefinidas para demo
    if (texto.includes('preço') || texto.includes('valor') || texto.includes('custa')) {
      return 'Oferecemos 3 planos:\n\n💎 Básico - R$ 297/mês\n1 número, até 500 conversas\n\n💎 Profissional - R$ 597/mês\n3 números, até 2.000 conversas, integrações\n\n💎 Enterprise - R$ 1.497/mês\nNúmeros ilimitados, conversas ilimitadas, suporte dedicado\n\nQual plano interessa?';
    }

    if (texto.includes('demo') || texto.includes('demonstração') || texto.includes('teste')) {
      return 'Ótimo! A demo mostra:\n\n✅ Como funciona a prospecção automática\n✅ Integração com WhatsApp e CRM\n✅ Dashboard com métricas e alertas\n✅ Sistema de aprendizado que melhora com o tempo\n\nVocê quer agendar uma demo agora? Qual seu nome e email?';
    }

    if (texto.includes('como funciona')) {
      return 'O FechaPro funciona assim:\n\n1️⃣ Bot conecta ao WhatsApp\n2️⃣ Envia mensagens de prospecção\n3️⃣ Qualifica leads com perguntas inteligentes\n4️⃣ Registra tudo no dashboard\n5️⃣ Aprende e melhora com cada conversa\n\nTudo automático 24/7!';
    }

    if (texto.includes('integrações') || texto.includes('pipedrive') || texto.includes('hubspot')) {
      return 'Temos integrações com:\n\n🔗 Pipedrive - sincroniza leads → deals\n🔗 HubSpot - contactos + sequências\n🔗 Slack - alertas em tempo real\n🔗 Zapier - conecta com 5mil+ apps\n\nQual integração te interessa mais?';
    }

    if (texto.includes('aprendizado') || texto.includes('ia')) {
      return 'Nosso sistema de IA é INTELIGENTE:\n\n🧠 Aprende com cada conversa\n🧠 Identifica padrões de sucesso\n🧠 Seleciona respostas que convertem\n🧠 Melhora taxa de conversão em 30 dias\n\nOs dados são seus, a IA trabalha para você!';
    }

    if (texto.includes('obrigado') || texto.includes('valeu')) {
      return 'De nada! 😊 Se tiver mais dúvidas, é só chamar. Quer agendar uma demo? Clique no botão abaixo ou continue conversando comigo!';
    }

    // Resposta padrão
    return 'Entendi sua pergunta! Você quer saber mais sobre preços, features, integrações ou agendar uma demo? Sinta-se à vontade para perguntar!';
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
                      // Simular envio
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
              <h3>+40% Conversão</h3>
              <p>Clientes reportam aumento de 40% em conversões em 30 dias</p>
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

          {/* Planos */}
          <h2 style={{ marginTop: '3rem' }}>Planos e Preços</h2>

          <div className="planos-grid">
            <div className="plano-card">
              <div className="plano-badge">Básico</div>
              <div className="plano-preco">R$ 297<span>/mês</span></div>
              <ul className="plano-features">
                <li><Check size={18} /> 1 número WhatsApp</li>
                <li><Check size={18} /> Até 500 conversas</li>
                <li><Check size={18} /> Dashboard básico</li>
                <li><Check size={18} /> Suporte por email</li>
              </ul>
              <button className="plano-btn">Começar Agora</button>
            </div>

            <div className="plano-card destaque">
              <div className="plano-badge popular">Mais Popular</div>
              <div className="plano-preco">R$ 597<span>/mês</span></div>
              <ul className="plano-features">
                <li><Check size={18} /> 3 números WhatsApp</li>
                <li><Check size={18} /> Até 2.000 conversas</li>
                <li><Check size={18} /> Integrações (Slack, CRM)</li>
                <li><Check size={18} /> Suporte prioritário</li>
              </ul>
              <button className="plano-btn destaque-btn">Começar Agora</button>
            </div>

            <div className="plano-card">
              <div className="plano-badge">Enterprise</div>
              <div className="plano-preco">R$ 1.497<span>/mês</span></div>
              <ul className="plano-features">
                <li><Check size={18} /> Números ilimitados</li>
                <li><Check size={18} /> Conversas ilimitadas</li>
                <li><Check size={18} /> Customizações</li>
                <li><Check size={18} /> Account manager dedicado</li>
              </ul>
              <button className="plano-btn">Contato Comercial</button>
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
              <div className="stat-number">500+</div>
              <div className="stat-label">Conversas/dia</div>
            </div>
            <div className="stat">
              <div className="stat-number">68%</div>
              <div className="stat-label">Taxa de sucesso</div>
            </div>
            <div className="stat">
              <div className="stat-number">24/7</div>
              <div className="stat-label">Disponibilidade</div>
            </div>
            <div className="stat">
              <div className="stat-number">3min</div>
              <div className="stat-label">Setup inicial</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
