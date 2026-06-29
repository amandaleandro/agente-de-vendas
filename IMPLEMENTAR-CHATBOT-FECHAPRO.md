# 🎯 Guia Rápido: Implementar Chatbot FechaPro

## ✅ Já foi criado

Você recebeu 4 arquivos JavaScript prontos para integração:

1. **lead-classifier.js** (125 linhas)
   - Classifica intenção do lead
   - Identifica etapa comercial
   - Calcula temperatura (frio/morno/quente/pronto)
   - Extrai dor do cliente

2. **scoring-engine.js** (100 linhas)
   - Pontuação automática (0-100)
   - Recomendação de ação
   - Critério para escalar para humano
   - Histórico de eventos

3. **objecao-handler.js** (120 linhas)
   - Identifica tipo de objeção
   - Resposta preparada para cada objeção
   - Próxima pergunta contextualizada
   - Histórico de objeções

4. **chatbot-manager.js** (240 linhas)
   - Orquestra todo o fluxo
   - Integra classificação + scoring + objeções
   - Gera resposta por etapa comercial
   - Prepara transferência para humano

**Total: ~600 linhas de código novo**

---

## 🚀 Implementação em 3 Passos

### Passo 1: Copiar arquivos (30 segundos)
```
✅ Já estão em: c:\Users\amandalscarmo\Documents\agente de vendas\
- lead-classifier.js
- scoring-engine.js
- objecao-handler.js
- chatbot-manager.js
```

### Passo 2: Editar index.js (5 minutos)

**Linha ~20:** Adicionar import
```javascript
const ChatbotManager = require('./chatbot-manager');
```

**Linha ~85:** Inicializar variável
```javascript
let chatbotManager = null;
```

**Linha ~1215:** Inicializar após base (após `await carregarBaseConhecimento();`)
```javascript
chatbotManager = new ChatbotManager(baseConhecimento);
console.log('🤖 ChatbotManager inicializado');
```

**Linha ~648:** SUBSTITUIR função `gerarResposta` completamente

👉 Ver arquivo `INTEGRACAO-CHATBOT-FECHAPRO.md` para o código completo

### Passo 3: Testar (2 minutos)
```bash
npm start
# Conectar WhatsApp
# Enviar mensagem de novo número
# Verificar logs: "Lead telefone: Etapa=..."
```

---

## 📊 O que muda no comportamento

### ANTES (sistema antigo)
```
Bot: [pergunta genérica]
Cliente: [resposta]
Bot: [resposta pré-programada]
```

### DEPOIS (novo sistema)
```
Bot: [pergunta personalizada baseado em histórico]
Cliente: [resposta]
Bot: [resposta considerando:]
  ✓ Intenção do cliente
  ✓ Etapa comercial
  ✓ Temperatura (frio/quente)
  ✓ Dor identificada
  ✓ Objeções anteriores
  ✓ Score do lead
  → Se score > 50: ESCALAR PARA HUMANO
```

---

## 🎯 Exemplos de Fluxo

### Cenário 1: Novo Interessado
```
Cliente: Como funciona?
Bot: [Classifica como NOVO_INTERESSADO, etapa QUALIFICACAO]
Bot: Qual é seu tipo de negócio?
Cliente: Fotografia
Bot: [Armazena: segmento=fotografia]
Bot: Como você envia orçamentos atualmente?
Cliente: WhatsApp, assim mesmo
Bot: [Armazena: como_envia=WhatsApp]
Bot: Quando manda orçamento, o que mais acontece?
Cliente: Cliente vê e suma
Bot: [Identifica DOR: CLIENTE_DESAPARECE, temperatura: MORNO, score: 35]
Bot: Com FechaPro, você consegue apresentar proposta de forma profissional...
```

### Cenário 2: Lead Quente
```
Cliente: Quanto custa?
Bot: [Classifica como QUER_PRECO, score: +15, temperatura: QUENTE]
Bot: Antes de indicar o melhor plano, você quer apenas usar o sistema ou precisa de ajuda com presença também?
Cliente: Quero tudo!
Bot: [Score: 50, temperatura: QUENTE]
Bot: Recomendo o plano Anual (R$ 997/ano) porque inclui:
  ✓ Propostas profissionais
  ✓ Página otimizada
  ✓ Google Meu Negócio
  
Quer começar?
Cliente: Quero saber mais
Bot: [Score: 55, temperatura: PRONTO_FECHAR]
Bot: [ESCALAÇÃO AUTOMÁTICA PARA HUMANO]
🧑‍💼 Transferir para vendedor...
```

### Cenário 3: Objeção
```
Cliente: Está caro!
Bot: [Detecta OBJECAO: PRECO]
Bot: Entendo. Quantas vendas você perde por falta de acompanhamento?
Bot: [Mostra exemplo do ROI]
Bot: [Oferece mensal como teste]
Cliente: Pode ser...
Bot: [Score sobe, escalação automática]
```

---

## 📈 Métricas que você ganha

Com o novo sistema, você consegue medir:

```javascript
const resumo = chatbotManager.obterResumoLead(telefone);
// Retorna:
{
  telefone: '5585999999999',
  nome: 'João da Silva',
  empresa: 'JS Fotografia',
  segmento: 'fotografia',
  intencao: 'QUER_PRECO',
  principal_dor: 'CLIENTE_DESAPARECE',
  etapa_comercial: 'PLANO_RECOMENDADO',
  temperatura: 'QUENTE',
  score: 65,
  precisaHumano: true,
  proxima_acao: 'Oferecer contratação'
}
```

---

## 🔥 Escalação Automática

**Critérios para escalar:**
- ✅ Cliente quer comprar (PRONTO_COMPRA)
- ✅ Pede condição especial (negociar desconto)
- ✅ Problema técnico
- ✅ Score >= 50 e muito engajado
- ✅ Várias tentativas de objeção

**O que é transferido:**
```
👤 João da Silva
🏢 JS Fotografia
🏭 Fotografia

📍 Etapa: PLANO_RECOMENDADO
🌡️ Temperatura: QUENTE
📊 Score: 65/100

💬 Última intenção: QUER_PRECO
🎯 Principal dor: CLIENTE_DESAPARECE

📌 Objeções registradas:
- PRECO
- MOMENTO

Próximo passo: Oferecer contratação
```

---

## 🛠️ Estrutura de Dados do Lead

Cada lead armazena:
```javascript
{
  telefone: string,
  nome: string,
  empresa: string,
  segmento: string,
  cidade: string,
  origem: string,
  intencao: 'NOVO_INTERESSADO' | 'QUER_PRECO' | 'PRONTO_COMPRA' | ...,
  principal_dor: 'CLIENTE_DESAPARECE' | 'FALTA_ORGANIZACAO' | ...,
  como_envia_orcamento: string,
  quantidade_orcamentos_mes: number,
  tem_site: boolean,
  tem_google_meu_negocio: boolean,
  urgencia: string,
  temperatura: 'FRIO' | 'MORNO' | 'QUENTE' | 'PRONTO_FECHAR',
  etapa_comercial: 'LEAD_NOVO' | 'QUALIFICACAO' | 'DIAGNOSTICO' | 'PLANO_RECOMENDADO' | 'FECHAMENTO' | 'CLIENTE',
  plano_recomendado: string,
  proxima_acao: string,
  precisa_humano: boolean,
  resumo_conversa: string,
  ultima_atividade: string, // ISO timestamp
  criado_em: string // ISO timestamp
}
```

---

## 🧪 Testar Localmente

Após integrar, você pode testar no terminal:

```javascript
// Simular um lead novo
const manager = new ChatbotManager('base conhecimento aqui');

const analise = await manager.processar(
  '5585999999999',
  'Como funciona?',
  []
);

console.log(analise);
// Output:
{
  leadData: { intencao: 'NOVO_INTERESSADO', ... },
  score: 0,
  temperatura: 'FRIO',
  deveEscalar: false,
  ...
}
```

---

## 🚨 Considerações Importantes

1. **Fallback automático**: Se ChatbotManager falhar, volta para sistema antigo
2. **Base de conhecimento**: Carregada automaticamente de `conhecimento/`
3. **Histórico**: Mantido em memória (persiste só na sessão)
4. **Escalação**: Move contato para `atendimentosHumanos` (já suportado)
5. **IA continua**: Gera resposta com IA ou roteiro, agora com contexto melhor

---

## 📚 Arquivos de Conhecimento

Coloque na pasta `conhecimento/`:
- `PLANOS-E-PRECOS.txt` ✅ (já criado)
- `FLUXO-COMERCIAL.txt` ✅ (já criado)
- `OBJECOES.txt` (criar com suas objeções específicas)
- `FAQ.txt` (perguntas frequentes)

---

## ⏱️ Tempo Total

| Etapa | Tempo |
|-------|-------|
| Cópia de arquivos | 1 min |
| Editar index.js | 5 min |
| Testar | 2 min |
| **Total** | **~8 minutos** |

---

## 🎓 Próximas Melhorias

Depois de implementado, você pode:

1. **API de Leads**: Expor `/api/leads` para ver dashboard
2. **Webhooks**: Notificar quando lead está pronto
3. **Persistência**: Salvar leads em banco ao invés de memória
4. **Analytics**: Gráficos de temperatura, taxa de conversão
5. **Objeções customizadas**: Adicionar suas objeções específicas
6. **Fluxos A/B**: Testar diferentes abordagens

---

## ✨ Checklist Final

- [ ] Copiar 4 arquivos .js
- [ ] Editar index.js (3 pontos)
- [ ] Adicionar `INTEGRACAO-CHATBOT-FECHAPRO.md` como referência
- [ ] Testar com novo número
- [ ] Verificar logs
- [ ] Confirmar escalação
- [ ] Documentar objeções específicas
- [ ] Treinar time de atendimento sobre novo fluxo

---

**Status**: 🟢 Pronto para implementação!

Qualquer dúvida, refer a `INTEGRACAO-CHATBOT-FECHAPRO.md` com todos os detalhes técnicos.
