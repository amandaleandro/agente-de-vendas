# 🔥 Guia de Warmup para Números WhatsApp

## O que é Warmup?

Warmup é um sistema automático que **aquece gradualmente** seus números de WhatsApp para evitar bloqueios por spam. Começa com poucos envios e aumenta dia a dia, monitorando erros.

## Como Funciona

### Níveis de Aquecimento

| Nível | Dias | Limite/dia | Status |
|-------|------|-----------|--------|
| ❄️ Novo | 1-2 | 10 msgs | Primeira vez conectando |
| 🧊 Nível 1 | 2 dias | 10 msgs | Primeiros dias |
| ❓ Nível 2 | 3-4 dias | 20 msgs | Aumentando volume |
| 🔥 Nível 3 | 5-6 dias | 50 msgs | Aceleração |
| 🚀 Nível 4 | 7+ dias | 100 msgs | Aquecido |
| ⚡ Completo | 7+ dias, 0 erros | 200 msgs | Sem restrições |

### Proteções Automáticas

✅ **Erros consecutivos**: Se há muitas rejeições, o sistema reduz a velocidade
✅ **Limite diário**: Cada número respeita sua quota (nunca supera)
✅ **Distribuição inteligente**: Usa múltiplos números para acelerar prospecção
✅ **Persistência**: Histório salvo em `warmup_stats.jsonl`

## Como Usar

### 1. Verificar Status do Warmup

**Via Terminal** (durante execução):
```bash
npm start
# Mostra status a cada início da prospecção
```

**Via API**:
```bash
curl http://localhost:3099/api/warmup
```

Resposta:
```json
[
  {
    "sessao": 1,
    "nivel": 4,
    "nivelTexto": "🚀 Nível 4 (100/dia)",
    "enviados": 45,
    "quota": 100,
    "erros": 2,
    "consecutivos": 0,
    "diasAtivos": 7,
    "podeEnviar": true
  }
]
```

### 2. Iniciar Prospecção com Warmup

```bash
# 1. Carregue um CSV com seus leads
# Via painel: http://localhost:3099 → Upload da lista

# 2. Defina no .env:
echo "PROSPECCAO_ATIVA=true" >> .env

# 3. Inicie a prospecção:
curl -X POST http://localhost:3099/api/iniciar
```

**O sistema fará automaticamente**:
- Respeitar quota de cada número
- Pular para outro número se um atingir limite
- Registrar sucessos e erros
- Aumentar quota a cada dia sem problemas

### 3. Monitorar Emails (Opcional)

Crie uma cron job para checar status:
```bash
# Adicione no seu crontab:
0 8 * * * curl -s http://localhost:3099/api/warmup | jq '.' > /tmp/warmup.json
```

### 4. Resetar Manual (Se Necessário)

Se precisar resetar um número por algum motivo:
```bash
# Edite warmup_stats.jsonl ou delete e comece novamente
rm warmup_stats.jsonl
npm start  # Começa do zero
```

## Exemplos Reais

### Cenário 1: Um número, 5 dias

**Dia 1**: 10 mensagens máximo
**Dia 2**: 10 mensagens (se 0 erros)
**Dia 3**: 20 mensagens
**Dia 4**: 20 mensagens
**Dia 5**: 50 mensagens

Total em 5 dias = 110 leads (sem erros)

### Cenário 2: Três números, 3 dias

Com warmup distribuído:
- **Sessão 1**: 10 msgs/dia = 30 total
- **Sessão 2**: 10 msgs/dia = 30 total
- **Sessão 3**: 10 msgs/dia = 30 total

Total em 3 dias = **90 leads em paralelo** ✨

### Cenário 3: Erros Detectados

Se sessão 1 tiver 4+ erros consecutivos:
- ⚠️ Pausa por 1 minuto
- Reduz a 10 msgs/dia (resetar nível)
- Monitora próximos envios

## Arquivos Gerados

- `warmup_stats.jsonl` → Histórico de todas as tentativas
- `prospeccao_resultados.jsonl` → Leads + resultado
- `leads_pendentes.jsonl` → Fallback se banco ficar off

## Dicas Importantes

⚠️ **NÃO fazer**:
- Conectar múltiplos números em segundos (espere 30s entre eles)
- Começar com 1000 mensagens no dia 1
- Ignorar erros (WhatsApp bloqueia contas agressivas)

✅ **Fazer**:
- Deixar o warmup rodar naturalmente por 7 dias
- Monitorar `/api/warmup` diariamente
- Testar com 10 contatos primeiro
- Aumentar CSV apenas após 3 dias de sucesso

## Campos no Status

```json
{
  "sessao": 1,              // Número WhatsApp (1, 2, 3...)
  "nivel": 4,               // Fase de warmup (1-5)
  "nivelTexto": "🚀...",   // Descrição do nível
  "enviados": 45,           // Msgs enviadas hoje
  "quota": 100,             // Limite de hoje
  "erros": 2,               // Total de erros
  "consecutivos": 0,        // Erros seguidos (0 = tá bom!)
  "diasAtivos": 7,          // Quantos dias este número está ativo
  "podeEnviar": true        // Pode enviar agora?
}
```

## Troubleshooting

**Pergunta**: Por que parou de enviar?
**Resposta**: Rodou `/api/warmup` para ver status. Alguma sessão atingiu limite.

**Pergunta**: Mudou de um número para outro durante envio?
**Resposta**: Sim! Sistema detectou que sessão estava full, pulou para outra.

**Pergunta**: Como resetar tudo?
**Resposta**: Delete `warmup_stats.jsonl` e reinicie. Começa do zero.

---

🚀 Seu sistema está pronto para escalar sem riscos! Deixe rodar.
