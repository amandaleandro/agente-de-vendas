# Integração API - Chatbot FechaPro

## Visão Geral

Este documento descreve como integrar o FechaPro (Chatbot) com um sistema externo via API usando tokens públicos seguros.

## Fluxo de Integração

```
1. Cliente conclui diagnóstico no FechaPro
   ↓
2. FechaPro gera um public_token seguro (dgp_xxx)
   ↓
3. Botão no FechaPro abre WhatsApp com mensagem contendo o token
   ↓
4. Chatbot recebe a mensagem
   ↓
5. Chatbot extrai o token (padrão: dgp_[a-zA-Z0-9]+)
   ↓
6. Chatbot consulta API do FechaPro com o token
   ↓
7. FechaPro retorna diagnóstico em JSON formatado
   ↓
8. Chatbot personaliza resposta baseado no diagnóstico
```

## Endpoint de Integração

### GET /api/integrations/diagnostics/:token

Recupera um diagnóstico usando o token público.

**Autenticação:** API Key (Bearer token) - veja [Segurança](#segurança)

**Parâmetros:**
- `:token` - Token público no formato `dgp_[a-zA-Z0-9]+` (obrigatório)

**Resposta (200 OK):**
```json
{
  "nome": "Carlos",
  "empresa": "Carlos Reformas",
  "segmento": "Construção e Reformas",
  "scoreGeral": 38,
  "scores": {
    "presenca": 25,
    "atendimento": 52,
    "apresentacao": 44,
    "fechamento": 30
  },
  "principalGargalo": "presenca",
  "categoria": "LEAD_PRESENCA",
  "dorPrincipal": "NAO_ENCONTRADO_OU_NAO_TRANSMITE_CONFIANCA",
  "primeiraAcao": "GOOGLE_E_LANDING_PAGE",
  "recomendacoes": [
    "Otimizar perfil no Google Meu Negócio com fotos e descrição clara",
    "Criar página profissional que explique serviços e diferencias",
    "Adicionar provas sociais: avaliações, depoimentos e portfólio"
  ],
  "temperatura": "FRIO"
}
```

**Erros:**
- `404` - Diagnóstico não encontrado
- `500` - Erro interno do servidor

## Exemplo: Node.js

```javascript
async function buscarDiagnostico(tokenPublico) {
  const apiKey = process.env.FECHAPRO_INTEGRATION_KEY;
  
  try {
    const response = await fetch(
      `http://localhost:3099/api/integrations/diagnostics/${tokenPublico}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Erro ${response.status}: ${response.statusText}`);
    }

    const diagnostico = await response.json();
    return diagnostico;
  } catch (error) {
    console.error('Erro ao buscar diagnóstico:', error.message);
    throw error;
  }
}

// Usar no chatbot
const match = mensagem.match(/dgp_[a-zA-Z0-9]+/);
if (match) {
  const token = match[0];
  const diagnostico = await buscarDiagnostico(token);
  
  // Responder personalizadamente
  const resposta = `Oi ${diagnostico.nome}! 👋
  
Encontrei seu diagnóstico. Sua empresa ficou com ${diagnostico.scoreGeral} pontos.

O principal problema é ${diagnostico.dorPrincipal.toLowerCase()}.

Recomendo começar com: ${diagnostico.primeiraAcao.toLowerCase()}`;
  
  await chatbot.responder(resposta);
}
```

## Exemplo: Mensagem WhatsApp com Token

No FechaPro, ao finalizar o diagnóstico, gerar mensagem assim:

```javascript
const diagnostico = await diagnosticoManager.salvarDiagnostico({
  // ... dados do diagnóstico
});

const { public_token } = diagnostico;

const mensagem = encodeURIComponent(
  `Olá! Fiz meu diagnóstico comercial no FechaPro.

Código: ${public_token}

Quero entender melhor meu resultado.`
);

const whatsappUrl = `https://wa.me/5534999999999?text=${mensagem}`;
// Renderizar como botão ou link
```

## Segurança

### API Key

A API key é obrigatória para todas as requisições ao endpoint de integração.

**Configuração:**

1. **No FechaPro (.env):**
```env
CHATBOT_INTEGRATION_KEY=uma-chave-longa-e-segura-aqui-min-32-chars
```

2. **No Chatbot (.env):**
```env
FECHAPRO_INTEGRATION_KEY=uma-chave-longa-e-segura-aqui-min-32-chars
```

A chave deve ser a mesma em ambos os sistemas.

### Geração de Chave Segura

```bash
# Linux/Mac
openssl rand -hex 32

# PowerShell (Windows)
-join ([char[]]((0..15 | ForEach-Object { Get-Random -Maximum 16 }) + (0..15 | ForEach-Object { Get-Random -Maximum 16 })) | ForEach-Object { [System.Convert]::ToString($_, 16) }) -replace '\s+'
```

### Token Público

O token público (`dgp_xxx`) é um identificador não-previsível que:
- Não expõe dados sensíveis
- Não é sequencial (não pode ser "adivinhado")
- Está ligado apenas ao diagnóstico (não ao telefone ou email)
- Permite rastreamento do resultado consultado

**Segurança do Token:**
- Gerado com 24 bytes aleatórios (96 bits de entropia)
- Formato: `dgp_` + 24 caracteres hexadecimais
- Único por diagnóstico
- Armazenado no banco de dados

### Boas Práticas

1. **Nunca coloque API key em URLs ou mensagens públicas**
2. **Use HTTPS em produção** (não HTTP)
3. **Rotine a API key periodicamente** (a cada 90 dias)
4. **Monitore acessos ao endpoint** via logs
5. **Implemente rate limiting** (já incluído no FechaPro)

## Campos de Resposta

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `nome` | string | Nome do cliente |
| `empresa` | string | Nome da empresa |
| `segmento` | string | Segmento de mercado |
| `scoreGeral` | number | Nota total (0-100) |
| `scores.presenca` | number | Score de presença (0-100) |
| `scores.atendimento` | number | Score de atendimento (0-100) |
| `scores.apresentacao` | number | Score de apresentação (0-100) |
| `scores.fechamento` | number | Score de fechamento (0-100) |
| `principalGargalo` | string | Qual área está mais crítica |
| `categoria` | string | Classificação automática do lead |
| `dorPrincipal` | string | Descrição do problema principal |
| `primeiraAcao` | string | Recomendação de ação inicial |
| `recomendacoes` | array | Lista de recomendações personalizadas |
| `temperatura` | string | QUENTE, MORNO ou FRIO (baseado no score) |

## Exemplo Completo: Chatbot em Node.js

```javascript
const { default: makeWASocket } = require('@whiskeysockets/baileys');

class IntegracaoFechaPro {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = process.env.FECHAPRO_URL || 'http://localhost:3099';
  }

  async buscarDiagnostico(tokenPublico) {
    const response = await fetch(
      `${this.baseUrl}/api/integrations/diagnostics/${tokenPublico}`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Erro: ${response.status}`);
    }

    return await response.json();
  }

  extrairToken(texto) {
    const match = texto.match(/dgp_[a-zA-Z0-9]+/);
    return match ? match[0] : null;
  }

  async procesarMensagem(texto) {
    const token = this.extrairToken(texto);
    
    if (!token) {
      return null; // Nenhum token encontrado
    }

    try {
      const diagnostico = await this.buscarDiagnostico(token);
      return this.formatarResposta(diagnostico);
    } catch (error) {
      console.error('Erro ao buscar diagnóstico:', error);
      return "Desculpa, não consegui encontrar seu diagnóstico. Tente novamente.";
    }
  }

  formatarResposta(diagnostico) {
    const { nome, scoreGeral, principalGargalo, dorPrincipal, recomendacoes } = diagnostico;

    let resposta = `Oi ${nome}! 👋\n\n`;
    resposta += `Encontrei seu diagnóstico.\n`;
    resposta += `Sua empresa ficou com ${scoreGeral} pontos.\n\n`;
    resposta += `O principal problema é em ${principalGargalo.toLowerCase()}.\n`;
    resposta += `${dorPrincipal}\n\n`;
    resposta += `Recomendo:\n`;
    
    recomendacoes.slice(0, 3).forEach((rec, i) => {
      resposta += `${i + 1}. ${rec}\n`;
    });

    return resposta;
  }
}

module.exports = IntegracaoFechaPro;
```

## Troubleshooting

### "Diagnóstico não encontrado (404)"
- Verifique se o token está no formato correto: `dgp_[caracteres-hexadecimais]`
- Confirme que o diagnóstico foi realmente salvo no FechaPro
- Verifique se o banco de dados está acessível

### "Não autorizado (401)"
- Confirme que a API key está correta no header `Authorization: Bearer <chave>`
- Verifique se `CHATBOT_INTEGRATION_KEY` e `FECHAPRO_INTEGRATION_KEY` são idênticas
- Certifique-se de que está usando `Bearer` (maiúscula) antes da chave

### "Erro interno (500)"
- Verifique os logs do FechaPro
- Confirme que o banco de dados está online
- Verifique a conexão à rede

## Próximos Passos

1. **MVP:** Token público + GET endpoint
2. **Fase 2:** Webhook para notificar chatbot quando diagnóstico é completado
3. **Fase 3:** Histórico de interações após diagnóstico
4. **Fase 4:** Sincronização bidirecional de dados

---

**Última atualização:** 2026-06-26
**Status:** Implementação completa do MVP
