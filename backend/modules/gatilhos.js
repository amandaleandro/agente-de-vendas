/**
 * ⚡ Gatilhos Rápidos & Alertas
 * 
 * Intercepta mensagens antes de gastar tokens da IA para respostas
 * curtas conhecidas ou para acionar alertas de socorro humano.
 */

// Palavras exatas ou pequenos regex para disparar respostas sem IA
const RESPOSTAS_RAPIDAS = [
  {
    regex: /^(planos?|preços?|valores)$/i,
    resposta: "Nossos planos variam conforme o tamanho da sua operação. Você pode conferir os valores oficiais e atualizados aqui: https://fechapro.com.br"
  },
  {
    regex: /^(diagnostico|diagnóstico)$/i,
    resposta: "Aqui está o link para o diagnóstico gratuito do seu processo comercial: https://fechapro.com.br/diagnostico"
  },
  {
    regex: /^(obrigado|obrigada|valeu)$/i,
    resposta: "Por nada! Se precisar de mais alguma coisa, é só chamar."
  }
];

// Termos que indicam que o cliente quer falar com uma pessoa
const TERMOS_ATENDENTE = [
  "falar com humano",
  "falar com um humano",
  "falar com atendente",
  "falar com um atendente",
  "falar com uma pessoa",
  "passa pra um humano",
  "suporte humano",
  "atendimento humano",
  "quero reclamar"
];

function verificarGatilhoRapido(texto) {
  const t = texto.trim().toLowerCase();
  for (const gatilho of RESPOSTAS_RAPIDAS) {
    if (gatilho.regex.test(t)) {
      return gatilho.resposta;
    }
  }
  return null;
}

function clientePedeHumano(texto) {
  const t = texto.trim().toLowerCase();
  return TERMOS_ATENDENTE.some(termo => t.includes(termo));
}

module.exports = {
  verificarGatilhoRapido,
  clientePedeHumano
};
