# 🚀 COMECE AQUI - Guia Rápido

Siga estes passos **em ordem** para colocar o sistema funcionando.

---

## ⏱️ Tempo Total: ~15 minutos

---

## PASSO 1: Gerar Chaves Seguras (3 min)

### 1.1 Abra PowerShell e execute:
```powershell
cd "C:\Users\amandalscarmo\Documents\agente de vendas"
.\gerar-chaves.ps1
```

**Isso vai gerar uma chave API segura**. Copie o resultado.

### 1.2 Abra seu `.env` e cole:
```
PAINEL_API_KEY=COLE_A_CHAVE_AQUI
```

---

## PASSO 2: Gerar Chaves de IA (5 min)

### 2.1 Gemini (Google)
1. Acesse: https://aistudio.google.com/app/apikey
2. Clique em "Create API Key"
3. Copie a chave
4. Cole no `.env`:
```
GEMINI_API_KEY=COLA_AQUI
```

### 2.2 xAI (opcional - se quiser usar Grok)
1. Acesse: https://console.x.ai/
2. Gere uma chave API
3. Cole no `.env`:
```
XAI_API_KEY=COLA_AQUI
```

---

## PASSO 3: Limpar Sessões Antigas (2 min)

Se tiver erro 440 ao conectar WhatsApp:

```powershell
Remove-Item -Recurse -Force auth_info*
Remove-Item qrcode.txt -ErrorAction SilentlyContinue
```

---

## PASSO 4: Configurar WhatsApp (3 min)

No `.env`, deixe assim (apenas 1 número para começar):

```
WHATSAPP_NUMEROS=1
WHATSAPP_1_NOME=Seu Nome
WHATSAPP_1_ESTILO=seu estilo aqui
```

---

## PASSO 5: Iniciar o Servidor (1 min)

```powershell
npm start
```

Você vai ver:
```
✅ WhatsApp 1 conectado! Fezinha pronta!
Painel: http://localhost:3099
```

---

## PASSO 6: Escanear QR Code (2 min)

1. No terminal, vai aparecer um QR code
2. Abra WhatsApp no seu celular
3. Configurações → Dispositivos vinculados → Escanear QR
4. Escaneie o QR code

**Espere aparecer**: `✅ WhatsApp 1 conectado!`

---

## PASSO 7: Testar Importação de CSV (2 min)

1. Abra no navegador: http://localhost:3099
2. Clique em "Clique para selecionar sua planilha CSV"
3. Escolha um arquivo CSV pequeno para testar
4. Clique em "Carregar e conferir"

**Deve aparecer**: "X contatos válidos encontrados"

---

## ✅ Pronto!

Se chegou até aqui, tudo está funcionando! 🎉

---

## 🚨 Se Tiver Erro

### Erro 440 (Stream conflict)
```powershell
# Delete as sessões antigas
Remove-Item -Recurse -Force auth_info*
```
Reinicie e escaneie o QR code novamente.

### CSV não importa
- Verifique se tem coluna "Telefone" ou "WhatsApp"
- Verifique se os números começam com 55 ou têm formato válido
- Tente abrir em Notepad e verificar encoding UTF-8

### WhatsApp não conecta
- Verifique internet
- Verifique se WhatsApp está atualizado no celular
- Tente fazer logout e login novamente

### Erro na IA
- Verifique se as chaves API estão corretas
- Teste em https://aistudio.google.com/app/apikey se Gemini funciona

---

## 📚 Próximas Leituras

Depois de tudo funcionando, leia:

1. `RELATORIO-CORRECOES.md` - Entender o que foi corrigido
2. `SETUP-SEGURANCA.md` - Segurança e boas práticas
3. `PLAYBOOK-DE-VENDAS.md` - Como usar o sistema de vendas

---

## 💡 Dicas

- **Comece com 1 número** de WhatsApp antes de adicionar mais
- **Teste com CSV pequeno** (5 contatos) antes de usar dados reais
- **Deixe `PROSPECCAO_ATIVA=false`** enquanto está testando
- **Monitore o terminal** para ver o que está acontecendo

---

## 🆘 Precisa de Ajuda?

Verifique:
- Logs do terminal (erros aparecem lá)
- Console do navegador (F12)
- Arquivo `.env` (chaves corretas?)
- Conectividade de internet

---

**Status**: 🟢 Pronto para começar!

Boa sorte! 🚀
