# 📋 Sistema de Diagnóstico Integrado

> Qualificação automática de leads que passa do diagnóstico web direto para uma conversa de venda personalizada no WhatsApp.

## ⚡ Resumo

1. **Cliente faz diagnóstico** em fechapro.com.br/diagnostico
2. **Frontend salva** via `POST /api/diagnostico/salvar`
3. **Bot recebe mensagem** com código do diagnóstico
4. **Bot busca dados** e injeta contexto
5. **IA responde personalizada** com foco no gargalo

## 📁 Arquivos Principais

| Arquivo | Função |
|---------|--------|
| `diagnostico-manager.js` | Salva, busca, categoriza diagnósticos |
| `diagnostico-prompt.js` | Gera prompts e argumentos personalizados |
| `public/diagnostico-teste.html` | Formulário de teste da API |
| `DIAGNOSTICO-FLUXO.md` | Fluxo completo com exemplos |
| `DIAGNOSTICO-TECNICO.md` | Documentação técnica detalhada |
| `DIAGNOSTICO-EXEMPLOS.md` | Exemplos de código e integração |

## 🚀 Quick Start

### 1. Testar API (localhost)
Acesse: `http://localhost:3000/diagnostico-teste.html`

Preencha o formulário e envie. O sistema salvará um diagnóstico e mostrará:
- Código do diagnóstico
- Categoria identificada
- Mensagem sugerida para WhatsApp

### 2. Enviar do Frontend Real
```javascript
await fetch('/api/diagnostico/salvar', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    diagnostico_id: 'DIA-123456',
    nome: 'Carlos',
    empresa: 'Carlos Reformas',
    nota_geral: 38,
    nota_presenca_confianca: 25,
    nota_atendimento: 52,
    nota_apresentacao: 44,
    nota_fechamento: 30,
    principal_gargalo: 'Presença e confiança',
    respostas_brutas: { /* 12 respostas */ }
  })
});
```

### 3. Cliente Clica "Falar com FechaPro"
Envia mensagem com código:
```
Código: DIA-123456
Quero entender como corrigir os problemas.
```

### 4. Bot Responde Automaticamente
Bot detecta `DIA-123456`, busca no BD, injeta contexto e a IA responde:
```
Oi, Carlos! 👋
Encontrei seu diagnóstico. Você ficou com 38 pontos.
O principal gargalo está em presença e confiança (25 pontos).
Vou te mostrar como corrigir...
```

## 🎯 Categorização Automática

| Categoria | Quando | Solução |
|-----------|--------|---------|
| `LEAD_PRESENCA` | Presença/confiança < 50 | Google + Landing page |
| `LEAD_ATENDIMENTO` | Atendimento < 50 | Processo estruturado |
| `LEAD_APRESENTACAO` | Apresentação < 50 | Proposta profissional |
| `LEAD_FECHAMENTO` | Fechamento < 50 | Follow-up automático |
| `LEAD_ESTRUTURA_COMPLETA` | 3+ áreas < 50 | Implantação completa |

## 💾 Banco de Dados

Tabela criada automaticamente: `diagnosticos`

```sql
-- Ver diagnósticos
SELECT diagnostico_id, nome, empresa, nota_geral, categoria 
FROM diagnosticos ORDER BY criado_em DESC;

-- Ver por categoria
SELECT categoria, COUNT(*) FROM diagnosticos GROUP BY categoria;
```

## 🔌 API Endpoints

### Salvar diagnóstico
```
POST /api/diagnostico/salvar
✓ Público (sem autenticação)
✓ Rate limit: padrão do sistema
```

**Request:**
```json
{
  "diagnostico_id": "DIA-123456",
  "nome": "Carlos",
  "empresa": "Carlos Reformas",
  "nota_geral": 38,
  "nota_presenca_confianca": 25,
  "nota_atendimento": 52,
  "nota_apresentacao": 44,
  "nota_fechamento": 30,
  "principal_gargalo": "Presença e confiança"
}
```

**Response:**
```json
{
  "sucesso": true,
  "diagnostico_id": "DIA-123456",
  "categoria": "LEAD_PRESENCA",
  "dor_principal": "NAO_ENCONTRADO_OU_NAO_TRANSMITE_CONFIANCA"
}
```

### Buscar diagnóstico
```
GET /api/diagnostico/DIA-123456
✓ Público (sem autenticação)
```

## 🎤 Bot - Detecção de Diagnóstico

O bot detecta automaticamente padrões como:
- `DIA-1842`
- `DIAG-2024`
- `[A-Z]{3}-\d+`

**Exemplos de mensagens que acionam:**
- "Código: DIA-1842"
- "Fiz o diagnóstico DIA-1842"
- "Resultado: DIA-1842 quero entender"

## 🌡️ Temperatura do Lead

Calculada automaticamente:
- `QUENTE` → nota ≥ 70
- `MORNO` → nota 50-69
- `FRIO` → nota < 50

Afeta recomendação de planos.

## 💬 Argumentos de Venda

### LEAD_PRESENCA
"Seu maior problema acontece antes do contato. O cliente procura, encontra poucas informações..."

### LEAD_ATENDIMENTO
"Os clientes chegam, mas a conversa nem sempre conduz para um próximo passo..."

### LEAD_APRESENTACAO
"O cliente recebe informações, mas não enxerga claramente os diferenciais..."

### LEAD_FECHAMENTO
"Seu processo perde força depois que a proposta é enviada..."

### LEAD_ESTRUTURA_COMPLETA
"Existem perdas antes, durante e depois do contato..."

## 📊 Recomendação de Planos

| Nota Geral | Recomendação |
|------------|--------------|
| < 40 | **Anual (R$ 997)** - Com suporte dedicado |
| 40-60 | **Anual** ou **Mensal (R$ 97)** se hesitar |
| > 60 | **Mensal (R$ 97)** ou Anual |

## 🔍 Monitoração

### Ver logs do diagnóstico
```bash
tail -f logs/fezinha.log | grep "📋 Diagnóstico"
```

### Verificar se tabela foi criada
```bash
psql -U postgres -d fechapro -c "SELECT COUNT(*) FROM diagnosticos;"
```

## ⚙️ Modificações no index.js

- ✅ Imports de módulos de diagnóstico
- ✅ Inicialização do DiagnosticoManager
- ✅ Criação de tabela ao iniciar
- ✅ Detecção de código na mensagem recebida
- ✅ Injeção de contexto em `gerarResposta()`
- ✅ Endpoints públicos: `/api/diagnostico/salvar` e `/api/diagnostico/{id}`

## 🧪 Testar Agora

### Via formulário web
1. Acesse: `http://localhost:3000/diagnostico-teste.html`
2. Preencha o formulário
3. Clique "Enviar Diagnóstico"
4. Veja o código gerado
5. Copie o código e envie via WhatsApp

### Via cURL
```bash
curl -X POST http://localhost:3000/api/diagnostico/salvar \
  -H "Content-Type: application/json" \
  -d '{
    "diagnostico_id":"DIA-TEST","nome":"Teste","empresa":"Test Corp",
    "nota_geral":35,"nota_presenca_confianca":20,
    "nota_atendimento":45,"nota_apresentacao":40,
    "nota_fechamento":25,"principal_gargalo":"Presença e confiança"
  }'
```

## 📚 Documentação Completa

- **DIAGNOSTICO-FLUXO.md** → Fluxo detalhado com exemplos
- **DIAGNOSTICO-TECNICO.md** → Implementação técnica
- **DIAGNOSTICO-EXEMPLOS.md** → Exemplos de integração

## ❓ Troubleshooting

### "Diagnóstico não encontrado"
- Verifique se o `diagnostico_id` está correto
- Verifique se foi salvo com `POST /api/diagnostico/salvar`
- Tente buscar no banco: `SELECT * FROM diagnosticos LIMIT 1;`

### "Bot não detecta o código"
- Verifique se a mensagem contém padrão `[A-Z]{3}-\d+`
- Exemplo válido: "DIA-123456"
- O bot busca automaticamente qualquer string assim

### "Sistema não inicializado"
- Verifique se o banco PostgreSQL está rodando
- Verifique credenciais em `.env`
- Reinicie o servidor: `npm start`

## 🎁 Bônus: Página de Teste

Acesse `http://localhost:3000/diagnostico-teste.html` para:
- Simular preenchimento do diagnóstico
- Ver dados sendo salvos
- Copiar código para WhatsApp
- Testar fluxo completo sem página web real

## 🚦 Status da Implementação

- ✅ Módulo de diagnóstico criado
- ✅ Prompt personalizado criado
- ✅ Banco de dados integrado
- ✅ Endpoints públicos criados
- ✅ Detecção de código em mensagens
- ✅ Injeção de contexto na IA
- ✅ Categorização automática
- ✅ Argumentos de venda prontos
- ✅ Recomendação de planos
- ✅ Página de teste criada
- ✅ Documentação completa

---

**Próximo passo**: Integrar com a página web real ou usar `diagnostico-teste.html` para testar o fluxo completo.
