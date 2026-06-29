# 🔑 Configurar Gemini API Key

## O que está acontecendo

O bot está funcionando **100%**, mas está usando fallback (modo roteiro) porque a chave Gemini é inválida.

```
⚠️ Gemini falhou; tentando novamente (API key not valid)
⚠️ Gemini indisponível; usando roteiro
```

Isso é **normal** e o sistema funciona, mas sem IA avançada.

## Como Configurar (5 minutos)

### Passo 1: Gerar Chave Gemini

1. Acesse: **https://aistudio.google.com/app/apikey**
2. Clique em "Create API Key"
3. Copie a chave gerada

### Passo 2: Atualizar .env

Abra o arquivo `.env` e localize a linha:

```ini
GEMINI_API_KEY=COLOQUE_SUA_CHAVE_GEMINI_AQUI
```

Substitua por (sem aspas):

```ini
GEMINI_API_KEY=AIzaSyD... (sua chave aqui)
```

### Passo 3: Reiniciar o Bot

```bash
# Pare o bot (Ctrl+C no terminal)
# Reinicie:
npm start
```

Deve aparecer agora:

```
ℹ️  Gemini ativo (gemini-2.5-flash)
✅ WhatsApp 1 conectado! Fezinha pronta!
```

### Passo 4: Testar

Envie uma mensagem para o contato:

```
📱 seu-numero: Oi
🤖 Fezinha: Oi, tudo bem? Aqui é Amanda, do FechaPro...
✅ Resposta enviada!
```

**Sem o erro de API key inválida!** ✅

---

## Se Não Tiver Conta Google

1. Crie uma em: https://accounts.google.com/signup
2. Volte para aistudio.google.com
3. Clique em "Create API Key"
4. Use a chave no `.env`

---

## Alternativa: Usar xAI (Grok)

Se preferir xAI em vez de Gemini:

### 1. Gerar Chave xAI

- Acesse: https://console.x.ai/
- Gere uma chave API

### 2. Atualizar .env

```ini
XAI_API_KEY=sua_chave_aqui
IA_PROVIDER=xai
```

### 3. Reiniciar

```bash
npm start
```

---

## Verificar se Está Funcionando

Depois de configurar, envie uma mensagem de teste:

**Esperado com IA:**
```
⚠️ Gemini falhou... (aparecerá UMA VEZ se reconectar)
🤖 Fezinha: [resposta inteligente gerada pela IA]
✅ Resposta enviada!
```

**Sem IA (fallback):**
```
⚠️ Gemini indisponível; usando roteiro
🤖 Fezinha: [resposta do script pré-definido]
✅ Resposta enviada!
```

---

## Checklist

- [ ] Chave Gemini gerada em aistudio.google.com
- [ ] Chave copiada para `.env` (GEMINI_API_KEY=...)
- [ ] Bot reiniciado (`npm start`)
- [ ] Mensagem de teste enviada
- [ ] Resposta gerada **SEM** erro de API key

---

Pronto! Seu bot agora tem IA completa! 🚀

Se ainda assim falhar, verifique:
1. Chave está correta (copie novamente)
2. Bot foi reiniciado (npm start)
3. Não há espaços em branco no .env
