# 📞 Sistema de Prospecção - Documentação

## O Problema que foi Corrigido

**Antes:** O bot reinirava e enviava mensagens **novamente** para os mesmos contatos, causando:
- ❌ Spam involuntário
- ❌ Desperdício de crédito WhatsApp
- ❌ Perda de credibilidade

**Agora:** O bot **nunca** reenvia para contatos já prospectados! ✅

---

## 🔧 Como Funciona

### 1. **Arquivo de Histórico: `prospeccao_resultados.jsonl`**

Salvo em `backend/prospeccao_resultados.jsonl`

Cada linha é um JSON com informações do contato enviado:

```json
{
  "telefone": "5585988123456",
  "nome": "João Silva",
  "empresa": "Tech Solutions",
  "status": "enviado",
  "sessao": "fezinha-1",
  "mensagem": "Olá João! Tudo bem?",
  "data": "2026-06-29T16:45:30.123Z",
  "timestamp": 1719682930123
}
```

### 2. **Arquivo de Erros: `prospeccao_erros.jsonl`**

Salvo em `backend/prospeccao_erros.jsonl`

Registra tentativas de envio que falharam:

```json
{
  "telefone": "5585988123456",
  "nome": "João Silva",
  "status": "erro",
  "erro": "Failed to send message",
  "sessao": "fezinha-1",
  "data": "2026-06-29T16:45:30.123Z"
}
```

### 3. **Carregamento na Inicialização**

Quando o bot inicia:
1. Lê `prospeccao_resultados.jsonl`
2. Carrega todos os contatos enviados com sucesso em **memória** (rápido)
3. Filtra automaticamente a lista CSV
4. Envia **apenas para contatos novos**

```
Inicializando...
✅ Histórico carregado: 245 contatos já prospectados
📞 Enviando apenas para 12 contatos novos (245 já foram prospectados)
```

---

## 📊 Usando o Histórico

### Ver Relatório de Prospecção

```javascript
// No código, acessar:
prospeccaoHistorico.obterRelatorio()

// Retorna:
{
  total_prospectados: 245,
  enviados: 243,
  erros: 2,
  taxa_sucesso: "99.2%"
}
```

### Exportar Relatório em JSON

```javascript
prospeccaoHistorico.exportarRelatorio()

// Cria: backend/relatorio_prospeccao.json
```

### Verificar se Contato Já Foi Prospectado

```javascript
if (prospeccaoHistorico.jaFoiProspectado('5585988123456')) {
  console.log('Já foi prospectado');
}
```

### Filtrar Apenas Leads Novos

```javascript
const leadsNovos = prospeccaoHistorico.filtrarLeadsNovos(meusCsvLeads);
console.log(`${leadsNovos.length} contatos novos para enviar`);
```

---

## ⚙️ Configuração

### Arquivo CSV de Prospecção

Coloque em `backend/listas/` e configure:

```env
# .env
PROSPECCAO_CSV=./listas/sua-lista.csv
PROSPECCAO_ATIVA=false              # true para enviar, false para apenas prévia
PROSPECCAO_INTERVALO_MS=180000      # 3 min entre contatos
PROSPECCAO_POR_LOTE=5               # Contatos por batch
```

### Formato do CSV

```csv
telefone,nome,empresa,categoria
5585988123456,João Silva,Tech Solutions,empresário
5585988234567,Maria Santos,Consultoria XYZ,profissional
5585988345678,Pedro Costa,Indústria ABC,gerente
```

**Colunas aceitas:**
- `telefone` (obrigatório) - ou `phone`, `celular`, `whatsapp`
- `nome` - ou `name`
- `empresa` - ou `company`, `organizacao`
- `categoria` - tipo de contato

---

## 🚀 Workflow Completo

```
1. Preparar CSV
   └─ backend/listas/meus-contatos.csv

2. Configurar .env
   └─ PROSPECCAO_CSV=./listas/meus-contatos.csv
   └─ PROSPECCAO_ATIVA=false (começa em prévia)

3. Iniciar bot
   └─ ./start.sh ou start.bat

4. Ver prévia (PROSPECCAO_ATIVA=false)
   └─ ✅ Carregado histórico: 245 contatos já prospectados
   └─ 📞 Enviando apenas para 12 contatos novos

5. Ativar envio real
   └─ PROSPECCAO_ATIVA=true
   └─ Reiniciar bot
   └─ npm start

6. Monitorar
   └─ Ver logs em tempo real
   └─ Cada envio é registrado em prospeccao_resultados.jsonl

7. Análise
   └─ Gerar relatório: prospeccaoHistorico.exportarRelatorio()
   └─ Abrir relatorio_prospeccao.json
```

---

## 📈 Relatório de Exemplo

Arquivo `relatorio_prospeccao.json`:

```json
{
  "data_geracao": "2026-06-29T16:50:00.000Z",
  "resumo": {
    "total_prospectados": 257,
    "enviados": 255,
    "erros": 2,
    "taxa_sucesso": "99.2%"
  },
  "contatos_prospectados": [
    {
      "telefone": "5585988123456",
      "enviado_em": "2026-06-28T15:23:45.000Z",
      "status": "enviado",
      "sessao": "fezinha-1"
    },
    {
      "telefone": "5585988234567",
      "enviado_em": "2026-06-28T15:26:12.000Z",
      "status": "enviado",
      "sessao": "fezinha-1"
    }
    // ... mais contatos
  ]
}
```

---

## 🔴 Limpando Histórico (Use com Cuidado!)

Se precisar **limpar todo o histórico** (para testar ou resetar):

```javascript
prospeccaoHistorico.limparHistorico()

// Deleta:
// - backend/prospeccao_resultados.jsonl
// - backend/prospeccao_erros.jsonl
// - Limpa memória
```

⚠️ **Cuidado:** Isso vai permitir reenvio para os mesmos contatos!

---

## 🐛 Troubleshooting

### "Histórico não está sendo salvo"

1. Verificar se `backend/prospeccao_resultados.jsonl` existe
2. Verificar permissões de escrita em `backend/`
3. Ver logs para erros de I/O

### "Bot não pula contatos já enviados"

1. Verificar se o arquivo histórico ainda existe
2. Verificar se `PROSPECCAO_ATIVA=true`
3. Checar logs de carregamento: `✅ Histórico carregado: X contatos`

### "Muitos erros em prospeccao_erros.jsonl"

1. Verificar formato do CSV (telefones válidos?)
2. Verificar rate limit (PROSPECCAO_INTERVALO_MS)
3. Verificar conexão WhatsApp
4. Verificar warmup (não enviar muito rápido)

---

## 📝 Resumo das Mudanças

| Antes | Depois |
|-------|--------|
| ❌ Reenviava para mesmos contatos | ✅ Pula contatos já enviados |
| ❌ Sem histórico persistente | ✅ Salva em `prospeccao_resultados.jsonl` |
| ❌ Perdia dados ao reiniciar | ✅ Carrega histórico na inicialização |
| ❌ Sem relatórios | ✅ Gera relatórios JSON |
| ❌ Sem tracking de erros | ✅ Registra erros separados |

---

## 🎯 Próximos Passos

1. ✅ Preparar seu CSV em `backend/listas/`
2. ✅ Configurar `.env` com `PROSPECCAO_CSV` correto
3. ✅ Testar em modo prévia (`PROSPECCAO_ATIVA=false`)
4. ✅ Ativar envio (`PROSPECCAO_ATIVA=true`)
5. ✅ Monitorar logs
6. ✅ Gerar relatório com `exportarRelatorio()`

---

**Bot pronto para prospecção em produção! 🚀**
