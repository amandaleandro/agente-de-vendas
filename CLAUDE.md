# FechaPro - Agente de Vendas Automático

**Status**: Sistema de IA para prospecção e vendas via WhatsApp  
**Ambiente**: Node.js + React  
**Principal IA**: Gemini (com fallback para OpenAI/xAI)  
**DB**: PostgreSQL

---

## 🎯 O que é

Bot de vendas consultivo que:
- Conecta via WhatsApp (Baileys)
- Usa IA para gerar respostas naturais
- Faz prospecção automática de leads
- Diagnóstico interativo para qualificação
- Painel de controle para atendentes humanos

---

## 🏗️ Arquitetura

```
┌─ Backend (Node.js) ────────────────────┐
│  ├─ Conexão WhatsApp (Baileys)         │
│  ├─ IAs (Gemini/OpenAI/xAI)            │
│  ├─ Módulos especializados             │
│  └─ WebServer (painel + APIs)          │
└────────────────────────────────────────┘
         ↓ BD (PostgreSQL)
┌─ Frontend (React) ─────────────────────┐
│  ├─ Painel de atendimento              │
│  ├─ Configurações                      │
│  └─ Dashboard warmup/métricas          │
└────────────────────────────────────────┘
```

---

## 📚 Stack Tecnológico

**Backend**:
- `@whiskeysockets/baileys` - Conexão WhatsApp
- `@google/genai` - Gemini API
- `openai` - GPT-4o (fallback)
- `pg` - PostgreSQL driver
- `pino` - Logging estruturado

**Frontend**:
- React 18
- React Router
- Fetch API para comunicação

**Infrastructure**:
- Docker (opcional)
- PostgreSQL
- Variáveis de ambiente (.env)

---

## 🔧 Instalação & Setup

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install

# Start backend
npm start  # Port 3001

# Start frontend (outro terminal)
cd frontend
npm start  # Port 3000
```

**Arquivo .env necessário** (`backend/config/.env`):
```
# WhatsApp
WHATSAPP_1_NOME=Amanda
WHATSAPP_1_ESTILO=natural, cordial, breve

# IAs
GEMINI_API_KEY=xxx
GEMINI_MODEL=gemini-2.5-flash
IA_PROVIDER=gemini  # ou 'auto', 'openai', 'xai'

# OpenAI (opcional)
OPENAI_API_KEY=xxx
OPENAI_MODEL=gpt-4o

# xAI (opcional)
XAI_API_KEY=xxx
XAI_MODEL=grok-beta

# Database
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=xxx
DB_NAME=fechapro
DB_PORT=5432

# Prospecção
PROSPECCAO_ATIVA=true
PROSPECCAO_CSV=/path/to/leads.csv
PROSPECCAO_INTERVALO_MS=180000
```

---

## 📦 Módulos Principais

### Core
- **index.js** - Inicialização, conexão WhatsApp, loop principal de mensagens
- **webserver.js** - HTTP server, APIs REST, painel web

### IA & Resposta
- **roteiro-heuristico.js** - NLP local (fallback quando IA acaba tokens)
- **intent-classifier.js** - Classifica intenção da mensagem (preco, dúvida, opt-out)
- **gatilhos.js** - Respostas rápidas pré-programadas
- **nlp-local.js** - Processamento NLP simples

### Prospecção
- **prospeccao-historico.js** - Rastreia leads já prospectados
- **prospeccao-agenda.js** - Agenda de múltiplas planilhas
- **api-prospeccao.js** - APIs para gerenciar prospecção

### Warmup (aquecimento de número)
- **warmup.js** - Controla quota diária de envios
- **warm-conversation.js** - Conversas entre chips para parecer ativo
- **cross-warmup.js** - Cruza conversas entre sessões

### Gerenciamento
- **chat-store.js** - Armazena conversa no painel (só últimas msgs)
- **diagnostico-manager.js** - Questões e respostas do diagnóstico
- **diagnostico-prompt.js** - Formatter do diagnóstico para IA
- **tank.js** - Fila de mensagens em massa
- **followup-manager.js** - Agendamento de follow-ups

### Utilidades
- **logger.js** - Logs estruturados (Pino)
- **cache.js** - Cache em memória
- **metrics.js** - Coleta de métricas (respostas, envios)
- **security.js** - Validações de segurança
- **backup.js** - Backup de dados
- **ratelimit.js** - Rate limiting
- **csv.js** - Parser de CSV para leads
- **healthcheck.js** - Verificações de saúde

---

## 🚀 Fluxo Principal

### 1. Mensagem Chega
```
WhatsApp → Baileys → messages.upsert event
  ↓
Extrair texto, mídia, sender
  ↓
Verificar se é opt-out / atendimento humano
  ↓
Classificar intenção (intent-classifier)
  ↓
Se gatilho rápido → responder direto
  ↓
Gerar resposta com IA → salvar no historico
```

### 2. Prospecção
```
CSV → Carregar leads
  ↓
Filtrar já prospectados
  ↓
Para cada lead:
  - Verificar warmup (quota disponível)
  - Criar mensagem variada
  - Enviar via WhatsApp
  - Registrar histórico
```

### 3. Sistema de Fallback (3 níveis)
```
Tenta IA (Gemini) com temperature 0.65
  ↓ Se falhar quota
Tenta outra IA (xAI/OpenAI)
  ↓ Se falhar quota
Usa roteiro heurístico (NLP local)
  ↓ Se falhar
Resposta genérica amigável
```

---

## 🎛️ Configuração Importante

### Números WhatsApp Múltiplos
```env
WHATSAPP_1_NOME=Amanda
WHATSAPP_2_NOME=João
WHATSAPP_2_ESTILO=direto, profissional
BOT_NUMEROS_ATIVOS=1,2  # Quais números recebem IA
```

### IA em Modo Automático
```env
IA_PROVIDER=auto  # Alterna Gemini ↔ xAI quando uma falha
```

### Economizar Tokens
```env
GEMINI_MODEL=gemini-1.5-mini  # 10x mais barato
MAX_HISTORICO_POR_CONTATO=8   # Manter contexto
```

---

## 📊 Principais Endpoints API

### Warmup
- `GET /api/warmup` - Status dos números
- `POST /api/warmup/reset` - Reset diário

### Prospecção
- `GET /api/prospeccao/status` - Status atual
- `POST /api/prospeccao/start` - Iniciar
- `POST /api/prospeccao/stop` - Parar
- `POST /api/prospeccao/upload` - Upload CSV

### Chat (painel atendente)
- `GET /api/chat/:sessao/:telefone` - Histórico conversa
- `POST /api/chat/:sessao/:telefone/send` - Enviar mensagem
- `GET /api/chat/:sessao` - Todas conversas da sessão

### Diagnóstico
- `GET /api/diagnostico/:id` - Resultado diagnóstico

### Configuração
- `GET /api/config` - Ler config
- `POST /api/config` - Atualizar config

---

## 🛠️ Como Fazer Coisas Comuns

### Mudar Instruções da IA
**Arquivo**: `backend/index.js` (linha ~277)  
**Var**: `INSTRUCOES_GEMINI`  
⚠️ Não coloque mais de 2000 caracteres (afeta tokens)

### Adicionar Novo Gatilho
**Arquivo**: `backend/modules/gatilhos.js`  
Adicione nova chave em `gatilhosComVocabulos` ou `respondersComVocabulos`

### Aumentar/Diminuir Quota Diária
**Arquivo**: `backend/modules/warmup.js`  
**Var**: `quotasPadrao`  
```javascript
quotasPadrao: { 1: 50, 2: 40 }  // 50 msgs/dia sessão 1
```

### Adicionar Pergunta ao Diagnóstico
**Arquivo**: `backend/modules/diagnostico-manager.js`  
Insira nova pergunta no banco via painel

### Mudar Modelo de IA
**Arquivo**: `.env`
```env
GEMINI_MODEL=gemini-2.5-flash-preview-tts  # Com TTS
OPENAI_MODEL=gpt-4-turbo  # Mais rápido
```

---

## 🚨 Problemas Conhecidos & Soluções

### Bot Para de Responder Quando IA Acaba Tokens

**Causa**: Quota de API esgotada (Gemini/OpenAI)

**Solução Implementada**:
1. Sistema detecta erro (429, RESOURCE_EXHAUSTED)
2. Ativa "modo economia" por 1 hora
3. Reduz `maxOutputTokens` de 700 → 300
4. Vai direto para roteiro heurístico
5. Se roteiro falhar, responde mensagem genérica

**Como Monitorar**:
```
Logs: "⚠️⚠️⚠️ QUOTA EM PERIGO!"
      "💰 Modo economia de tokens ativo"
```

**Preventivo**:
- Use `GEMINI_MODEL=gemini-1.5-mini` (10x mais barato)
- Reduza `temperature` (mas mantém 0.65 para naturalidade)
- Use `IA_PROVIDER=auto` para alternar entre IAs

### Bot Soa Robótico / Repete Respostas

**Solução Recente**:
- Temperature aumentada: 0.3 → 0.65
- Histórico aumentado: 2 → 8 mensagens
- Instruções reescritas para soar humano
- Mensagens de prospecção agora têm 8+ variações

### Mensagens Chegam com LID (WhatsApp Business)

**Causa**: Números Business retornam LID ao invés de número real  
**Solução**: Código de resolução automática via stanzaId, cache e nome  
**Arquivo**: `backend/index.js` linhas ~1230-1300

### Conversa Fica Cortada no Painel

**Causa**: `MAX_HISTORICO_POR_CONTATO` muito pequeno (era 2)  
**Solução**: Aumentado para 8 (agora mantém 4 turnos)

---

## 📈 Melhorias Recentes

### v2.1 (Data: ~agora)
- ✅ Naturalidade: Instruções reescritas (sem emojis/estrutura rígida)
- ✅ Criatividade: Temperature 0.3 → 0.65
- ✅ Contexto: Histórico 2 → 8 mensagens
- ✅ Variação: Mensagens de prospecção agora com 8+ combos
- ✅ Proteção: Sistema triple de fallback contra falta de tokens
- ✅ Economia: Modo economia reduz tokens 70% quando quota baixa

### v2.0 (Anterior)
- ✅ Sistema de diagnóstico interativo
- ✅ Warmup com conversas cruzadas
- ✅ Múltiplos números WhatsApp
- ✅ Integração Gemini/OpenAI/xAI

---

## 🧠 Decisões Arquiteturais

### Por que Baileys?
- Open source, funciona sem emulador
- Conecta direto ao WhatsApp Web
- Não requer número comercial
- Fallback: usar WhatsApp Business API (custoso)

### Por que Temperature 0.65?
- 0.3 = previsível mas robótico
- 0.65 = criativo mas não incoerente
- 1.0+ = muito criativo, pode virar baboseira

### Por que Max Histórico = 8?
- 2 = muito pouco contexto (bot esquecia)
- 8 = 4 turnos de conversa (bom balanço)
- 20+ = começa a gastar muitos tokens

### Por que Triple Fallback?
- IA às vezes falha (quota, erro)
- Roteiro é determinístico, sempre responde
- Mensagem genérica é último porto seguro
- Garantia: nunca fica mudo

---

## 📝 Logging & Debug

### Ver Logs em Tempo Real
```bash
cd backend
npm start 2>&1 | grep -E "^📱|^✅|^❌|^⚠️"
```

### Logs Importantes
```
📱 {numero}: {mensagem}     → Mensagem recebida
✅ {numero}: {resposta}     → Resposta enviada
🤖 IA: {modelo}             → IA usada
💰 Modo economia            → Economia de tokens
❌ Fallback acionado        → Sem tokens
⚠️⚠️⚠️ QUOTA EM PERIGO       → Quota baixa
```

### Debug: Checar Histórico de um Contato
```bash
# No Node.js REPL conectado ao banco:
SELECT * FROM conversas WHERE lead_id = (
  SELECT id FROM leads WHERE telefone LIKE '%85999887766%'
) ORDER BY id DESC LIMIT 10;
```

---

## 🔒 Segurança

- API Keys nunca em logs (mascaradas com `****`)
- Rate limiting por IP
- Validação de entrada (tokens, telefone)
- Opt-out storage encriptado (simples JSON por enquanto)
- HTTPS em produção (env var)

---

## 📦 Deploy

### Docker
```bash
docker build -t fechapro-bot .
docker run --env-file .env -p 3001:3001 fechapro-bot
```

### Variáveis Críticas em Produção
```env
DB_HOST=remote-postgres-server
GEMINI_API_KEY=sk-...
NODE_ENV=production
PORT=3001
```

### Monitoramento
- Healthcheck: `GET /api/health`
- Métricas: `GET /api/metrics`
- Logs: Salva em `backend/logs/`

---

## 🎓 Próximos Passos (Se Houver)

- [ ] Cache de respostas boas (quando tokens acabam rápido)
- [ ] Integração com banco de dados de vendas (Pipedrive, HubSpot)
- [ ] Dashboard de analytics mais completo
- [ ] Testes automatizados (jest)
- [ ] Rate limiting mais inteligente por tipo de mensagem
- [ ] Suporte a múltiplos idiomas
- [ ] Modo "humano acompanha" (bot sinaliza quando humano está vendo)

---

## ⚡ Quick Reference

| Ação | Arquivo | O que Mudar |
|------|---------|-----------|
| Mudar tom do bot | `index.js` | `INSTRUCOES_GEMINI` |
| Adicionar gatilho | `modules/gatilhos.js` | `respondersComVocabulos` |
| Aumentar quota | `modules/warmup.js` | `quotasPadrao` |
| Trocar IA | `.env` | `IA_PROVIDER` |
| Economizar tokens | `.env` | `GEMINI_MODEL=gemini-1.5-mini` |
| Ajustar criatividade | `index.js` | `temperature` (0.3-1.0) |
| Aumentar contexto | `index.js` | `MAX_HISTORICO_POR_CONTATO` |
| Fallback IA | `index.js` | `gerarResposta()` catch block |

---

**Última atualização**: 2026-06-30  
**Mantenedor**: Amanda Carmo  
**Stack**: Node.js + React + PostgreSQL + Baileys + Gemini
