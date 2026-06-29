// Tratamento de objeções comerciais
class ObjecaoHandler {
  constructor() {
    this.objecoes = new Map(); // telefone -> [objecoes]
  }

  identificarObjecao(texto) {
    const t = String(texto || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

    // Objeção de preço
    if (['caro', 'muito caro', 'nao cabe no orcamento', 'nao tenho grana', 'nao tenho dinheiro', 'custa muito'].some(p => t.includes(p))) {
      return 'PRECO';
    }

    // Objeção de timing/momento
    if (['vou pensar', 'nao eh o momento', 'deixa pra depois', 'proxima vez', 'agora nao', 'depois eu vejo'].some(p => t.includes(p))) {
      return 'MOMENTO';
    }

    // Objeção de confiança
    if (['nao conheço', 'nunca ouvi falar', 'nao parece confiavel', 'nao tenho certeza', 'tem gente usando'].some(p => t.includes(p))) {
      return 'CONFIANCA';
    }

    // Objeção de produto (acha que nao serve)
    if (['nao acho que vai funcionar', 'nao serve pro meu caso', 'my negocio eh diferente', 'nao eh pra mim'].some(p => t.includes(p))) {
      return 'PRODUTO';
    }

    // Objeção de alternativa (usa outra coisa)
    if (['ja uso outro', 'ja tenho coisa', 'ja uso whatsapp', 'to usando', 'tenho um sistema'].some(p => t.includes(p))) {
      return 'ALTERNATIVA';
    }

    // Objeção de tempo (falta tempo pra configurar)
    if (['nao tenho tempo', 'muito complicado', 'muito tecnico', 'nao entendo', 'muito dificil'].some(p => t.includes(p))) {
      return 'COMPLEXIDADE';
    }

    return null;
  }

  tratarObjecao(objecaoTipo, leadData, baseConhecimento = '') {
    const respostas = {
      PRECO: this.tratarPreco(leadData, baseConhecimento),
      MOMENTO: this.tratarMomento(leadData),
      CONFIANCA: this.tratarConfianca(leadData),
      PRODUTO: this.tratarProduto(leadData, baseConhecimento),
      ALTERNATIVA: this.tratarAlternativa(leadData, baseConhecimento),
      COMPLEXIDADE: this.tratarComplexidade(leadData, baseConhecimento),
    };

    return respostas[objecaoTipo] || null;
  }

  tratarPreco(leadData, baseConhecimento) {
    return {
      tipo: 'PRECO',
      resposta: `Entendo que preço importa. Mas pensa só: qual é o valor médio de UMA venda no seu negócio?\n\nPorque R$ 109,90/mês (Presença) ou R$ 347,90/mês (Performance) é ZERO se você recuperar apenas UMA venda que atualmente fica perdida.\n\nOu prefere pagar uma única vez? Temos vitalício também.`,
      proximaPergunta: 'Qual é seu ticket médio? Mensal ou vitalício faz mais sentido?',
      estrategia: 'ROI imediato: 1 venda recuperada já paga vários meses',
    };
  }

  tratarMomento(leadData) {
    return {
      tipo: 'MOMENTO',
      resposta: `Verdade. Mas aqui tem uma coisa: enquanto você está pensando, você continua perdendo vendas todo dia por falta de organização.\n\nO legal é que FechaPro tem 7 dias de garantia. Você começa, vê como é na prática, e se não gostar, tem reembolso integral.\n\nPor que não começar agora e pensar enquanto já está organizando?`,
      proximaPergunta: 'Qual plano você quer experimentar?',
      estrategia: 'Transforma "vou pensar" em ação imediata (com garantia = sem risco)',
    };
  }

  tratarConfianca(leadData) {
    return {
      tipo: 'CONFIANCA',
      resposta: `Confiança é TUDO. Justamente por isso temos dois caminhos:\n\n1️⃣ Faça nosso diagnóstico gratuito (3 min) que mostra como você poderia usar o FechaPro.\n\n2️⃣ Ou comece direto com 7 dias de garantia (reembolso integral se não gostar).\n\nOu quer que eu mostre um exemplo prático?`,
      proximaPergunta: 'Qual desses te deixa mais confortável?',
      estrategia: 'Dar múltiplas opções mas todas levando ao comprometimento',
      url_diagnostico: 'https://fechapro.com.br/diagnostico',
    };
  }

  tratarProduto(leadData, baseConhecimento) {
    return {
      tipo: 'PRODUTO',
      resposta: `Essa é uma observação importante. Muitas vezes o negócio parece único, mas o processo de venda é parecido em todos os serviços.\n\nO FechaPro organiza o caminho do cliente desde o primeiro contato até o pagamento. Você pode adaptar as propostas, textos e estrutura para seu tipo específico.`,
      proximaPergunta: 'Se eu mostrasse exatamente como seria pro seu serviço, você teria mais clareza?',
      estrategia: 'Validar a singularidade mas reposicionar para o universal (processo de venda)',
    };
  }

  tratarAlternativa(leadData, baseConhecimento) {
    return {
      tipo: 'ALTERNATIVA',
      resposta: `O WhatsApp continua sendo o canal de conversa com seus clientes.\n\nO FechaPro entra para organizar o que normalmente fica perdido nele: apresentação do serviço, proposta profissional, acompanhamento, aceite, contrato e pagamento.\n\nÉ como colocar uma estrutura profissional dentro do WhatsApp.`,
      proximaPergunta: 'Faz sentido colocar isso junto do que você já usa?',
      estrategia: 'Posicionar FechaPro como complemento (não concorrente) do que já usa',
    };
  }

  tratarComplexidade(leadData, baseConhecimento) {
    return {
      tipo: 'COMPLEXIDADE',
      resposta: `Essa é uma preocupação muito comum, e é exatamente por isso que a implantação existe.\n\nA estrutura inicial é organizada junto com você, usando seus serviços, identidade e informações da sua empresa.\n\nVocê não precisa fazer isso sozinho.`,
      proximaPergunta: 'Se tivéssemos uma aula inicial pra você aprender, você topava começar?',
      estrategia: 'Tranquilizar com implantação guiada e suporte',
    };
  }

  registrarObjecao(telefone, objecaoTipo, resposta) {
    if (!this.objecoes.has(telefone)) {
      this.objecoes.set(telefone, []);
    }
    this.objecoes.get(telefone).push({
      tipo: objecaoTipo,
      timestamp: new Date().toISOString(),
      resposta,
    });
  }

  obterObjecoes(telefone) {
    return this.objecoes.get(telefone) || [];
  }

  objecaoJaTratada(telefone, objecaoTipo) {
    const objecoes = this.objecoes.get(telefone) || [];
    return objecoes.some(o => o.tipo === objecaoTipo);
  }

  proximaPergunta(objecaoTipo, leadData) {
    const tratamento = this.tratarObjecao(objecaoTipo, leadData);
    return tratamento?.proximaPergunta || 'Como posso ajudar?';
  }
}

module.exports = ObjecaoHandler;
