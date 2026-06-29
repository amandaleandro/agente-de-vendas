# 🧪 Como Testar SEM Prospecção Real

Modo "preview" para visualizar tudo sem enviar mensagens de verdade.

---

## ✅ Pré-requisitos

```bash
# Instalar dependências
cd backend
npm install

# Verificar .env
cat config/.env
```

---

## 🚀 Iniciar em Modo Preview

### Opção 1: Direto do Backend

```bash
cd backend
PROSPECCAO_ATIVA=false npm start
```

Ou edite `backend/config/.env`:

```env
PROSPECCAO_ATIVA=false
PROSPECCAO_AGENDA_ATIVA=false
```

Depois:
```bash
npm start
```

### Opção 2: Usar start.sh

```bash
./start.sh
```

Dirá automaticamente que está em modo preview.

---

## 📊 O que Você Verá

### Terminal
```
✅ Histórico carregado: 0 contatos já prospectados
📞 Enviando apenas para 15 contatos novos (0 já foram prospectados)

Prospecção: 15 contatos válidos encontrados em ./listas/exemplo.csv
Prévia: 
[
  { nome: 'João Silva', telefone: '5585988123456', categoria: 'empresário' },
  { nome: 'Maria Santos', telefone: '5585988234567', categoria: 'profissional' }
]

Prospecção em modo de prévia. Defina PROSPECCAO_ATIVA=true para enviar.
```

### Frontend (http://localhost:3099)

- ✅ Dashboard carregando
- ✅ WhatsApp conectado
- ✅ Painel web acessível
- ❌ NÃO vai enviar mensagens

### Frontend de Agenda (http://localhost:3099/agenda.html)

- ✅ Pode fazer upload de CSVs
- ✅ Pode clicar "Iniciar"
- ✅ Vai simular a execução
- ❌ NÃO vai enviar mensagens reais

---

## 🔄 Teste Completo (Sem Envios)

### 1. Inicie o bot

```bash
./start.sh
```

Aguarde:
```
✅ SERVIDOR WEB E API RODANDO EM http://localhost:3099
✅ WhatsApp 1 conectado! Fezinha pronta!
✅ Prospecção agendada iniciada (verifica a cada 30 segundos)
```

### 2. Abra o painel principal

```
http://localhost:3099
```

Verá:
- Status do WhatsApp ✅
- Dashboard com dados
- Painéis funcionando

### 3. Teste upload de CSV

```
http://localhost:3099/agenda.html
```

Faça:
1. Selecione 1-3 CSVs de teste
2. Clique "Enviar Arquivos"
3. Veja aparecer na fila
4. Clique "Iniciar Prospecção"
5. Veja simular a execução
6. **IMPORTANTE: Não vai enviar nada de verdade**

### 4. Veja status em tempo real

Acompanhe:
- Planilha em execução
- Progresso
- Queue
- Relatório

### 5. Exporte relatório (fictício)

Clique "Exportar Relatório" e baixe `relatorio_agenda.json`

---

## 🛑 Parar o Bot

Pressione `Ctrl+C` no terminal

```
^C
✅ Bot parado
```

---

## ⚙️ Configurações para Preview

### .env (backend/config/.env)

```env
# ⚠️ IMPORTANTE: NÃO vai enviar
PROSPECCAO_ATIVA=false

# Desativar agenda
PROSPECCAO_AGENDA_ATIVA=false

# Usar WhatsApp real (vai conectar!)
WHATSAPP_NUMEROS=1

# IA
GEMINI_API_KEY=AIzaSy...  # Pode deixar placeholder
```

---

## 🎯 O que Você Pode Testar

✅ **Interface Web**
- Acessar painéis
- Ver status
- Verificar design

✅ **Painel de Agenda**
- Upload de CSVs
- Visualizar fila
- Ver progresso simulado
- Exportar relatório

✅ **API de Prospecção**
- GET `/api/prospeccao/status`
- POST `/api/prospeccao/upload`
- GET `/api/prospeccao/relatorio`

✅ **WhatsApp Connection**
- Conecta ao WhatsApp
- Mostra QR Code
- Valida que está pronto

❌ **NÃO Testa**
- Envio de mensagens reais
- Respostas automáticas
- Interações com contatos

---

## 🔍 Verificar Componentes

### WhatsApp conectado?

```
http://localhost:3099/api/whatsapp-status
```

Esperado:
```json
{
  "status": [
    {
      "sessao": "fezinha-1",
      "nome": "Fezinha",
      "conectado": true,
      "temQR": false
    }
  ],
  "total": 1,
  "conectados": 1,
  "conectado": true
}
```

### Status da agenda?

```
http://localhost:3099/api/prospeccao/status
```

Esperado:
```json
{
  "total_planilhas": 0,
  "concluidas": 0,
  "total_contatos": 0,
  "total_enviados": 0,
  "total_erros": 0,
  "planilha_atual": null
}
```

### Servidor web rodando?

```bash
curl http://localhost:3099/index.html
```

Esperado: HTML da página

---

## 📝 Logs Úteis

### Ver logs de inicialização

```bash
npm start 2>&1 | tee logs.txt
```

### Filtrar por prospecção

```bash
npm start 2>&1 | grep -i prospec
```

### Ver apenas erros

```bash
npm start 2>&1 | grep "❌"
```

---

## 🐛 Debug

### Se não conectar ao WhatsApp

```bash
# Verificar .env
cat backend/config/.env | grep WHATSAPP

# Verificar node_modules
ls backend/node_modules/@whiskeysockets/

# Reinstalar
cd backend && npm install @whiskeysockets/baileys
```

### Se painel não carregar

```bash
# Verificar porta 3099
lsof -i :3099

# Matar processo se necessário
kill -9 <PID>

# Tentar porta diferente (editar webserver.js)
```

### Se API não responde

```bash
# Testar com curl
curl -X GET http://localhost:3099/api/prospeccao/status

# Verificar logs do bot
```

---

## 🎊 Checklist de Teste

```
□ npm install completou sem erros
□ Bot inicia sem erros
□ WhatsApp conecta e mostra QR
□ http://localhost:3099 carrega
□ http://localhost:3099/agenda.html carrega
□ Upload de CSV funciona
□ Fila aparece na interface
□ Status atualiza em tempo real
□ Relatório pode ser exportado
□ Pausar/Resumir funcionam
□ Nenhuma mensagem foi enviada (✓)
```

---

## ✨ Próximos Passos (Quando Quiser Enviar de Verdade)

1. Editar `backend/config/.env`:
```env
PROSPECCAO_ATIVA=true  # ← Muda para true
PROSPECCAO_AGENDA_ATIVA=true
```

2. Adicionar CSVs reais em `backend/listas/`

3. Iniciador bot

4. Upload das planilhas no frontend

5. Clicar "Iniciar" e assistir funcionar!

---

**Sistema pronto para visualização e teste seguro! 🚀**
