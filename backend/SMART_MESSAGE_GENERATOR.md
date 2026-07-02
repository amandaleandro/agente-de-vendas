# 🧠 Smart Message Generator - Gerador Inteligente de Mensagens de Prospecção

Sistema determinístico (SEM IA) para gerar mensagens de prospecção **únicas e personalizadas** baseado em dados reais do Google Maps.

## 📊 Como Funciona

### 1. Análise do Lead
Para cada empresa no CSV, o sistema:
- Lê dados reais (Rating, Reviews, Segmento, Contato)
- Cria um **perfil único** baseado em comportamento
- Define **sentimento** (positivo, neutro, negativo, crítico)
- Calcula **intensidade** do pitch

### 2. Perfis Detectados Automaticamente

| Perfil | Condição | Abordagem |
|--------|----------|-----------|
| **consolidated** | Rating 4.5+, 30+ reviews | Foca em "manter excelência enquanto cresce" |
| **established** | Rating 3.5+, 30+ reviews | Foca em "próxima fase de crescimento" |
| **emerging** | Rating 3.5+, até 10 reviews | Foca em "consolidar essa base" |
| **needs_improvement** | Rating <3.5, 30+ reviews | Foca em "transformar volume em qualidade" |
| **struggling** | Rating <3.5, até 10 reviews | Foca em "reverter situação" |
| **invisible** | Sem avaliações | Foca em "aparecer digitalmente" |
| **critical** | Rating <1.0 | Foca em "mudança estratégica" |

### 3. Múltiplas Estruturas de Mensagem

Para CADA perfil, existem **6 estruturas diferentes**:

1. **Reconhecimento + Dados + Solução** - Elogia e oferece
2. **Observação + Dados + Gatilho + Solução** - Começa com insight
3. **Pergunta + Dados + Oportunidade + Proposta** - Estilo questionador
4. **Benchmark + Dados + Comparação + Solução** - Usa mercado como referência
5. **Problema + Validação + Solução** - Identifica dor
6. **Story + Dados + Parallelo + Solução** - Conta história de sucesso

A estrutura é **escolhida aleatoriamente** a cada mensagem, garantindo variedade.

### 4. Pool Dinâmico de Frases

Cada seção tem múltiplas variações:
- **5+ formas de começar** (abertura)
- **5+ formas de estruturar dados** (contexto)
- **5+ formas de descrever observação** (validação)
- **5+ soluções propostas** (proposta)
- **5+ CTAs diferentes** (chamada para ação)

Resultado: **Centenas de combinações possíveis** → Cada mensagem é única

## 🔌 Endpoints da API

### Gerar Mensagem Única
```bash
POST /api/prospeccion/gerar-mensagem
Content-Type: application/json

{
  "NomeÂ ": "Home Construtora",
  "AvaliaÃ§Ã£o": "5,0",
  "Quantidade de AvaliaÃ§Ãµes": "(9)",
  "Segmento da empresa": "Construtora",
  "Telefone": "(34) 99190-9854",
  "Site da empresa": "https://...",
  "EndereÃ§o da empresa": "..."
}

Response:
{
  "lead": {
    "nome": "Home Construtora",
    "rating": 5,
    "reviews": 9,
    "profile": "emerging",
    "sentiment": "positive"
  },
  "message": "Home Construtora! 👀\nNotei que tá decolando aí...",
  "profile": "emerging"
}
```

### Gerar Múltiplas Variações
```bash
POST /api/prospeccion/gerar-variacoes
Content-Type: application/json

{
  "lead": {...},
  "count": 3
}

Response:
{
  "lead": {...},
  "variations": [
    "Mensagem 1...",
    "Mensagem 2...",
    "Mensagem 3..."
  ],
  "count": 3
}
```

### Carregar CSV do Google Maps
```bash
GET /api/prospeccion/carregar-csv

Response:
{
  "total": 16,
  "leads": [...10 primeiros...],
  "mensagem": "Carregados 16 leads do Google Maps"
}
```

### Processar Lote
```bash
POST /api/prospeccion/processar-lote
Content-Type: application/json

{
  "csvPath": null,  // usa padrão: data/google.csv
  "limit": 50,
  "filterProfile": null  // ou "consolidated", "emerging", etc
}

Response:
{
  "processados": 10,
  "stats": {
    "total": 10,
    "byProfile": {
      "emerging": 2,
      "consolidated": 3,
      ...
    },
    "avgRating": 3.93,
    "avgReviews": 37
  },
  "exemplos": [...]
}
```

### Exportar para JSON/CSV
```bash
POST /api/prospeccion/exportar
Content-Type: application/json

{
  "csvPath": null,
  "formato": "json"  // ou "csv"
}

Response:
{
  "sucesso": true,
  "arquivo": "/path/to/file",
  "processados": 16,
  "mensagem": "16 mensagens exportadas em JSON"
}
```

### Gerar Relatório Completo
```bash
GET /api/prospeccion/relatorio

Response:
{
  "timestamp": "2026-07-02T...",
  "totalLeads": 16,
  "totalProcessados": 16,
  "profiles": {
    "emerging": 2,
    "consolidated": 3,
    "needs_improvement": 2,
    ...
  },
  "messages": [
    {
      "nome": "Home Construtora",
      "profile": "emerging",
      "rating": 5,
      "reviews": 9,
      "message": "..."
    },
    ...
  ]
}
```

## 🚀 Uso Prático

### Fluxo 1: Processar Todo CSV e Exportar
```javascript
// 1. Carrega CSV
GET /api/prospeccion/carregar-csv

// 2. Processa lote
POST /api/prospeccion/processar-lote
{ "limit": 1000 }

// 3. Exporta resultado
POST /api/prospeccion/exportar
{ "formato": "csv" }
```

### Fluxo 2: Gerar Várias Variações de Uma Empresa
```javascript
// 1. Pega empresa do CSV
const lead = leads[0];

// 2. Gera 5 variações
POST /api/prospeccion/gerar-variacoes
{ "lead": lead, "count": 5 }

// 3. Escolhe a melhor e envia
```

### Fluxo 3: Filtrar por Perfil
```javascript
// Pega apenas empresas "consolidated" (melhores para upsell)
POST /api/prospeccion/processar-lote
{ "filterProfile": "consolidated", "limit": 100 }

// Resultado: apenas os leads com perfil consolidado
```

## 📈 Exemplos de Mensagens Geradas

### Perfil: CONSOLIDATED (Rating 4.5+, 30+ reviews)
```
Achei incrível seu trabalho aqui no Google

com 94 avaliações e 5.0 ⭐

Isso é prova de excelência no trabalho de vocês.

Posso ajudar a vocês a escalar essa base de clientes com automação.

Quer conversar sobre como a gente pode crescer junto?
```

### Perfil: NEEDS_IMPROVEMENT (Rating <3.5, 30+ reviews)
```
Notei que vocês têm muita demanda

o volume é de 99 clientes, a avaliação tá em 2.4 ⭐

Só que acho que falta melhorar o acompanhamento.

Posso ajudar a transformar volume em satisfação.

Quer que a gente explore como melhorar isso?
```

### Perfil: EMERGING (Rating 3.5+, até 10 reviews)
```
Vi que vocês estão começando a aparecer

você conseguiu 9 avaliações com 5.0 ⭐

Que é um bom começo pra base.

Posso ajudar a vocês a crescer de verdade.

Tá interessado em explorar?
```

### Perfil: INVISIBLE (Sem avaliações)
```
Encontrei vocês por aqui

focando em Construtora

Mas vocês não tão aproveitando o potencial online.

Posso ajudar vocês a aparecer e crescer aqui.

Posso enviar um projeto inicial?
```

## 🎯 Diferenciais

✅ **Sem IA** - 100% determinístico (rápido, previsível, sem custos)  
✅ **Único por Lead** - Cada mensagem é diferente  
✅ **Parece Pesquisada** - Cita dados reais (rating, reviews, localização)  
✅ **Múltiplas Estruturas** - 6 formas diferentes de estruturar  
✅ **Pool de Frases** - Hundreds of variations  
✅ **Perfis Automáticos** - Detecta padrão do lead  
✅ **Escalável** - Processa 1000s de leads em segundos  
✅ **Exportável** - JSON ou CSV  

## 📂 Estrutura de Arquivos

```
backend/
├── modules/
│   ├── lead-analyzer.js         # Analisa dados e cria perfil
│   ├── phrases-pool.js          # Pool de frases por tipo
│   ├── message-structures.js    # 6 estruturas diferentes
│   ├── smart-generator.js       # Gerador principal
│   └── webserver.js             # Endpoints da API
├── data/
│   └── google.csv               # Planilha de leads
└── test-message-generator.js    # Script de teste
```

## 🧪 Testando Localmente

```bash
cd backend

# Teste completo
node test-message-generator.js

# Debug do CSV loader
node debug-csv.js

# Debug do analyzer
node debug-analyzer.js

# Teste do findKey
node test-find-key.js
```

## 💡 Próximas Melhorias

- [ ] Integração com WhatsApp para envio automático
- [ ] A/B Testing de estruturas de mensagem
- [ ] Análise de taxa de resposta por perfil
- [ ] Customização de templates por usuário
- [ ] Análise de sentimento dos comentários Google
- [ ] CRM sync com leads gerados
