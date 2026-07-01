# 🧠 Sistema de Aprendizado do Bot Fallback

## O Que Muda

Antes: O bot fallback respondia igual para toda conversa, sem aprender com o histórico.

**Agora**: O bot registra cada conversa, aprende com sucessos e fracassos, e melhora suas respostas automaticamente.

---

## 📚 Como Funciona

### 1️⃣ Registro de Conversas

Cada interação é registrada em `backend/conhecimento/aprendizado_bot.jsonl`:

```json
{
  "telefone": "85999887766",
  "data": "2026-07-01T10:30:00Z",
  "resultado": "sucesso",
  "duracao_ms": 45000,
  "etapa_final": "perguntou_produto",
  "intencoes": ["saudacao", "dor_some", "afirmacao_positiva"],
  "respostas": ["Opa! Aqui é Amanda...", "Pois é, isso é super comum...", "Ótimo!..."],
  "mensagensCliente": ["Oi", "Sim, cliente some", "Sim, quero testar"]
}
```

### 2️⃣ Análise de Padrões

O sistema identifica **quais respostas convertem melhor**:

```
Intenção: "dor_some"
Resposta: "Pois é, isso é super comum..."
Taxa de Sucesso: 68%
Vezes Usado: 22
```

Isso é salvo em `backend/conhecimento/padroes_sucesso.json`.

### 3️⃣ Retreinamento do NLP

Novas frases aprendidas do histórico são adicionadas ao modelo:

- Antes: NLP treinado com ~50 frases pré-definidas
- Depois: NLP treinado com 50 + centenas de frases reais

### 4️⃣ Recomendações Inteligentes

O bot recomenda respostas baseadas em histórico:

```javascript
// Qual resposta funcionou bem para "dor_some"?
GET /api/learning/padroes?intencao=dor_some

// Retorna as top 5 que converteram
{
  "intencao": "dor_some",
  "respostas": [
    { "resposta": "...", "taxaSucesso": "72%" },
    { "resposta": "...", "taxaSucesso": "68%" },
    ...
  ]
}
```

---

## 📊 API Endpoints

### Estatísticas

```bash
# Ver stats gerais
GET /api/learning/stats

# Resposta:
{
  "total": 245,
  "sucessos": 168,
  "fracassos": 77,
  "taxa_sucesso": "68.6%",
  "duracao_media_ms": 45230,
  "intencoes": { "saudacao": 245, "dor_some": 198, ... }
}
```

### Padrões de Sucesso

```bash
# Ver top respostas para uma intenção
GET /api/learning/padroes?intencao=dor_some&limite=10

# Ver todos os padrões
GET /api/learning/padroes
```

### Histórico de Conversas

```bash
# Últimas conversas registradas
GET /api/learning/conversas?limite=20

# Exportar CSV para análise
GET /api/learning/export/csv
```

### Retreinamento

```bash
# Disparar retreinamento com novos padrões
POST /api/learning/retreinar

# Resposta:
{
  "sucesso": true,
  "resultado": {
    "sucessos": 156,
    "novo_total": 206,
    "novas_intencoes": ["dor_desconto_novo", ...]
  }
}
```

### Relatórios

```bash
# Relatório de melhoria completo
GET /api/learning/relatorio

# Análise de falhas (por quê conversas fracassam)
GET /api/learning/falhas

# Saúde do sistema
GET /api/learning/health
```

### Registrar Resultado (Manual)

```bash
# Marcar conversa como sucesso (via atendente)
POST /api/learning/registrar-sucesso
Body: { "telefone": "85999887766", "motivo": "cliente_clicou_link" }

# Marcar como fracasso
POST /api/learning/registrar-fracasso
Body: { "telefone": "85999887766", "motivo": "timeout" }
```

---

## 🔧 Como Usar no Código

### Registrar Início de Conversa

```javascript
const learningManager = require('./modules/learning-manager');

// Ao iniciar conversa com o fallback
learningManager.registrarInicio(telefone, { nome: 'Amanda' });
```

### Registrar Interação

```javascript
// Cada vez que bot gera resposta
learningManager.registrarInteracao(
  telefone,
  mensagem_cliente,
  intencao_detectada,
  resposta_do_bot,
  etapa_atual
);
```

### Registrar Resultado Final

```javascript
// Quando conversa termina com sucesso
learningManager.registrarResultado(telefone, 'sucesso', 'cliente_clicou_link');

// Quando fracassa
learningManager.registrarResultado(telefone, 'fracasso', 'desinteresse_explicito');

// Quando fica indeciso
learningManager.registrarResultado(telefone, 'indeciso', 'sem_resposta');
```

### Obter Recomendação de Resposta

```javascript
// Qual resposta melhor trabalhou para esta intenção?
const respostasUsadas = ['resposta 1', 'resposta 2'];
const recomendacao = learningManager.recomendarResposta(
  'dor_some',
  respostasUsadas
);

if (recomendacao) {
  console.log('Use esta resposta:', recomendacao);
}
```

---

## 📈 Analisar Dados

### Dashboard Rápido

```javascript
const stats = learningManager.analisarConversas();

console.log(`Taxa de Sucesso: ${stats.taxa_sucesso}%`);
console.log(`Total de Conversas: ${stats.total}`);
console.log(`Duração Média: ${stats.duracao_media_ms}ms`);
```

### Descobrir Novos Padrões

```javascript
const dados = learningManager.gerarDadosTreinamento();

console.log(`Novas frases descobertas: ${dados.novasFrases.length}`);
dados.novasFrases.slice(0, 5).forEach(f => {
  console.log(`"${f.frase}" → ${f.intencao}`);
});
```

### Top Respostas

```javascript
const melhores = learningManager.obterMelhoresRespostas('dor_some', 5);

melhores.forEach(m => {
  console.log(`[${m.taxaSucesso}%] ${m.resposta}`);
});
```

---

## 🚀 Retreinamento Automático

### Script Manual

```bash
# Disparar retreinamento e gerar relatório
cd backend
node modules/nlp-retrain.js
```

Output:
```
=== SISTEMA DE RETREINAMENTO DO NLP ===

🔄 Iniciando retreinamento do modelo NLP...
📚 Adicionando 156 novas frases ao modelo...
🧠 Treinando modelo com novos dados...
✅ Retreinamento concluído com sucesso!
  - frases_adicionadas: 156
  - novas_intencoes: 3
  - lista_novas_intencoes: ["objecao_preco_nova", ...]

📋 Relatório de Melhoria:
{
  "resumo": {
    "total_conversas": 245,
    "taxa_sucesso": "68.6%",
    "taxa_fracasso": "31.4%"
  },
  "melhores_respostas": [...],
  "recomendacoes": [...]
}
```

### Via API

```bash
curl -X POST http://localhost:3099/api/learning/retreinar
```

---

## 📁 Arquivos Criados

```
backend/
├── modules/
│   ├── learning-manager.js      # Gerencia aprendizado
│   ├── nlp-retrain.js           # Retreinamento e análise
│   ├── learning-api.js          # Endpoints (não usado, integrado no webserver)
│   └── webserver.js             # (MODIFICADO - adiciona endpoints de learning)
│
└── conhecimento/
    ├── aprendizado_bot.jsonl    # Log de todas as conversas (criado automaticamente)
    └── padroes_sucesso.json     # Padrões descobertos (criado automaticamente)
```

---

## 📊 Exemplos de Análise

### Descobrir Por Que Conversas Fracassam

```bash
curl http://localhost:3099/api/learning/falhas

# Resposta:
{
  "total_fracassos": 77,
  "taxa_falha": "31.4%",
  "intencoes_problematicas": {
    "desinteresse": { "ocorrencias": 45, "recomendacao": "..." },
    "objecao_preco": { "ocorrencias": 23, "recomendacao": "..." }
  }
}
```

### Acompanhar Progresso

```bash
# Dia 1
curl http://localhost:3099/api/learning/health
→ taxa_sucesso: "60%"

# Dia 7 (após retreinamentos)
curl http://localhost:3099/api/learning/health
→ taxa_sucesso: "68.6%"

# Melhoria de 8.6%!
```

---

## 🎯 Checklist de Implementação

- ✅ Learning Manager criado
- ✅ Roteiro Heurístico integrado com learning
- ✅ Webserver endpoints adicionados
- ✅ Sistema de análise e retreinamento
- ✅ Endpoints de API para visualizar dados
- ⏳ **PRÓXIMOS PASSOS** (Optional):
  - [ ] Painel de visualização no frontend
  - [ ] Alertas automáticos quando taxa cai
  - [ ] Dashboard de padrões em tempo real
  - [ ] Retreinamento automático a cada N conversas
  - [ ] Integração com banco de dados (opção de persistência melhor que JSONL)

---

## 💡 Dicas de Uso

1. **Retreine regularmente** (diariamente se houver muitas conversas)
2. **Analise falhas** antes de retreinar (entenda o padrão)
3. **Compare antes/depois** de mudanças
4. **Exporte CSV** para análise em Excel/Google Sheets
5. **Monitore saúde** do sistema: `GET /api/learning/health`

---

## 🔍 Troubleshooting

### "Nenhuma nova frase descoberta"
- Confirme que as conversas foram marcadas com `resultado: 'sucesso'`
- Verifique se o arquivo `aprendizado_bot.jsonl` existe

### "Taxa de sucesso não melhora após retreino"
- Aumente a quantidade de conversas analisadas (precisa de ~100+ para padrões confiáveis)
- Analise as falhas com `/api/learning/falhas`
- Pode ser que as respostas atuais já sejam ótimas

### "Modelo treinou mas as respostas não mudaram"
- O retreinamento adiciona **capacidade** de reconhecimento, não muda respostas
- Use `/api/learning/recomendacao` para obter respostas otimizadas
- Considere implementar seleção de resposta baseada em score de sucesso

---

**Status**: ✅ Sistema completo e operacional

Última atualização: 2026-07-01
