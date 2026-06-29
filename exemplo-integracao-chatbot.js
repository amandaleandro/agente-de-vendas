// Exemplo de como integrar o endpoint de diagnóstico no chatbot
// Este arquivo mostra a implementação prática da integração

const IntegracaoFechaPro = class {
  constructor(apiKey, baseUrl = 'http://localhost:3099') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  // Extrai token do formato dgp_xxxxx
  extrairToken(texto) {
    const match = texto.match(/dgp_[a-zA-Z0-9]+/);
    return match ? match[0] : null;
  }

  // Busca diagnóstico na API
  async buscarDiagnostico(token) {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/integrations/diagnostics/${token}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.status === 404) {
        throw new Error('DIAGNOSTICO_NAO_ENCONTRADO');
      }

      if (!response.ok) {
        throw new Error(`API_ERROR_${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[IntegracaoFechaPro] Erro ao buscar:', error.message);
      throw error;
    }
  }

  // Gera resposta personalizada baseada no diagnóstico
  gerarRespostaDiagnostico(diagnostico) {
    const {
      nome,
      empresa,
      scoreGeral,
      principalGargalo,
      dorPrincipal,
      primeiraAcao,
      recomendacoes,
      temperatura,
    } = diagnostico;

    let resposta = `Oi ${nome}! 👋\n\n`;
    resposta += `Encontrei seu diagnóstico!\n`;
    resposta += `Sua empresa ficou com ${scoreGeral} pontos de estrutura comercial.\n\n`;

    // Temperatura indica urgência
    const urgencia =
      temperatura === 'QUENTE'
        ? 'Excelente! Você está bem estruturado.'
        : temperatura === 'MORNO'
        ? 'Você tem uma boa base, mas há espaço para melhorar.'
        : 'Há bastante espaço para estruturação comercial.';

    resposta += `${urgencia}\n\n`;

    resposta += `O principal desafio está em: **${principalGargalo.toLowerCase()}**\n`;
    resposta += `${dorPrincipal}\n\n`;

    resposta += `Recomendo começar com: **${primeiraAcao.toLowerCase()}**\n\n`;

    if (recomendacoes && recomendacoes.length > 0) {
      resposta += `Próximos passos:\n`;
      recomendacoes.slice(0, 3).forEach((rec, i) => {
        resposta += `${i + 1}. ${rec}\n`;
      });
    }

    return resposta;
  }

  // Processa uma mensagem que pode conter um token
  async procesarMensagem(texto) {
    const token = this.extrairToken(texto);

    if (!token) {
      return null; // Nenhum token encontrado, processa normalmente
    }

    try {
      const diagnostico = await this.buscarDiagnostico(token);
      const resposta = this.gerarRespostaDiagnostico(diagnostico);
      return resposta;
    } catch (error) {
      if (error.message === 'DIAGNOSTICO_NAO_ENCONTRADO') {
        return 'Desculpa, não consegui encontrar esse diagnóstico. Pode ser que já tenha expirado ou o código esteja incorreto.';
      }
      console.error('[IntegracaoFechaPro] Erro ao processar:', error.message);
      return 'Tive um problema ao buscar seu diagnóstico. Pode tentar de novo?';
    }
  }
};

// ============================================
// USO NO CHATBOT BAILEYS
// ============================================

// 1. Inicializar a integração (na startup do bot)
const integracao = new IntegracaoFechaPro(
  process.env.FECHAPRO_INTEGRATION_KEY || 'sua-chave-aqui'
);

// 2. Integrar no handler de mensagens do Baileys
async function handleMensagemComIntegracao(texto, sender, socket) {
  // Verificar se há um token de diagnóstico
  const resposta = await integracao.procesarMensagem(texto);

  if (resposta) {
    // Se encontrou e processou um token, enviar resposta personalizada
    await socket.sendMessage(sender, { text: resposta });
    return true; // Mensagem foi processada
  }

  // Caso contrário, continuar com o fluxo normal do bot
  return false; // Mensagem não foi processada, seguir para próxima etapa
}

// 3. Exemplo de como integrar no fluxo principal do index.js:
/*
  // No handler de mensagens recebidas:
  if (msg.message?.conversation) {
    const texto = msg.message.conversation;
    const processada = await handleMensagemComIntegracao(texto, sender, socket);

    if (processada) {
      return; // Diagnóstico foi processado, não fazer mais nada
    }
  }

  // Continuar com fluxo normal...
*/

// ============================================
// EXEMPLOS DE USO
// ============================================

// Exemplo 1: Mensagem com token
/*
Usuario: "Olá! Fiz meu diagnóstico comercial no FechaPro.
Código do diagnóstico: dgp_a7K92mP4
Quero entender melhor meu resultado."

Bot vai:
1. Extrair: dgp_a7K92mP4
2. Chamar GET /api/integrations/diagnostics/dgp_a7K92mP4
3. Receber dados do diagnóstico
4. Gerar resposta personalizada:
"Oi Carlos! 👋

Encontrei seu diagnóstico!
Sua empresa ficou com 38 pontos de estrutura comercial.

Há bastante espaço para estruturação comercial.

O principal desafio está em: presença
NAO_ENCONTRADO_OU_NAO_TRANSMITE_CONFIANCA

Recomendo começar com: GOOGLE_E_LANDING_PAGE

Próximos passos:
1. Otimizar perfil no Google Meu Negócio com fotos e descrição clara
2. Criar página profissional que explique serviços e diferencias
3. Adicionar provas sociais: avaliações, depoimentos e portfólio"
*/

// ============================================
// TRATAMENTO DE ERROS
// ============================================

// Diagnóstico não encontrado
/*
Usuario: "dgp_invalidtoken123"

Bot:
"Desculpa, não consegui encontrar esse diagnóstico. Pode ser que já tenha expirado ou o código esteja incorreto."
*/

// ============================================
// CONFIGURAÇÃO NECESSÁRIA NO .env
// ============================================

/*
# Chave de integração com FechaPro
FECHAPRO_INTEGRATION_KEY=sua-chave-segura-aqui-minimo-32-caracteres

# URL base do FechaPro (opcional, padrão é http://localhost:3099)
FECHAPRO_BASE_URL=http://localhost:3099

# OU em produção:
FECHAPRO_BASE_URL=https://sua-url.com
*/

module.exports = IntegracaoFechaPro;
