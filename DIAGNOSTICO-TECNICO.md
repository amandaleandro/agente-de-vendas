# Documentação Técnica - Sistema de Diagnóstico

## Arquivos Adicionados

### 1. `diagnostico-manager.js`
Gerencia salvar, buscar e categorizar diagnósticos.

**Métodos principais**:
- `async inicializarTabela()` - Cria tabela e índices no PostgreSQL
- `async salvarDiagnostico(dados)` - Salva diagnóstico com categorização automática
- `async buscarDiagnostico(diagnostico_id)` - Busca diagnóstico por ID (com cache)
- `categorizarDiagnostico(notas)` - Categoriza baseado em notas (retorna categoria, dor_principal, solucao_prioritaria, recomendacoes)
- `extrairDiagnosticoId(texto)` - Detecta padrões `DIA-\d+`, `DIAG-\d+`, etc.
- `formatarResultadoParaChat(diagnostico)` - Formata para resposta JSON

**Cache**: Mantém diagnosticos em memória com `Map` para rápido acesso.

### 2. `diagnostico-prompt.js`
Gera prompts e argumentos de venda personalizados.

**Métodos principais**:
- `obterPromptSistema()` - Retorna system instruction base para diagnósticos
- `construirPromptComContexto(diagnostico)` - Constrói prompt completo com dados do diagnóstico
- `gerarArgumento{Presenca|Atendimento|Apresentacao|Fechamento|EstruturaCompleta}()` - Gera argumentos de venda por categoria
- `gerarRecomendacaoPlan(categoria, diagnostico)` - Recomenda plano (mensal/anual/vitalício)
- `gerarPerguntaComplementar(categoria)` - Gera pergunta de qualificação baseada na categoria

---

## Fluxo de Execução

### 1. Inicialização (em `iniciar()`)
```javascript
// diagnostico-manager é inicializado com pool do PostgreSQL
diagnosticoManager = new DiagnosticoManager(pool);

// Tabela é criada/verificada
await diagnosticoManager.inicializarTabela();
```

### 2. Quando mensagem é recebida (em `messages.upsert`)
```javascript
// Detectar código de diagnóstico
const diagnosticoId = diagnosticoManager.extrairDiagnosticoId(texto);

if (diagnosticoId) {
  // Buscar diagnóstico do banco
  diagnosticoContexto = await diagnosticoManager.buscarDiagnostico(diagnosticoId);
}

// Passar contexto para gerarResposta
const resposta = await gerarResposta(texto, sender, midia, identidade, 0, diagnosticoContexto);
```

### 3. Processamento de Resposta (em `gerarResposta()`)
```javascript
// Se há contexto de diagnóstico, injetar no systemInstruction
if (diagnosticoContexto) {
  const diagFormatado = diagnosticoPrompt.construirPromptComContexto(diagnosticoContexto);
  systemInstruction += `\n\n${diagFormatado}`;
}

// IA recebe systemInstruction com contexto
// IA responde personalizadamente
```

---

## Categorização Automática

A categoria é determinada por:

1. **Contar notas baixas** (< 50):
   - Se 3+ áreas têm nota < 50 → `LEAD_ESTRUTURA_COMPLETA`
   - Se 1-2 áreas têm nota < 50 → usar `principal_gargalo` para decidir

2. **Mapear gargalo para categoria**:
   - "presença" → `LEAD_PRESENCA`
   - "atendimento" → `LEAD_ATENDIMENTO`
   - "apresentação" → `LEAD_APRESENTACAO`
   - "fechamento" → `LEAD_FECHAMENTO`

3. **Associar cada categoria**:
   - `dor_principal`: problema específico do cliente
   - `solucao_prioritaria`: o que resolver primeiro
   - `recomendacoes`: 5 ações práticas em ordem de prioridade

---

## Banco de Dados

### Tabela: `diagnosticos`

```sql
CREATE TABLE diagnosticos (
  id SERIAL PRIMARY KEY,
  diagnostico_id VARCHAR(50) UNIQUE NOT NULL,
  public_token VARCHAR(50) UNIQUE,
  telefone VARCHAR(20),
  nome VARCHAR(255),
  empresa VARCHAR(255),
  segmento VARCHAR(100),
  nota_geral INT,
  nota_presenca_confianca INT,
  nota_atendimento INT,
  nota_apresentacao INT,
  nota_fechamento INT,
  principal_gargalo VARCHAR(100),
  categoria VARCHAR(50),
  dor_principal VARCHAR(100),
  solucao_prioritaria VARCHAR(100),
  temperatura VARCHAR(20),
  etapa_comercial VARCHAR(50),
  respostas_brutas JSONB,
  recomendacoes JSONB,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)

-- Índices:
CREATE INDEX idx_diag_telefone ON diagnosticos(telefone);
CREATE INDEX idx_diag_categoria ON diagnosticos(categoria);
CREATE INDEX idx_diag_criado ON diagnosticos(criado_em);
```

---

## API Endpoints

### Salvar Diagnóstico
```
POST /api/diagnostico/salvar
Content-Type: application/json

Request:
{
  "diagnostico_id": "DIA-1842",
  "nome": "Carlos",
  "empresa": "Carlos Reformas",
  "segmento": "Construção",
  "telefone": "34999999999",
  "nota_geral": 38,
  "nota_presenca_confianca": 25,
  "nota_atendimento": 52,
  "nota_apresentacao": 44,
  "nota_fechamento": 30,
  "principal_gargalo": "Presença e confiança",
  "respostas_brutas": { /* respostas das 12 perguntas */ }
}

Response (200):
{
  "sucesso": true,
  "diagnostico_id": "DIA-1842",
  "categoria": "LEAD_PRESENCA",
  "dor_principal": "NAO_ENCONTRADO_OU_NAO_TRANSMITE_CONFIANCA"
}
```

### Buscar Diagnóstico
```
GET /api/diagnostico/DIA-1842

Response (200):
{
  "nome": "Carlos",
  "empresa": "Carlos Reformas",
  "segmento": "Construção",
  "nota_geral": 38,
  "nota_presenca_confianca": 25,
  "nota_atendimento": 52,
  "nota_apresentacao": 44,
  "nota_fechamento": 30,
  "principal_gargalo": "Presença e confiança",
  "categoria": "LEAD_PRESENCA",
  "dor_principal": "NAO_ENCONTRADO_OU_NAO_TRANSMITE_CONFIANCA",
  "solucao_prioritaria": "GOOGLE_E_LANDING_PAGE",
  "recomendacoes": [
    "Otimizar perfil no Google Meu Negócio com fotos e descrição clara",
    "Criar página profissional que explique serviços e diferencias",
    "Adicionar provas sociais: avaliações, depoimentos e portfólio",
    "Centralizar contatos: telefone, WhatsApp e email visíveis",
    "Implementar FAQ respondendo principais dúvidas de clientes"
  ],
  "diagnostico_id": "DIA-1842"
}
```

---

## Detecção de Código

A função `extrairDiagnosticoId()` busca por padrões como:
- `DIA-1842`
- `DIAG-2024`
- `[A-Z]{3}-\d+` (3 letras, hífen, números)

**Exemplos de mensagens que acionam**:
- "Código: DIA-1842"
- "Fiz o diagnóstico DIA-1842"
- "Resultado: DIA-1842 quero entender"

---

## Temperatura do Lead

Calculada automaticamente:
- `QUENTE` se nota_geral ≥ 70
- `MORNO` se nota_geral 50-69
- `FRIO` se nota_geral < 50

Influencia a recomendação de planos.

---

## Modificações em `index.js`

### Imports (linhas 20-22)
```javascript
const DiagnosticoManager = require('./diagnostico-manager');
const DiagnosticoPrompt = require('./diagnostico-prompt');
```

### Inicialização (linhas 88-89)
```javascript
const diagnosticoPrompt = new DiagnosticoPrompt();
let diagnosticoManager = null; // Inicializado após pool
```

### Pool (linha 527)
```javascript
diagnosticoManager = new DiagnosticoManager(pool);
```

### Inicializar tabela (na função `iniciar()`)
```javascript
if (diagnosticoManager) {
  await diagnosticoManager.inicializarTabela();
  console.log('📋 Sistema de diagnósticos inicializado');
}
```

### Processar mensagem (linhas 1040-1055)
```javascript
// Verificar se há diagnóstico mencionado
let diagnosticoContexto = null;
if (diagnosticoManager) {
  const diagnosticoId = diagnosticoManager.extrairDiagnosticoId(texto);
  if (diagnosticoId) {
    diagnosticoContexto = await diagnosticoManager.buscarDiagnostico(diagnosticoId);
  }
}

// Passar para gerarResposta
const resposta = await gerarResposta(texto, sender, midia, identidade, 0, diagnosticoContexto);
```

### Assinatura de gerarResposta (linha 656)
```javascript
async function gerarResposta(
  texto, 
  telefone, 
  midia = null, 
  identidade = identidadeDaSessao(1), 
  tentativa = 0, 
  diagnosticoContexto = null  // ← Novo parâmetro
)
```

### Injetar contexto (linhas 664-674)
```javascript
// Se há diagnóstico, adicionar ao contexto
if (diagnosticoContexto) {
  const diagFormatado = diagnosticoPrompt.construirPromptComContexto(diagnosticoContexto);
  systemInstruction += `\n\n${diagFormatado}`;
}
```

### Chamada recursiva (linha 754)
```javascript
return gerarResposta(texto, telefone, midia, identidade, 1, diagnosticoContexto);
```

### Endpoints públicos (linhas 400-439)
- `POST /api/diagnostico/salvar`
- `GET /api/diagnostico/{id}`

---

## Casos de Uso

### Caso 1: Cliente vem do diagnóstico
1. Envia: "Código: DIA-1842"
2. Bot detecta, busca, injeta contexto
3. Bot responde: "Oi! Encontrei seu diagnóstico. Você ficou com 38 pontos..."
4. Conversa continua personalizada

### Caso 2: Cliente voltou depois de dias
1. Envia: "Oi"
2. Bot não encontra diagnóstico recente
3. Bot oferece: "Vamos começar com um diagnóstico rápido?"
4. Se cliente aceita, volta ao Caso 1

### Caso 3: Cliente vem de outra origem
1. Envia mensagem normal (sem código)
2. DiagnosticoManager não encontra nada
3. Bot funciona normalmente (sem contexto especial)

---

## Performance

- **Cache em memória**: Diagnósticos já consultados são mantidos em `Map`
- **Índices no BD**: Consultas por telefone, categoria e data são rápidas
- **Máx histórico**: 5 mensagens para evitar contexto muito grande
- **Timeout**: System instruction injetado apenas quando há diagnóstico

---

## Debugging

### Ver diagnósticos salvos
```sql
SELECT diagnostico_id, nome, empresa, nota_geral, categoria 
FROM diagnosticos 
ORDER BY criado_em DESC 
LIMIT 10;
```

### Ver logs do bot
```
grep "📋 Diagnóstico encontrado" logs/fezinha.log
```

### Teste manual
```bash
# Salvar diagnóstico
curl -X POST http://localhost:3000/api/diagnostico/salvar \
  -H "Content-Type: application/json" \
  -d '{"diagnostico_id":"DIA-TEST","nome":"Teste","empresa":"Test Corp","nota_geral":35,"nota_presenca_confianca":20,...}'

# Buscar diagnóstico
curl http://localhost:3000/api/diagnostico/DIA-TEST
```
