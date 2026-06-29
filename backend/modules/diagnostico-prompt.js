// Gerador de prompts para diagnósticos
class DiagnosticoPrompt {
  constructor() {
    this.prompts = {};
  }

  obterPromptSistema() {
    return `Você é a Fezinha, assistente comercial do FechaPro.

O usuário chegou após preencher o diagnóstico comercial no site do FechaPro.

REGRAS OBRIGATÓRIAS:
1. Nunca refaça perguntas já respondidas no diagnóstico.
2. Comece confirmando que encontrou o resultado do diagnóstico.
3. Informe a nota geral de forma clara, sem humilhar ou assustar.
4. Explique o principal gargalo em linguagem simples e com impacto.
5. Mostre impacto comercial provável (clientes desistem, propostas não avançam, etc).
6. Apresente somente recursos do FechaPro relacionados ao resultado.
7. Faça no máximo uma pergunta complementar por mensagem.
8. Depois de entender urgência, recomende o plano mais adequado.
9. Explique por que o plano é adequado para o caso específico.
10. Use apenas valores e condições da base oficial.
11. Quando cliente escolher, conduza para pagamento/contração.
12. Se houver dúvida específica, irritação, negociação ou desconto, transfira para atendimento humano.

FLUXO:
Interpretar resultado → confirmar o problema → explicar o impacto → apresentar a solução → recomendar plano → tratar objeção → fechamento.`;
  }

  construirPromptComContexto(diagnostico) {
    const {
      nome,
      empresa,
      segmento,
      nota_geral,
      nota_presenca_confianca,
      nota_atendimento,
      nota_apresentacao,
      nota_fechamento,
      principal_gargalo,
      categoria,
      dor_principal,
      solucao_prioritaria,
      recomendacoes,
      diagnostico_id
    } = diagnostico;

    let contexto = `
CONTEXTO DO DIAGNÓSTICO:
- Código: ${diagnostico_id}
- Nome: ${nome || 'Cliente'}
- Empresa: ${empresa || 'Não informado'}
- Segmento: ${segmento || 'Não informado'}
- Nota geral: ${nota_geral}/100
- Presença e confiança: ${nota_presenca_confianca}/100
- Atendimento: ${nota_atendimento}/100
- Apresentação: ${nota_apresentacao}/100
- Fechamento: ${nota_fechamento}/100
- Principal gargalo: ${principal_gargalo}
- Categoria: ${categoria}
- Dor principal: ${dor_principal}
- Solução prioritária: ${solucao_prioritaria}

PRIMEIRA RESPOSTA DO BOT:
Você deve começar confirmando o resultado e explicando o gargalo.
Aqui está um exemplo de como abordar:
`;

    if (categoria === 'LEAD_PRESENCA') {
      contexto += `
"Oi, ${nome || 'tudo bem'}! 👋

Encontrei seu diagnóstico. Sua empresa ficou com ${nota_geral} pontos de estrutura comercial.

O maior problema apareceu em presença e confiança (${nota_presenca_confianca} pontos). Isso significa que alguns clientes podem estar desistindo antes mesmo de chamar, por não encontrarem informações suficientes ou não confiarem o bastante para escolher sua empresa.

Vou te mostrar como corrigir isso. Respondendo bem rápido: sua empresa já tem um site ou presença forte no Google?"`;
    } else if (categoria === 'LEAD_ATENDIMENTO') {
      contexto += `
"Oi, ${nome || 'tudo bem'}! 👋

Encontrei seu diagnóstico. Sua empresa ficou com ${nota_geral} pontos de estrutura comercial.

O principal desafio está no atendimento (${nota_atendimento} pontos). O cliente encontra a empresa e entra em contato, mas a conversa nem sempre avança para um próximo passo claro.

Vou te explicar como conduzir melhor. Me diga: qual é a sua maior dificuldade nessa conversa? Clientes perguntam e não respondem mais, ou eles precisam de muita insistência?"`;
    } else if (categoria === 'LEAD_APRESENTACAO') {
      contexto += `
"Oi, ${nome || 'tudo bem'}! 👋

Encontrei seu diagnóstico. Sua empresa ficou com ${nota_geral} pontos de estrutura comercial.

O gargalo está na apresentação (${nota_apresentacao} pontos). O cliente recebe informações, mas pode não enxergar claramente o diferencial, o valor e por que deveria escolher você.

Vou te mostrar a solução. Quando você envia um orçamento, ele costuma ser um PDF simples ou tem mais contexto sobre o serviço?"`;
    } else if (categoria === 'LEAD_FECHAMENTO') {
      contexto += `
"Oi, ${nome || 'tudo bem'}! 👋

Encontrei seu diagnóstico. Sua empresa ficou com ${nota_geral} pontos de estrutura comercial.

O grande desafio apareceu no fechamento (${nota_fechamento} pontos). O seu processo perde força depois que a proposta é enviada.

Vou te ajudar a organizar isso. Pergunta importante: você sabe quantas propostas estão abertas agora, esperando resposta?"`;
    } else if (categoria === 'LEAD_ESTRUTURA_COMPLETA') {
      contexto += `
"Oi, ${nome || 'tudo bem'}! 👋

Encontrei seu diagnóstico. Sua empresa ficou com ${nota_geral} pontos.

O resultado não mostra apenas um problema isolado. Existem perdas antes (presença: ${nota_presenca_confianca}), durante (atendimento: ${nota_atendimento}, apresentação: ${nota_apresentacao}) e depois do contato (fechamento: ${nota_fechamento}).

Por isso, a melhor opção é montar a estrutura comercial completa. Deixa eu entender sua situação: qual é a maior frustração hoje? Falta de clientes, clientes que sumiram, ou propostas que não viram vendas?"`;
    }

    contexto += `

PRÓXIMAS ETAPAS:
1. Deixar o cliente confortável com o diagnóstico
2. Fazer pergunta complementar relacionada ao gargalo
3. Apresentar as prioridades específicas para ${empresa || 'sua empresa'}
4. Recomendar o plano (mensal, anual ou vitalício) baseado na urgência
5. Conduzir para pagamento quando o cliente demonstrar interesse

INFORMAÇÕES OFICIAIS DO FECHAPRO:
- Mensal: R$ 97 (teste com baixo compromisso)
- Anual: R$ 997 com implantação e treinamento (12 meses de acompanhamento)
- Vitalício: R$ 1.397 (acesso para sempre, sem mensalidade)

A recomendação varia conforme a urgência e quantas áreas precisam ser corrigidas.`;

    return contexto;
  }

  gerarArgumentoPresenca(diagnostico) {
    return `Seu maior problema acontece antes do contato.

O cliente procura, encontra poucas informações ou não entende por que deveria escolher sua empresa. Por isso, a prioridade é:

1. Organizar como você aparece no Google (Google Meu Negócio otimizado)
2. Criar uma página que explique serviços e diferenciais
3. Mostrar provas: trabalhos, depoimentos, certificações com clareza
4. Centralizar formas de contato para facilitar a busca do cliente

O FechaPro consegue montar essa estrutura junto com o processo completo de atendimento, proposta e fechamento.`;
  }

  gerarArgumentoAtendimento(diagnostico) {
    return `Seu diagnóstico mostra que os clientes chegam, mas a conversa nem sempre conduz para um próximo passo.

Nesse caso, o FechaPro ajuda a:
1. Organizar qualificação: fazer as perguntas certas no momento certo
2. Estruturar mensagens que avancem a conversa
3. Preparar apresentação do serviço com confiança
4. Facilitar a passagem para proposta sem perder o cliente

Com isso, mais conversas viram propostas, e mais propostas viram vendas.`;
  }

  gerarArgumentoApresentacao(diagnostico) {
    return `O cliente recebe informações, mas pode não enxergar claramente os diferenciais, provas e valor do serviço.

A prioridade é substituir o orçamento solto por uma apresentação profissional com:
1. Serviços explicados com clareza
2. Portfólio e depoimentos relevantes
3. Diferenciais seus vs concorrência
4. Condições e próximos passos bem definidos

Uma proposta bem estruturada aumenta significativamente as chances de aceite.`;
  }

  gerarArgumentoFechamento(diagnostico) {
    return `Seu processo perde força depois que a proposta é enviada.

Você precisa saber:
1. Quem abriu a proposta e quando
2. Quem está aguardando retorno vs. já decidiu não
3. Qual é o momento certo para fazer follow-up
4. Como conduzir o aceite, contrato e pagamento

O FechaPro organiza tudo isso automaticamente, reduzindo propostas perdidas e aumentando a taxa de fechamento.`;
  }

  gerarArgumentoEstruturaCompleta(diagnostico) {
    return `Seu resultado não mostra apenas um problema isolado.

Existem perdas antes, durante e depois do contato. Por isso, tentar corrigir somente a proposta ou somente o Google deixaria outras etapas abertas e você seguiria perdendo clientes em vários pontos.

A melhor opção é montar a estrutura comercial completa:
1. Presença profissional que atrai clientes
2. Atendimento organizado que avança a venda
3. Proposta profissional que comunica valor
4. Follow-up e fechamento automatizado

Assim, cada etapa funciona e nada é deixado ao acaso.`;
  }

  gerarRecomendacaoPlanou(categoria, diagnostico) {
    const { nome, empresa } = diagnostico;

    if (categoria === 'LEAD_ESTRUTURA_COMPLETA' || diagnostico.nota_geral < 40) {
      return `
Pelo seu diagnóstico, você precisa corrigir várias etapas e acompanhar a implantação de perto.

Por isso, o **plano anual** é o mais indicado. Ele inclui:
- 12 meses de acesso
- Implantação completa da estrutura
- Processo de atendimento estruturado
- Mensagens e templates prontos
- Follow-up automático
- Treinamento inicial

**Investimento: R$ 997 à vista ou parcelado.**

Esse período é suficiente para você ver resultados e depois decidir continuar ou não.`;
    } else if (diagnostico.nota_geral < 50) {
      return `
Para começar a corrigir seus problemas comerciais, o **plano anual** oferece o melhor custo-benefício:
- Dedicação real durante 12 meses
- Suporte e ajustes conforme necessário
- Resultados concretos dentro de 3-4 meses

**Investimento: R$ 997 à vista ou parcelado.**

Depois, você pode decidir se continua com o anual ou vai pro vitalício.`;
    } else {
      return `
Você pode começar com o **plano mensal** por R$ 97, testar como funciona no seu negócio e cancelar quando quiser.

Ou já partir pro **plano anual** (R$ 997) se quiser mais suporte e implantação mais robusta.

Qual faz mais sentido para o seu momento?`;
    }
  }

  gerarPerguntaComplementar(categoria) {
    const perguntas = {
      LEAD_PRESENCA: "Sua empresa já tem um site ou está nos principais apps de busca?",
      LEAD_ATENDIMENTO: "Qual é sua maior dificuldade agora: clientes não respondem ou você precisa insistir muito?",
      LEAD_APRESENTACAO: "Você envia orçamentos? Como são estruturados hoje?",
      LEAD_FECHAMENTO: "Você tem ideia de quantas propostas estão abertas agora?",
      LEAD_ESTRUTURA_COMPLETA: "Qual é a maior frustração hoje: falta de clientes, clientes sumirem ou propostas não virarem vendas?",
    };

    return perguntas[categoria] || "Como você vê sua situação comercial hoje?";
  }
}

module.exports = DiagnosticoPrompt;
