# 🤖 Guia de Treinamento do Bot com Dados Reais

## O que é

Sistema que **extrai conversas reais do banco de dados** e usa para:
- ✅ Analisar padrões de conversão
- ✅ Treinar classificador de intenção (NLP)
- ✅ Gerar insights sobre o que funciona
- ✅ Preparar dados para fine-tune de IA

---

## Como Usar

### 1️⃣ Treinar Modelo Completo

```bash
cd backend
node train.js
```

**O que acontece:**
- Extrai todas as conversas do banco PostgreSQL
- Agrupa em conversas completas por contato
- Analisa padrões de conversão
- Gera dataset para treinar intent classifier
- Salva resultados em `backend/conhecimento/training/`

**Saída esperada:**
```
🚀 Iniciando pipeline de treinamento...

1️⃣  Extraindo conversas do banco...
📊 Extraídas 1250 mensagens do banco

2️⃣  Agrupando em conversas completas...
📊 450 conversas únicas

3️⃣  Analisando padrões de conversão...

📈 Taxa de conversão: 35.2%
✅ Convertidas: 158
❌ Não convertidas: 292
```

### 2️⃣ Gerar Apenas Insights

```bash
node train.js --insights
```

Mostra quais **padrões específicos converteram:**
```
🎯 Gerando insights de conversão...

Principais padrões que convertem:
   • diagnóstico: 12x
   • fechar: 11x
   • proposta: 10x
   • acompanhar: 9x
```

### 3️⃣ Ajuda

```bash
node train.js --help
```

---

## Arquivos Gerados

Tudo fica em `backend/conhecimento/training/`:

### 📊 `analise_completa.json`
Análise detalhada de TODAS as conversas:
```json
{
  "total": 450,
  "porStatus": {
    "vendido": 158,
    "qualificado": 150,
    "nao_qualificado": 142
  },
  "conversaoRate": "35.2",
  "padroesDePergunta": {
    "cliente": { "count": 234, "conversoes": 98 },
    "proposta": { "count": 187, "conversoes": 89 }
  }
}
```

**Usar para:** Entender como conversas prosseguem

### 📈 `padroes_perguntas.json`
Quais palavras/padrões **mais convertem**:
```json
{
  "diagnóstico": { "count": 45, "conversoes": 18 },
  "acompanhar": { "count": 38, "conversoes": 16 },
  "proposta": { "count": 52, "conversoes": 19 }
}
```

**Usar para:** Atualizar roteiro com perguntas que convertem

### 📚 `training_dataset_intent.jsonl`
Dataset pronto para treinar NLP:
```jsonl
{"texto":"Qual é o seu maior problema?","intencao":"dor_identificada","status_final":"vendido","fonte":"conversa_real"}
{"texto":"Caro demais","intencao":"preco","status_final":"nao_qualificado","fonte":"conversa_real"}
```

**Usar para:**
- Treinar intent classifier local
- Fine-tune de IA (Gemini/OpenAI)

### 🎯 `insights_conversao.json`
Conversas reais que **converteram**:
```json
{
  "conversasQueConverteram": [
    {
      "entrada": "Como funciona?",
      "saida": "Deixa eu mostrar...",
      "frequencia": 5
    }
  ],
  "recomendacoes": [
    {
      "tipo": "resposta_bem_sucedida",
      "exemplos": ["Deixa eu mostrar...", "Vou te enviar..."]
    }
  ]
}
```

**Usar para:** Copiar respostas que funcionam

---

## 🎯 Como Usar os Resultados

### 1. Atualizar Roteiro Heurístico

Leia `padroes_perguntas.json` e veja quais perguntas **mais convertem**:

```javascript
// Em roteiro-heuristico.js
// Adicione as perguntas que mais converteram

this.perguntasQueConvertem = [
  // Top 3 do training
  'Como você acompanha o cliente depois da proposta?',
  'Você consegue saber se o cliente abriu?',
  'Qual é seu maior desafio com prospecção?'
];
```

### 2. Treinar Intent Classifier

Use `training_dataset_intent.jsonl` para melhorar:

```bash
# Esse dataset pode ser usado com ferramentas como:
# - TensorFlow/Keras
# - Hugging Face
# - scikit-learn
# - Spacy
```

### 3. Fine-tune de Gemini

Preparar dados para Gemini fine-tune:

```bash
# Google oferece API de fine-tune
# Format: .jsonl com {"input": "...", "output": "..."}

# Converter dataset:
node scripts/converter-para-gemini-finetuning.js
```

### 4. Análise Manual

Abrir `insights_conversao.json` e:
- Copiar respostas que converteram
- Identificar padrões de sucesso
- Atualizar instruções do bot

---

## 🔄 Pipeline Recomendado

```
1. Rodar treinamento a cada semana (quando houver + conversas)
2. Ler insights_conversao.json
3. Atualizar roteiro com top padrões
4. Medir taxa de conversão antes/depois
5. Repetir
```

**Exemplo de ciclo:**

```
Semana 1: train.js → Taxa de conversão 30%
Semana 2: Atualizar roteiro com padrões
Semana 3: train.js → Taxa de conversão 35% ✅
Semana 4: Atualizar instruções Gemini
Semana 5: train.js → Taxa de conversão 40% ✅✅
```

---

## 📊 Métricas Importantes

No arquivo `analise_completa.json`, monitor:

### Taxa de Conversão
```
(conversasQueConverteram / total) × 100
```

**Benchmark:**
- B2B: 10-15%
- B2C: 2-5%
- Com IA: 25-35%

### Palavras-chave que Convertem
Veja em `padroes_perguntas.json`:
```json
{
  "diagnóstico": { "conversaoRate": 40% },
  "proposta": { "conversaoRate": 36% },
  "acompanhar": { "conversaoRate": 42% }
}
```

Use essas nos primeiros turnos!

### Status dos Leads
```json
{
  "vendido": 158,           // ✅
  "qualificado": 150,       // ⚠️
  "nao_qualificado": 142    // ❌
}
```

**Otimizar:** Aumentar "qualificado" → "vendido"

---

## 🚀 Automação (Avançado)

### Rodar Treino Automaticamente

Adicionar ao `.env`:
```bash
TRAINING_ENABLED=true
TRAINING_SCHEDULE="0 0 * * 0"  # Toda semana, domingo 00:00
```

Depois na inicialização do backend:
```javascript
if (process.env.TRAINING_ENABLED === 'true') {
  const cron = require('node-cron');
  cron.schedule(process.env.TRAINING_SCHEDULE, async () => {
    console.log('🤖 Iniciando treinamento agendado...');
    await trainer.treinarCompleto();
    await trainer.gerarInsightsDeConversao();
  });
}
```

### Alertas de Taxa Baixa

```javascript
if (analise.conversaoRate < 20) {
  console.warn('⚠️ Taxa de conversão caiu para 20%!');
  // Enviar Slack, email, etc
}
```

---

## 🔍 Troubleshooting

### "Nenhuma conversa encontrada"
- Verifique se há dados na tabela `conversas` do banco
- Teste: `SELECT COUNT(*) FROM conversas;`

### "Erro ao conectar ao banco"
- Verifique `.env` (DB_HOST, DB_USER, DB_PASSWORD)
- PostgreSQL está rodando?

### Dataset muito pequeno
- Menos de 50 conversas = pouco dados
- Espere acumular mais dados (mínimo 100)

---

## 📝 Checklist

- [ ] Banco PostgreSQL tem conversas? (`SELECT COUNT(*) FROM conversas;`)
- [ ] `.env` configurado com DB_*?
- [ ] Rodar `node train.js` primeira vez
- [ ] Analisar `insights_conversao.json`
- [ ] Copiar top 5 padrões para roteiro
- [ ] Medir conversão antes/depois
- [ ] Agendar treinamento semanal
- [ ] Documentar padrões que funcionam

---

## 🎯 Próximas Versões

- [ ] Dashboard real-time de taxa de conversão
- [ ] A/B testing automático de padrões
- [ ] Fine-tune automático de Gemini
- [ ] Alertas quando taxa cai
- [ ] Sugestões automáticas de melhoria
- [ ] Ranking de perguntas por conversão

---

**Última atualização:** 2026-07-01  
**Versão:** 1.0  
**Status:** Pronto para usar
