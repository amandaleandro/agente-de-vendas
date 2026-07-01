# 📚 Guia de Knowledge Base

## O que é?

A **Knowledge Base** é um repositório centralizado de informações sobre seus produtos, serviços e conhecimento que você quer que o bot use ao conversar com clientes. Quando o bot recebe uma mensagem, ele busca automaticamente materiais relevantes e os injeta no prompt da IA para que ela possa responder com mais propriedade.

## Como Funciona?

1. **Você adiciona** um material (título, conteúdo, palavras-chave)
2. **Bot recebe mensagem** do cliente
3. **Bot busca** materiais relevantes baseado nas palavras-chave
4. **Bot injeta contexto** no prompt da IA
5. **IA responde** com base no contexto + instruções + histórico

## Por Que Usar?

- ✅ Bot responde com informações precisas sobre seus produtos
- ✅ Consistência nas respostas
- ✅ Não precisa treinar a IA (usa contexto ao invés)
- ✅ Fácil de atualizar em tempo real
- ✅ Múltiplos vendedores podem usar a mesma base

## Acessando a Knowledge Base

### Via Painel
1. Clique em **"Base de Conhecimento"** na barra lateral
2. Clique em **"➕ Novo Material"**
3. Preencha os dados
4. Clique em **"Salvar Material"**

### Via API

```bash
# Listar todos os materiais
curl http://localhost:3099/api/knowledge

# Adicionar novo material
curl -X POST http://localhost:3099/api/knowledge \
  -H "Content-Type: application/json" \
  -d '{
    "titulo": "Planos do FechaPro",
    "conteudo": "Oferecemos 3 planos: Básico ($99/mês), Pro ($299/mês) e Enterprise (customizado)",
    "categoria": "preco",
    "palavrasChave": ["plano", "preço", "valor", "investimento"]
  }'

# Buscar materiais relevantes
curl 'http://localhost:3099/api/knowledge/search?q=qual%20é%20o%20preço'
```

## Exemplos de Materiais

### 1. Informações sobre Produto

```
Título: Funcionalidades do FechaPro
Categoria: Produto
Palavras-chave: função, recurso, feature, o que faz

Conteúdo:
FechaPro é um software de automação de vendas que:
- Automatiza prospecção via WhatsApp usando IA
- Qualifica leads através de diagnóstico interativo
- Calcula score de lead para priorizar prospects
- Agenda follow-ups automáticos
- Gera respostas naturais (não templated)
- Integra com múltiplos números WhatsApp
- Painel de controle para atendentes humanos
```

### 2. Preço e Planos

```
Título: Planos e Preços
Categoria: Preço
Palavras-chave: preço, custo, plano, investimento, valor, quanto custa

Conteúdo:
Temos 3 opciones de planos:

**Plano Básico** - R$ 99/mês
- Até 100 contatos
- 1 número WhatsApp
- Histórico de 30 dias
- Suporte por email

**Plano Pro** - R$ 299/mês
- Até 1.000 contatos
- Até 3 números WhatsApp
- Histórico de 90 dias
- Dashboard completo
- Suporte prioritário

**Plano Enterprise** - Customizado
- Contatos ilimitados
- Números ilimitados
- Integrações customizadas
- Treinamento incluído
- Suporte 24/7
```

### 3. FAQ - Questões Frequentes

```
Título: Perguntas Frequentes (FAQ)
Categoria: FAQ
Palavras-chave: como, por quê, não funciona, dúvida

Conteúdo:
**P: Preciso de um número comercial?**
A: Não! Pode ser um número pessoal comum. FechaPro usa WhatsApp Web.

**P: Quanto tempo demora para começar?**
A: 5 minutos. Escaneie o QR code, configure os parâmetros e pronto.

**P: Posso usar vários números?**
A: Sim! Planos Pro e Enterprise suportam múltiplos números com IA ativada em cada um.

**P: A IA erra muito?**
A: Raramente. Com a Knowledge Base carregada, acurácia é >90%. Você pode revisar respostas via painel.

**P: Está protegido legalmente?**
A: Sim. Segue LGPD, permite opt-out automático, e gera logs de auditoria.
```

### 4. Caso de Uso

```
Título: Caso de Uso - Consultoria Financeira
Categoria: Caso de Uso
Palavras-chave: exemplo, caso, cliente, resultado, sucesso

Conteúdo:
Uma consultoria financeira usou FechaPro para prospeccionar empresas em sua região.

**Antes:**
- 50 prospecções/mês manualmente
- Taxa de conversão: 2%
- Tempo por lead: 15 minutos

**Depois (com FechaPro):**
- 500 prospecções/mês (automático)
- Taxa de conversão: 8% (bot qualifica melhor)
- Tempo economizado: 125 horas/mês

**Resultado:**
Aumentou pipeline de 1 para 40 oportunidades/mês em 3 meses.
ROI em 2 meses.
```

### 5. Integração

```
Título: Integrações Disponíveis
Categoria: Integração
Palavras-chave: integração, API, conectar, zapier, pipeline

Conteúdo:
FechaPro integra nativamente com:
- Pipedrive (CRM)
- HubSpot (automação)
- Zapier (IFTTT)
- Google Sheets
- Slack (notificações)

Próximas integrações:
- Salesforce
- Zoho CRM
- Monday.com
```

## Boas Práticas

### ✅ Faça

- **Seja específico**: "Planos e Preços" melhor que "Informações Gerais"
- **Use palavras-chave relevantes**: Inclua termos que clientes realmente usam
- **Mantenha atualizado**: Atualize quando preços, features ou políticas mudam
- **Organize por categoria**: Facilita encontrar o material certo
- **Teste com exemplos**: Mande mensagens para ver se o bot usa o contexto

### ❌ Evite

- **Textos muito longos**: Mantenha entre 200-1000 caracteres
- **Linguagem muito técnica**: Escreva como você fala
- **Dados sensíveis**: Não inclua senhas, chaves ou tokens
- **Links diretos demais**: Deixe a IA integrar naturalmente
- **Repetição**: Uma material por tópico

## Troubleshooting

### Bot não está usando meu material

**Causa**: Palavras-chave não combinam com a mensagem

**Solução**: 
1. Verifique se o material existe: `/api/knowledge`
2. Teste a busca: `/api/knowledge/search?q=seu_termo`
3. Adicione palavras-chave mais comuns (ex: "qual", "como", "preço")

### Material aparece mas contexto não é usado

**Causa**: Prompt está muito grande, IA ignora o contexto

**Solução**:
1. Reduza o tamanho do material
2. Remova materiais menos relevantes
3. Use vocabulário simples nas palavras-chave

### Quero deletar um material

**Via Painel**: Clique no card do material → 🗑️ Deletar

**Via API**:
```bash
curl -X DELETE http://localhost:3099/api/knowledge/{id}
```

## Estatísticas

Você pode acompanhar:
- Total de materiais
- Quantos por categoria
- Última atualização
- Taxa de uso (logs futuros)

## Próximos Passos

1. **Crie seus primeiros materiais**:
   - 1 sobre produto/serviço
   - 1 sobre preço
   - 1 sobre FAQ
   - 1 sobre case/resultado

2. **Teste as respostas** enviando mensagens ao bot

3. **Refine com base em feedback**:
   - Respostas ruins? Adicione mais contexto
   - Palavras-chave não funcionaram? Mude para termos mais comuns

4. **Mantenha atualizado**:
   - Quando lançar novo feature → adicione material
   - Quando mudar preço → atualize material
   - Quando notar padrão de dúvida → crie FAQ

---

**Dúvidas?** Revise os logs em Terminal de Logs → veja que materiais estão sendo usados.
