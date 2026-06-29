# 🚀 Integração do Chatbot FechaPro

Este guia explica como integrar o novo sistema de chatbot no projeto existente.

## 📁 Arquivos Criados

1. **lead-classifier.js** - Classifica leads (intenção, etapa, temperatura)
2. **scoring-engine.js** - Calcula score e recomendações
3. **objecao-handler.js** - Trata objeções comerciais
4. **chatbot-manager.js** - Orquestrador principal do fluxo

## 🔧 Integração no index.js

### 1. Adicionar imports no topo

Após as linhas 20-21 do index.js, adicionar:

```javascript
const ChatbotManager = require('./chatbot-manager');
```

### 2. Inicializar o ChatbotManager

Após a linha 84 (após `const metrics = new MetricsManager();`), adicionar:

```javascript
let chatbotManager = null; // Será inicializado após carregar base de conhecimento
```

### 3. Inicializar após carregar base de conhecimento

Na função `async function iniciar()` (linha ~1174), após `await carregarBaseConhecimento();`, adicionar:

```javascript
// Inicializar ChatbotManager com base de conhecimento
chatbotManager = new ChatbotManager(baseConhecimento);
console.log('🤖 ChatbotManager inicializado com nova estrutura comercial');
```

### 4. Substituir a função gerarResposta

Encontrar a função `async function gerarResposta(texto, telefone, midia = null, identidade = identidadeDaSessao(1), tentativa = 0)` (linha ~648) e SUBSTITUIR por:

```javascript
async function gerarResposta(texto, telefone, midia = null, identidade = identidadeDaSessao(1), tentativa = 0) {
  const iaAtiva = iaProvider === 'xai' ? xai : gemini;
  
  // Obter histórico do contato
  const chaveHistorico = `${identidade.sessao}:${telefone}`;
  const historico = historicosPorContato.get(chaveHistorico) || [];
  
  // Processar com novo ChatbotManager
  if (chatbotManager) {
    try {
      const analise = await chatbotManager.processar(telefone, texto, historico);
      
      // Log da análise (para debug)
      logger.debug(`Lead ${telefone}: Etapa=${analise.leadData.etapa_comercial}, Temperatura=${analise.temperatura}, Score=${analise.score}`);
      
      // Se deve escalar, transferir para humano
      if (analise.deveEscalar && analise.scoreRelatorio.urgencia !== 'BAIXA') {
        atendimentosHumanos.add(`${identidade.sessao}:${telefone}`);
        const resumoTransferencia = chatbotManager.preparaParaTransferencia(telefone);
        console.log(`\n📞 ESCALAÇÃO AUTOMÁTICA:\n${resumoTransferencia.mensagemTransferencia}\n`);
        
        return `Essa situação precisa de uma análise mais específica.

Já organizei o resumo da sua conversa e vou encaminhar para uma pessoa da equipe continuar com você sem precisar repetir tudo.`;
      }
    } catch (err) {
      logger.debug(`Erro no ChatbotManager: ${err.message}`);
    }
  }
  
  // Fallback para sistema anterior se ChatbotManager falhar ou não estiver pronto
  if (!iaAtiva) return gerarRespostaRoteiro(texto, telefone, identidade);

  const systemInstruction = `${INSTRUCOES_GEMINI}\n\nLINK OFICIAL DO DIAGNÓSTICO: Ao oferecer ou enviar o diagnóstico, use sempre ${URL_DIAGNOSTICO}.\n\nIDENTIDADE DESTE PERFIL: Você atende em nome de ${identidade.nome}, integrante do FechaPro. Fale em primeira pessoa com estilo ${identidade.estilo}. Não use o nome Fezinha. Não afirme que a mensagem foi digitada pessoalmente e não negue automação se perguntarem.\n\nBASE OFICIAL DO FECHAPRO:\n${baseConhecimento || 'Nenhuma base oficial carregada.'}`;

  try {
    let resposta = '';

    if (iaProvider === 'xai') {
      const mensagensXai = historico.map(msg => ({
        role: msg.role === 'model' ? 'assistant' : msg.role,
        content: msg.parts?.[0]?.text || '',
      })).filter(m => m.content);
      mensagensXai.push({
        role: 'user',
        content: texto || 'Analise o conteúdo enviado e responda de forma útil.',
      });

      const resultado = await xai.messages.create({
        model: process.env.XAI_MODEL || 'grok-beta',
        max_tokens: 500,
        temperature: 0.3,
        system: systemInstruction,
        messages: mensagensXai,
      });

      resposta = resultado.content[0]?.text?.trim() || '';
      if (!resposta) throw new Error('xAI retornou uma resposta vazia');

      historicosPorContato.set(chaveHistorico, [
        ...historico,
        { role: 'user', parts: [{ text: texto }] },
        { role: 'model', parts: [{ text: resposta }] },
      ].slice(-MAX_HISTORICO_POR_CONTATO));
    } else {
      const partesUsuario = [{ text: texto || 'Analise o conteúdo enviado e responda de forma útil.' }];
      if (midia) partesUsuario.push({ inlineData: { mimeType: midia.mimeType, data: midia.buffer.toString('base64') } });
      const contents = [
        ...historico,
        { role: 'user', parts: partesUsuario },
      ];

      const resultado = await gemini.models.generateContent({
        model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
        contents,
        config: {
          systemInstruction,
          temperature: 0.3,
          maxOutputTokens: 500,
          thinkingConfig: { thinkingBudget: 0 },
        },
      });

      resposta = resultado.text?.trim() || '';
      if (!resposta) throw new Error('Gemini retornou uma resposta vazia');
      const motivoTermino = resultado.candidates?.[0]?.finishReason;
      if (motivoTermino === 'MAX_TOKENS') {
        throw new Error('Gemini cortou a resposta por limite de tamanho');
      }

      historicosPorContato.set(chaveHistorico, [
        ...contents,
        { role: 'model', parts: [{ text: resposta }] },
      ].slice(-MAX_HISTORICO_POR_CONTATO));
    }

    resposta = resposta
      .replace(/\[PREENCHER URL DO DIAGN[ÓO]STICO\]/gi, URL_DIAGNOSTICO)
      .replace(/https?:\/\/[^\s)\]]+\/diagnostico\b/gi, URL_DIAGNOSTICO);

    const { resposta: respostaLimpa, truncado } = limparResposta(resposta, midia);
    metrics.registrarRespostaIA({ telefone, tamanho: respostaLimpa.length, fonte: 'ia', truncado });

    return respostaLimpa;
  } catch (err) {
    const iaNome = iaProvider === 'xai' ? 'xAI' : 'Gemini';
    if (tentativa === 0 && !err.message.includes('API_KEY') && !err.message.includes('not valid')) {
      logger.debug(`${iaNome} falhou; tentando novamente`);
      await new Promise(resolve => setTimeout(resolve, 800));
      return gerarResposta(texto, telefone, midia, identidade, 1);
    }

    const chaveHistorico = `${identidade.sessao}:${telefone}`;
    const historico = historicosPorContato.get(chaveHistorico) || [];
    const respostaFallback = gerarRespostaRoteiro(texto, telefone, identidade);
    const { resposta: respostaFallbackLimpa, truncado: truncadoFallback } = limparResposta(respostaFallback, midia);
    metrics.registrarRespostaIA({ telefone, tamanho: respostaFallbackLimpa.length, fonte: 'roteiro', truncado: truncadoFallback });
    historicosPorContato.set(chaveHistorico, [
      ...historico,
      { role: 'user', parts: [{ text: texto }] },
      { role: 'model', parts: [{ text: respostaFallbackLimpa }] },
    ].slice(-MAX_HISTORICO_POR_CONTATO));
    return respostaFallbackLimpa;
  }
}
```

## 📊 Novo Painel (Opcional)

Você pode criar um novo endpoint no frontend para visualizar:
- Score dos leads
- Temperatura
- Intenção
- Leads prontos para escalação

Adicione no `index.js` após o endpoint `/api/analytics`:

```javascript
if (req.method === 'GET' && req.url === '/api/leads') {
  if (!chatbotManager) return json(400, { erro: 'ChatbotManager não iniciado' });
  
  const todos = Array.from(chatbotManager.classifier.leads.entries()).map(([tel, lead]) => {
    const score = chatbotManager.scorer.obterScore(tel, lead);
    return {
      telefone: tel,
      nome: lead.nome,
      empresa: lead.empresa,
      segmento: lead.segmento,
      intencao: lead.intencao,
      etapa_comercial: lead.etapa_comercial,
      temperatura: lead.temperatura,
      score,
      precisa_humano: score > 50,
    };
  });
  
  return json(200, { leads: todos, total: todos.length });
}
```

## ✅ Checklist de Integração

- [ ] Adicionar imports (lead-classifier, scoring-engine, objecao-handler, chatbot-manager)
- [ ] Inicializar ChatbotManager no `iniciar()`
- [ ] Substituir função `gerarResposta`
- [ ] Testar com um contato novo
- [ ] Verificar logs do atendimento
- [ ] Confirmar escalação automática funcionando
- [ ] Adicionar endpoint `/api/leads` (opcional)

## 🧪 Testando

1. Conecte WhatsApp
2. Envie uma mensagem de um novo número
3. Verifique no terminal:
   - `Lead telefone: Etapa=...` deve aparecer
4. Se score > 50, deve aparecer `ESCALAÇÃO AUTOMÁTICA`

## 📝 Notas

- O sistema continua funcionando com fallback se ChatbotManager falhar
- Base de conhecimento é carregada automaticamente
- Histórico é mantido em `historicosPorContato`
- Atendimento humano detecta quando alguém da equipe responde

## 🚀 Próximos Passos

1. Adicionar dados dos planos e preços no `baseConhecimento`
2. Treinar em responder objeções específicas do seu produto
3. Configurar webhooks para notificar quando lead é qualificado
4. Criar painel de acompanhamento de leads
