# 🤖 Fezinha - Agente de Vendas com Baileys

## ⚡ Começar em 3 passos

### 1️⃣ Instale Node.js (se não tiver)
- Baixe em: https://nodejs.org (LTS)
- Instale normalmente

### 2️⃣ Abra terminal na pasta do projeto

No Windows PowerShell:
```powershell
cd "C:\Users\amandalscarmo\Documents\agente de vendas"
```

### 3️⃣ Rode os comandos

```bash
npm install
npm start
```

---

## 📱 O que vai acontecer

1. Terminal mostra **QR Code**
2. Abra WhatsApp no seu celular
3. **Configurações → Dispositivos vinculados**
4. **Vincule um dispositivo**
5. **Escaneie o QR Code** com a câmera

Pronto! A Fezinha está ativa no seu número! 🚀

---

## 💬 Como funciona

Quando alguém mandar mensagem no WhatsApp para o seu número, a Fezinha vai:
1. Receber a mensagem
2. Gerar uma resposta automática
3. Salvar tudo no banco de dados (VPS)
4. Responder na hora

---

## 🛑 Para parar

Aperte **Ctrl + C** no terminal

---

## 📌 Configuração

O arquivo `.env` tem os dados do banco:
- **DB_HOST**: IP da VPS (191.252.208.234)
- **DB_USER**: Usuário postgres
- **DB_PASSWORD**: Senha postgres
- **DB_NAME**: Nome do banco (fechapro)

**Não mude nada!** Tá tudo pronto.

---

## ⚠️ Importante

- O computador precisa estar **ligado** para a Fezinha funcionar
- A internet precisa estar estável
- O WhatsApp no seu celular vai dizer "Este dispositivo"

---

**Tá tudo pronto! Só rodar e escanear o QR Code!** 📲

## Prospecção por lista CSV

Para usar mais de um número, defina `WHATSAPP_NUMEROS=2` no `.env`. O terminal mostrará um QR Code identificado para cada sessão, e os leads serão distribuídos entre os números conectados.

### Pela tela (recomendado)

Rode `npm start` e abra `http://localhost:3099`. Escolha o CSV, clique em **Carregar e conferir** e revise a amostra. Depois, clique em **Iniciar prospecção**.

No `.env`, informe o caminho da lista e comece com a prévia:

```env
PROSPECCAO_CSV=C:\\Users\\seu-usuario\\Desktop\\lista.csv
PROSPECCAO_ATIVA=false
PROSPECCAO_INTERVALO_MS=180000
```

Rode `npm start`. O terminal mostra uma amostra sem enviar. Após conferir, altere `PROSPECCAO_ATIVA=true` e reinicie. O agente verifica o WhatsApp, envia no máximo 20 mensagens por hora e registra tudo em `prospeccao_resultados.jsonl`.
