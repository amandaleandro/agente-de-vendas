# Fluxo de Diagnóstico → Chatbot

## Visão geral

A página de diagnóstico (fechapro.com.br/diagnostico) qualifica o cliente em 4 etapas (presença/confiança, atendimento, apresentação, fechamento). Ao final, o cliente clica "Falar com o FechaPro", que envia uma mensagem WhatsApp ao bot **com o código do diagnóstico**.

O bot recebe o código, busca os dados no banco de dados, identifica a categoria automaticamente e conduz uma conversa de venda **completamente personalizada** baseada no gargalo identificado.

---

## Fase 1: Página Web → Banco de Dados

### Quando o cliente completa o diagnóstico:

1. **Frontend** (fechapro.com.br/diagnostico):
   - Coleta respostas de 12 perguntas
   - Calcula nota geral e notas por etapa
   - Identifica o principal gargalo
   - Gera um `diagnostico_id` (ex: `DIA-1842`)

2. **Envio para banco de dados**:
   ```javascript
   POST /api/diagnostico/salvar
   Content-Type: application/json

   {
     "diagnostico_id": "DIA-1842",
     "nome": "Carlos",
     "empresa": "Carlos Reformas",
     "segmento": "Construção e reforma",
     "telefone": "34999999999",
     "nota_geral": 38,
     "nota_presenca_confianca": 25,
     "nota_atendimento": 52,
     "nota_apresentacao": 44,
     "nota_fechamento": 30,
     "principal_gargalo": "Presença e confiança",
     "respostas_brutas": { /* 12 respostas */ }
   }
   ```

3. **Sistema categoriza automaticamente**:
   ```json
   {
     "categoria": "LEAD_PRESENCA",
     "dor_principal": "NAO_ENCONTRADO_OU_NAO_TRANSMITE_CONFIANCA",
     "solucao_prioritaria": "GOOGLE_E_LANDING_PAGE",
     "recomendacoes": [
       "Otimizar perfil no Google Meu Negócio",
       "Criar página profissional que explique serviços",
       // ... 3 mais recomendações específicas
     ]
   }
   ```

---

## Fase 2: Cliente Clica "Falar com o FechaPro"

### Mensagem enviada ao WhatsApp:

```
Olá! Acabei de fazer meu diagnóstico no FechaPro.

Código: DIA-1842
Quero entender como corrigir os problemas encontrados.
```

⚠️ **Importante**: A mensagem DEVE conter o `diagnostico_id` para que o bot funcione corretamente.

---

## Fase 3: Bot Recebe e Processa

### O que o bot faz quando recebe a mensagem:

1. **Detecta o código**: Busca padrões como `DIA-1842`, `DIAG-1234`, etc.

2. **Busca no banco de dados**:
   ```javascript
   const diagnostico = await diagnosticoManager.buscarDiagnostico('DIA-1842');
   // Retorna todos os dados salvos + categorização
   ```

3. **Injeta contexto na IA**:
   - Adiciona ao `systemInstruction` as instruções específicas para diagnósticos
   - Inclui os dados: notas, gargalo, categoria, recomendações
   - Exemplo de primeira resposta que o bot gera automaticamente:

   ```
   Oi, Carlos! 👋

   Encontrei seu diagnóstico. Sua empresa ficou com 38 pontos.

   O principal gargalo está em presença e confiança (25 pontos). 
   Isso significa que alguns clientes podem estar desistindo antes de chamar.

   Vou te mostrar como corrigir:
   1. Otimizar presença no Google
   2. Criar página profissional que explique serviços
   3. Mostrar provas: trabalhos, depoimentos, contatos

   Hoje sua empresa já está no Google Meu Negócio?
   ```

4. **Conversa continua personalizada**:
   - Bot não refaz as perguntas do diagnóstico
   - Bot foca no gargalo específico
   - Bot faz apenas uma pergunta complementar
   - Bot recomenda plano adequado para a urgência
   - Bot conduz até o fechamento

---

## Categorização Automática

### Regras de Categorização

#### 1. **LEAD_PRESENCA** (gargalo em presença/confiança < 50)
- **Dor**: Não encontrado ou não transmite confiança
- **Solução**: Google + Landing Page
- **Argumento**: "Seu maior problema acontece antes do contato. O cliente procura, encontra poucas informações..."

#### 2. **LEAD_ATENDIMENTO** (gargalo em atendimento < 50)
- **Dor**: Conversa não avança
- **Solução**: Processo de atendimento estruturado
- **Argumento**: "O cliente chega, mas a conversa nem sempre conduz..."

#### 3. **LEAD_APRESENTACAO** (gargalo em apresentação < 50)
- **Dor**: Orçamento sem valor percebido
- **Solução**: Proposta profissional
- **Argumento**: "O cliente recebe informações, mas não enxerga claramente..."

#### 4. **LEAD_FECHAMENTO** (gargalo em fechamento < 50)
- **Dor**: Falta de acompanhamento
- **Solução**: Follow-up e fechamento automático
- **Argumento**: "Seu processo perde força depois que a proposta é enviada..."

#### 5. **LEAD_ESTRUTURA_COMPLETA** (3+ notas < 50)
- **Dor**: Processo comercial desorganizado
- **Solução**: Implantação completa
- **Argumento**: "Seu resultado mostra perdas em várias etapas..."

---

## Recomendação de Planos

O bot recomenda o plano baseado na **urgência** (determinada pela nota geral):

### Nota geral < 40:
→ **Anual (R$ 997)** - Maior impacto, com suporte dedicado

### Nota geral 40-60:
→ **Anual (R$ 997)** ou oferecer **Mensal (R$ 97)** se cliente hesitar

### Nota geral > 60:
→ Oferecer **Mensal (R$ 97)** ou **Anual** dependendo de interesse

---

## Endpoints da API

### 1. Salvar diagnóstico
```
POST /api/diagnostico/salvar
Content-Type: application/json

Retorno:
{
  "sucesso": true,
  "diagnostico_id": "DIA-1842",
  "categoria": "LEAD_PRESENCA",
  "dor_principal": "NAO_ENCONTRADO_OU_NAO_TRANSMITE_CONFIANCA"
}
```

### 2. Buscar diagnóstico
```
GET /api/diagnostico/DIA-1842

Retorno:
{
  "nome": "Carlos",
  "empresa": "Carlos Reformas",
  "nota_geral": 38,
  "nota_presenca_confianca": 25,
  "nota_atendimento": 52,
  "nota_apresentacao": 44,
  "nota_fechamento": 30,
  "principal_gargalo": "Presença e confiança",
  "categoria": "LEAD_PRESENCA",
  "recomendacoes": [ ... ]
}
```

---

## Variáveis de Ambiente (se necessário)

O sistema já está integrado. Nenhuma variável nova é necessária, mas certifique-se de que:

- `DB_HOST` = localhost (ou seu servidor PostgreSQL)
- `DB_USER` = postgres
- `DB_PASSWORD` = sua senha
- `DB_NAME` = fechapro
- `DB_PORT` = 5432

---

## Fluxo Completo de Exemplo

```
1. Carlos faz diagnóstico em fechapro.com.br/diagnostico
   ✓ 12 perguntas respondidas
   ✓ Nota geral: 38
   ✓ Gargalo: Presença e confiança
   
2. Frontend envia POST /api/diagnostico/salvar
   ✓ Sistema salva com diagnostico_id = DIA-1842
   ✓ Categoriza automaticamente como LEAD_PRESENCA
   
3. Carlos clica "Falar com o FechaPro"
   ✓ Envia mensagem: "Código: DIA-1842..."
   
4. Bot recebe mensagem
   ✓ Detecta DIA-1842
   ✓ Busca diagnóstico no BD
   ✓ Injeta contexto na IA
   
5. Bot responde
   ✓ "Oi, Carlos! Encontrei seu diagnóstico..."
   ✓ Explica gargalo: presença
   ✓ Faz pergunta complementar
   
6. Carlos responde
   ✓ "Sim, temos Google mas não está otimizado"
   
7. Bot recomenda
   ✓ "O anual é melhor para seu caso..."
   ✓ Conduz para pagamento
   
8. Carlos escolhe
   ✓ "Como faço para contratar?"
   ✓ Bot envia link de checkout
```

---

## Checklist de Implementação

- ✅ Módulo `diagnostico-manager.js` criado
- ✅ Módulo `diagnostico-prompt.js` criado  
- ✅ Tabela de diagnósticos criada no banco
- ✅ Endpoints `/api/diagnostico/salvar` e `/api/diagnostico/{id}` implementados
- ✅ Detecção de código de diagnóstico na mensagem
- ✅ Injeção de contexto na IA
- ✅ Categorização automática de leads
- ✅ Recomendação de planos baseada em urgência

**Próximos passos**:
1. Integrar página web (ou fornecer documentação)
2. Testar fluxo completo com diagnóstico real
3. Ajustar argumentos conforme feedback de clientes reais
