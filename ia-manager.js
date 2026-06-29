const { GoogleGenerativeAI } = require('@google/generative-ai');

// Variáveis globais para controlar qual IA usar
let iaAtual = process.env.IA_PROVIDER === 'auto' ? 'gemini' : process.env.IA_PROVIDER;
let tentativasFalhadas = { gemini: 0, xai: 0 };
const MAX_TENTATIVAS = 3;

console.log(`🤖 IA Manager: Modo ${process.env.IA_PROVIDER === 'auto' ? 'AUTO (alterna)' : 'FIXO (' + iaAtual + ')'}`);

// Inicializar cliente Gemini
const geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Função para chamar Gemini
async function chamarGemini(prompt) {
  try {
    const model = geminiClient.getGenerativeModel({
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash'
    });

    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 1024,
      }
    });

    if (!result.response) {
      throw new Error('Resposta vazia do Gemini');
    }

    const text = result.response.text();
    tentativasFalhadas.gemini = 0; // Reset de tentativas
    return { texto: text, ia: 'Gemini' };
  } catch (erro) {
    const mensagem = erro.message || '';

    // Se for erro de quota, alterna para XAI
    if (mensagem.includes('429') || mensagem.includes('RESOURCE_EXHAUSTED') || mensagem.includes('quota')) {
      tentativasFalhadas.gemini++;
      console.log(`⚠️  Gemini: Quota atingida! Tentativa ${tentativasFalhadas.gemini}/${MAX_TENTATIVAS}`);

      if (process.env.IA_PROVIDER === 'auto' && tentativasFalhadas.gemini >= MAX_TENTATIVAS) {
        console.log(`🔄 Alternando para XAI...`);
        iaAtual = 'xai';
      }
    }

    throw erro;
  }
}

// Função para chamar XAI
async function chamarXAI(prompt) {
  try {
    const fetch = (await import('node-fetch')).default;

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.XAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'grok-2-vision-1212',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1024
      })
    });

    const data = await response.json();

    if (!response.ok) {
      const mensagem = data.error?.message || '';

      if (response.status === 429 || mensagem.includes('quota') || mensagem.includes('rate')) {
        tentativasFalhadas.xai++;
        console.log(`⚠️  XAI: Quota atingida! Tentativa ${tentativasFalhadas.xai}/${MAX_TENTATIVAS}`);

        if (process.env.IA_PROVIDER === 'auto' && tentativasFalhadas.xai >= MAX_TENTATIVAS) {
          console.log(`🔄 Alternando para Gemini...`);
          iaAtual = 'gemini';
        }
      }

      throw new Error(`XAI Error: ${data.error?.message || 'Erro desconhecido'}`);
    }

    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Resposta vazia do XAI');
    }

    tentativasFalhadas.xai = 0; // Reset de tentativas
    return { texto: data.choices[0].message.content, ia: 'XAI' };
  } catch (erro) {
    throw erro;
  }
}

// Função principal que alterna automaticamente
async function gerarResposta(prompt, tentativas = 0) {
  const MAX_TENTATIVAS_TOTAL = 5;

  if (tentativas >= MAX_TENTATIVAS_TOTAL) {
    console.error('❌ Ambas as IAs falharam. Tentando novamente em 10 segundos...');
    throw new Error('Todas as IAs falharam');
  }

  try {
    let resultado;

    if (iaAtual === 'gemini') {
      console.log(`📨 Usando: Gemini`);
      resultado = await chamarGemini(prompt);
    } else {
      console.log(`📨 Usando: XAI`);
      resultado = await chamarXAI(prompt);
    }

    return resultado;
  } catch (erro) {
    console.log(`⚠️  Erro com ${iaAtual}: ${erro.message}`);

    // Alternar para outra IA
    if (process.env.IA_PROVIDER === 'auto') {
      iaAtual = iaAtual === 'gemini' ? 'xai' : 'gemini';
      console.log(`🔄 Tentando com ${iaAtual}...`);

      // Aguardar 2 segundos antes de tentar novamente
      await new Promise(resolve => setTimeout(resolve, 2000));

      return gerarResposta(prompt, tentativas + 1);
    } else {
      throw erro;
    }
  }
}

// Exportar função principal
module.exports = {
  gerarResposta,
  getIaAtual: () => iaAtual,
  getTentativas: () => tentativasFalhadas
};
