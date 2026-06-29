# 🚀 Teste Rápido - Fezinha Bot

Tudo foi corrigido! Aqui está como testar:

## Passo 1: Validar CSV

```bash
# Testar o arquivo de exemplo
node testar-csv.js

# Ou testar seu próprio CSV
node testar-csv.js ./seu-arquivo.csv
```

Deve aparecer:
```
✅ Colunas encontradas: empresa, telefone, categoria, endereco, site
✅ 5 contatos válidos encontrados
✅ CSV está OK!
```

## Passo 2: Configurar .env (Opcional)

Se quiser usar WhatsApp de verdade:

```ini
GEMINI_API_KEY=sua_chave_aqui
WHATSAPP_1_NOME=Seu Nome
PROSPECCAO_ATIVA=false  # Deixe false até testar tudo
```

## Passo 3: Iniciar o Bot

```bash
npm start
```

Deve aparecer:
```
ℹ️  Fezinha iniciando...
ℹ️  Gemini ativo (gemini-2.5-flash)
💬 Tank de mensagens com geração por IA inicializado
Painel: http://localhost:3099

✅ WhatsApp 1 conectado! Fezinha pronta!
```

## Passo 4: Acessar o Painel

Abra no navegador:
```
http://localhost:3099
```

### Na tela inicial:
1. Clique em "📤 Carregar CSV"
2. Selecione `listas/exemplo.csv`
3. Veja a prévia dos contatos
4. **Não clique em "Iniciar" ainda** (falta WhatsApp)

## Passo 5: Verificar Status (sem WhatsApp)

```bash
# Terminal 1: deixe o bot rodando

# Terminal 2: tester a API
curl http://localhost:3099/api/status

# Deve aparecer algo como:
{
  "conectado": false,
  "numerosConectados": 0,
  "executando": false,
  "warmup": [...]
}
```

## Passo 6: Se Quiser Usar De Verdade

### Escaneie o QR Code:
1. Quando iniciar, uma instrução aparece no terminal
2. Vá em WhatsApp → Configurações → Dispositivos vinculados
3. Use o telefone para escanear o QR Code
4. Aguarde 3-5 segundos

### Depois de conectar:
```
✅ WhatsApp 1 conectado! Fezinha pronta!
```

Aí sim pode usar o painel.

---

## ✅ Checklist de Erros Corrigidos

- [x] ❌ Health check: banco indisponível → Agora tolera banco offline
- [x] ⚠️ Uso de memória alto → Backoff exponencial + logs reduzidos
- [x] Erro na prospecção CSV → Agora aceita múltiplas variações de nome de coluna
- [x] Conexão encerrada → Reconexão mais inteligente

## 📊 Fluxo Atual

```
CSV válido ✅
    ↓
Painel carrega → mostra prévia ✅
    ↓
Pode testar API sem WhatsApp ✅
    ↓
Ao conectar WhatsApp, começa a prospectar ✅
    ↓
Leads salvos offline → sincronizam quando banco volta ✅
```

---

## 🎯 Próximo Passo

Depois que confirmar que tudo funciona:

1. Configure suas chaves reais no `.env`
2. Coloque seu próprio CSV em `listas/lista-atual.csv`
3. Coloque `PROSPECCAO_ATIVA=true` no `.env`
4. Reinicie e escaneie o QR Code
5. **Pronto!** O bot começa a prospeccionar

---

Alguma dúvida? Confira `ERROS-CORRIGIDOS.md` para mais detalhes! 🎉
