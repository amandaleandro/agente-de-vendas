# 💬 Guia de Tank de Mensagens Personalizadas

## O que é o Tank?

**Tank** é um sistema de fila de mensagens onde cada contato recebe **suas próprias mensagens diferentes**, uma por minuto. Perfeito para:

- ✅ Sequências de follow-up personalizadas
- ✅ Campanhas de múltiplos toques
- ✅ Mensagens escalonadas por contato
- ✅ Respeita warmup (não gera spam)

## Formato do CSV

### Opção 1: Mensagens Pré-definidas

```csv
telefone,mensagem1,mensagem2,mensagem3
5511999999999,Oi tudo bem?,Como vai?,Tem interesse?
5511988888888,Olá!,Você conhece nossa solução?,Vamos conversar?
```

### Opção 2: Gerar com IA (Recomendado!) ⭐

```csv
telefone,nome,empresa,categoria,endereco
5511999999999,João Silva,Silva Serviços,Encanador,São Paulo - SP
5511988888888,Maria Santos,Santos Clean,Limpeza,Rio de Janeiro - RJ
```

A IA vai gerar automaticamente 3 mensagens personalizadas para cada contato!

### Detalhes Importantes

- **Coluna telefone**: `telefone`, `whatsapp` ou `phone` (qualquer um funciona)
- **Mensagens**: quantas quiser! (1, 2, 3, 10...)
- **Formato**: CSV padrão (vírgula separada)
- **Telefone**: Aceita com ou sem formatação (vai normalizar)

### Exemplo Completo (Campanha 3-toques)

```csv
telefone,primeiro_toque,segundo_toque,terceiro_toque,fechamento
5511999999999,Oi! Tudo bem?,Vi seu perfil e achei interessante,Você já conhece o FechaPro?,Posso agendar uma call rápida?
5511988888888,Olá!! Como vai?,Trabalha com serviços?,Temos algo que pode ajudar,Chama no privado?
5511977777777,E aí! Beleza?,Quantos orçamentos você manda por semana?,O FechaPro pode triplicar sua eficiência,Quer testar?
```

## Como Usar

### Opção A: Geração Automática com IA (Fácil!) 🤖

#### 1. Preparar CSV com dados dos contatos

```csv
telefone,nome,empresa,categoria,endereco
5511999999999,João Silva,Silva Serviços,Encanador,São Paulo
5511988888888,Maria Santos,Santos Clean,Limpeza,Rio de Janeiro
5511977777777,Pedro Costa,Costa Elétrica,Eletricista,Belo Horizonte
```

Colunas necessárias:
- `telefone` (obrigatório)
- `nome`, `empresa`, `categoria`, `endereco` (opcionais, mas usados para personalizar)

#### 2. Enviar para geração

```bash
curl -X POST http://localhost:3099/api/tank/gerar \
  -H "Content-Type: application/json" \
  -d "{\"conteudo\":\"$(cat contatos.csv | jq -Rs .)\"}"
```

**O que acontece**:
- ✅ IA lê nome, empresa, categoria
- ✅ Gera 3 mensagens personalizadas para cada um
- ✅ Carrega no tank automaticamente
- ✅ Já começa a enviar (1 msg/min por contato)

#### 3. Monitorar

```bash
curl http://localhost:3099/api/tank/status
```

---

### Opção B: Mensagens Pré-definidas (Manual)

#### 1. Preparar o CSV

Crie um arquivo `seguimento.csv`:

```bash
cat > seguimento.csv << 'EOF'
telefone,mensagem1,mensagem2,mensagem3
5511999999999,Oi tudo bem?,Como vai?,Tem interesse?
5511988888888,Olá!,Você conhece nossa solução?,Vamos conversar?
EOF
```

### 2. Carregar no Tank (via API)

```bash
curl -X POST http://localhost:3099/api/tank/carregar \
  -H "Content-Type: application/json" \
  -d @- << 'EOF'
{
  "conteudo": "$(cat seguimento.csv | jq -Rs .)"
}
EOF
```

Ou via Node.js:

```bash
node -e "
const fs = require('fs');
const csv = fs.readFileSync('seguimento.csv', 'utf8');
const payload = { conteudo: csv };
console.log(JSON.stringify(payload));
" | curl -X POST http://localhost:3099/api/tank/carregar -d @-
```

### 3. Monitorar Status

```bash
# Ver quantas mensagens estão na fila
curl http://localhost:3099/api/tank/status

# Ver próximas mensagens para enviar
curl http://localhost:3099/api/tank/fila
```

Resposta:

```json
{
  "totalContatos": 2,
  "totalMensagens": 6,
  "enviadas": 0,
  "pendentes": 6,
  "contatos": [
    {
      "telefone": "5511999999999",
      "total": 3,
      "enviadas": 0,
      "pendentes": 3,
      "erros": 0,
      "temProxima": true,
      "podeEnviarAgora": true,
      "proximaEm": 0
    }
  ]
}
```

### 4. Iniciar o Tank

```bash
curl -X POST http://localhost:3099/api/tank/iniciar
```

O sistema automaticamente vai:
- ✅ Enviar uma mensagem por minuto por contato
- ✅ Respeitar quotas de warmup
- ✅ Pular para outro número se um atingir limite
- ✅ Registrar sucessos/erros
- ✅ Parar quando terminar

## Fluxo de Envio

```
Contato A: Msg 1 → 1 min → Msg 2 → 1 min → Msg 3 ✅
Contato B: Msg 1 → 1 min → Msg 2 → 1 min → Msg 3 ✅
(Em paralelo, respeitando warmup de cada número)
```

## Exemplos Reais

### Cenário 1: Campanha de Follow-up (3 toques)

```csv
telefone,contato_inicial,follow_up_dia2,follow_up_dia3
5511999999999,Oi! Vi seu perfil,Vamos conversar?,Clica aqui: link
5511988888888,Olá! Tudo bem?,Ficou interessado?,Chama que explico
```

**Resultado**: 
- Contato A recebe 3 msgs (1 por minuto)
- Contato B recebe 3 msgs (1 por minuto)
- Total: 6 mensagens em ~3 minutos

### Cenário 2: Prospecting em Lote com Warmup

```csv
telefone,primeira_mensagem,segunda_mensagem,terceira_mensagem
5511999999999,Oi tudo bem?,Como vai?,Tem interesse?
5511988888888,Olá!,Conhece nossa solução?,Quer conversar?
5511977777777,E aí!,Você trabalha com serviços?,Temos algo para você
```

**Com Warmup**:
- Dia 1-2: 10 msgs/hora/número = ~1-2 contatos
- Dia 3-4: 20 msgs/hora/número = ~3-4 contatos
- Dia 7+: 100 msgs/hora/número = 15-20 contatos

### Cenário 3: Fila Grande (1000 contatos)

```csv
telefone,msg1,msg2,msg3,msg4,msg5
5511999999999,oi,tudo bem?,como vai?,tem interesse?,chama!
5511988888888,ola,beleza?,vc conhece?,ja usa?,vamo conversar?
... (1000 contatos)
```

**Com 3 números de WhatsApp**:
- Contato 1-333: Número 1
- Contato 334-666: Número 2
- Contato 667-1000: Número 3

Sistema distribui automaticamente e respeita quotas.

## Monitoramento

### Via API

```bash
# Status em tempo real
watch -n 5 'curl -s http://localhost:3099/api/tank/status | jq ".enviadas, .pendentes"'
```

### Via Terminal

Ao rodar o app, você verá:

```
💬 Tank: 5511999999999 (1/3)
💬 Tank: 5511988888888 (1/3)
💬 Tank: 5511999999999 (2/3)
⏸️  Todos os números atingiram limite. Tank aguardando...
💬 Tank: 5511999999999 (3/3)
✅ Tank finalizado!
```

## Limpeza

### Remover mensagens já enviadas

```bash
curl -X POST http://localhost:3099/api/tank/limpar
```

Isso deleta do histórico mas mantém os registros em `fila_mensagens.jsonl`.

## Arquivos Gerados

- `fila_mensagens.jsonl` → Histórico de todas as mensagens
- Formato: `{"telefone", "conteudo", "enviado", "enviado_em", "erro"}`

## Campos do Status

```json
{
  "totalContatos": 2,           // Quantos contatos têm mensagens
  "totalMensagens": 6,          // Total de msgs na fila
  "enviadas": 0,                // Já enviadas
  "pendentes": 6,               // Aguardando envio
  "contatos": [
    {
      "telefone": "5511999999999",
      "total": 3,                // Msgs deste contato
      "enviadas": 0,             // Ja enviadas
      "pendentes": 3,            // Faltam enviar
      "erros": 0,                // Erros neste contato
      "temProxima": true,        // Tem msg pronta?
      "podeEnviarAgora": true,   // Pode enviar no próximo ciclo?
      "proximaEm": 0             // Quantos ms até próxima (0 = já)
    }
  ]
}
```

## Dicas Importantes

✅ **Fazer**:
- Testar com 3-5 contatos primeiro
- Deixar warmup aquecedor por 3-5 dias antes de escalar
- Monitorar `/api/tank/status` regularmente
- Usar mensagens naturais e personalizadas
- Respeitar taxa de 1 msg por minuto

⚠️ **NÃO fazer**:
- Carregar 10 mil contatos no dia 1
- Enviar mensagens repetidas (WhatsApp detecta)
- Mudar o intervalo para menos de 1 minuto
- Desconectar números durante o envio

## Troubleshooting

**P**: Tank não está enviando?
**R**: Verificar se todos os números atingiram warmup limit (`/api/warmup`)

**P**: Alguns contatos não recebem?
**R**: Verificar `/api/tank/fila` para ver erros, ou número pode estar inativo

**P**: Quer parar o tank no meio?
**R**: Limpe a fila com `/api/tank/limpar` (salva em arquivo)

---

🚀 Seu tank está pronto! Comece pequeno, escale com confiança.
