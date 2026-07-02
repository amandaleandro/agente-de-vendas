// Diferentes estruturas de mensagens para cada perfil
const { selectPhrase, replaceVariables, getRandomItem } = require('./phrases-pool');

class MessageStructures {
  // Estrutura 1: Reconhecimento + Dados + Solução
  structure1(profile, data) {
    const opening = selectPhrase(profile, 'openings');
    const dataPoint = selectPhrase(profile, 'dataPoints');
    const observation = selectPhrase(profile, 'observations');
    const solution = selectPhrase(profile, 'solutions');
    const cta = selectPhrase(profile, 'ctas');

    const parts = [
      `Oi ${data.nome}! 👋`,
      opening,
      replaceVariables(dataPoint, data),
      observation + '.',
      solution + '.',
      cta
    ];

    return parts.filter(p => p && p.trim()).join('\n\n');
  }

  // Estrutura 2: Observação + Dados + Gatilho + Solução
  structure2(profile, data) {
    const observation = selectPhrase(profile, 'observations');
    const dataPoint = selectPhrase(profile, 'dataPoints');
    const solution = selectPhrase(profile, 'solutions');
    const cta = selectPhrase(profile, 'ctas');

    const parts = [
      `Olá ${data.nome}! 👉`,
      `${observation.toLowerCase()}`,
      `Pesquisei vocês e encontrei: ${replaceVariables(dataPoint, data)}.`,
      solution + '.',
      `\nTá interessado em explorar?`,
      cta
    ];

    return parts.filter(p => p && p.trim()).join('\n\n');
  }

  // Estrutura 3: Pergunta + Dados + Oportunidade + Proposta
  structure3(profile, data) {
    const opening = selectPhrase(profile, 'openings');
    const dataPoint = selectPhrase(profile, 'dataPoints');
    const solution = selectPhrase(profile, 'solutions');
    const cta = selectPhrase(profile, 'ctas');

    const questions = [
      `Como vocês tão capturando esses leads?`,
      `E como tá sendo o acompanhamento?`,
      `Quanto de lead tá escapando aí?`,
      `Qual é a maior dificuldade aí?`
    ];

    const parts = [
      `${data.nome}! 👀`,
      opening,
      `${replaceVariables(dataPoint, data)}...`,
      getRandomItem(questions),
      `Tenho uma ideia que pode ajudar.`,
      solution + '.',
      cta
    ];

    return parts.filter(p => p && p.trim()).join('\n\n');
  }

  // Estrutura 4: Benchmark + Dados + Comparação + Solução
  structure4(profile, data) {
    const opening = selectPhrase(profile, 'openings');
    const dataPoint = selectPhrase(profile, 'dataPoints');
    const solution = selectPhrase(profile, 'solutions');
    const cta = selectPhrase(profile, 'ctas');

    const benchmarks = [
      `Na maioria das vezes, empresas assim tão deixando 30% dos leads escaparem.`,
      `Normalmente, nesse estágio falta automação no atendimento.`,
      `Geralmente, falta estrutura pra responder todo mundo na velocidade que precisam.`,
      `Na maioria dos casos, o crescimento fica limitado pela falta de sistema.`
    ];

    const parts = [
      `Opa, ${data.nome}! 👋`,
      opening,
      replaceVariables(dataPoint, data),
      `\n${getRandomItem(benchmarks)}`,
      `E aí, você tá nessa situação também?`,
      solution + '.',
      cta
    ];

    return parts.filter(p => p && p.trim()).join('\n\n');
  }

  // Estrutura 5: Problema + Validação + Solução
  structure5(profile, data) {
    const observation = selectPhrase(profile, 'observations');
    const solution = selectPhrase(profile, 'solutions');
    const cta = selectPhrase(profile, 'ctas');

    const problems = {
      consolidated: `Aposto que o maior desafio agora é não perder velocidade no crescimento.`,
      established: `Imagino que o desafio seja escalar sem perder qualidade.`,
      emerging: `Aposto que você quer consolidar essa base de clientes.`,
      needs_improvement: `O maior desafio deve ser melhorar essa relação com os clientes.`,
      struggling: `Imagino que precisa reverter essa avaliação.`,
      invisible: `O desafio deve ser começar a aparecer de verdade.`,
      critical: `Esse é um momento crucial pra mudar a estratégia.`
    };

    const parts = [
      `Oi ${data.nome}! 🎯`,
      problems[profile] || problems.established,
      `É exatamente aí que posso ajudar.`,
      solution + '.',
      cta
    ];

    return parts.filter(p => p && p.trim()).join('\n\n');
  }

  // Estrutura 6: Story + Dados + Parallelo + Solução
  structure6(profile, data) {
    const dataPoint = selectPhrase(profile, 'dataPoints');
    const solution = selectPhrase(profile, 'solutions');
    const cta = selectPhrase(profile, 'ctas');

    const stories = {
      consolidated: `Vocês chegaram aonde estão porque fazem o trabalho certo. Agora é hora de escalar.`,
      established: `Vocês construíram uma base legal. A próxima fase é crescimento acelerado.`,
      emerging: `Vocês começaram bem. Agora é hora de acelerar.`,
      needs_improvement: `Vocês tiveram crescimento, mas tá faltando qualidade na entrega.`,
      struggling: `Vocês começaram, mas acho que pegou um caminho torto.`,
      invisible: `Vocês existem, mas o mercado não sabe disso ainda.`,
      critical: `Vocês têm potencial, mas precisa de um reset estratégico.`
    };

    const parts = [
      `${data.nome}! 👉`,
      stories[profile] || stories.established,
      `Pesquisei e vocês têm ${replaceVariables(dataPoint, data)}.`,
      `Vi vários casos parecidos com vocês que deram certo.`,
      solution + '.',
      cta
    ];

    return parts.filter(p => p && p.trim()).join('\n\n');
  }

  // Seleciona estrutura aleatória para garantir variedade
  generate(profile, data) {
    const structures = [
      this.structure1,
      this.structure2,
      this.structure3,
      this.structure4,
      this.structure5,
      this.structure6
    ];

    const randomStructure = getRandomItem(structures);
    return randomStructure.call(this, profile, data);
  }

  // Gera múltiplas variações (3-5)
  generateVariations(profile, data, count = 3) {
    const variations = [];
    for (let i = 0; i < count; i++) {
      variations.push(this.generate(profile, data));
    }
    return variations;
  }
}

module.exports = new MessageStructures();
