const nlpLocal = require('./nlp-local');

class RoteiroHeuristico {
  constructor() {
    this.etapasPorContato = new Map();
    this.ultimasRespostasPorContato = new Map(); // Track all responses to avoid repetition
    this.URL_DIAGNOSTICO = 'https://fechapro.com.br/diagnostico';
    this.URL_COMPRA_ANUAL = 'https://fechapro.com.br/auth/signup?plan=annual';

    // Alternativas para respostas comuns (expandidas para melhor conversão)
    this.alternativasPerguntasComuns = {
      'qual_gargalo': [
        'Qual é o seu maior problema então?',
        'Me diz: qual é seu principal desafio?',
        'Qual é a sua dor principal?',
        'Qual parte mais te irrita no processo?',
        'Qual é o seu maior obstáculo?',
        'Tá, qual é o gargalo mesmo que mais mexe com você?',
        'E qual é o pain point número 1 pro seu negócio?',
        'Me fala: se você pudesse resolver UM problema agora, qual seria?',
        'Qual é aquela coisa que te tira sono à noite?'
      ],
      'como_envia': [
        'E como você envia o orçamento hoje?',
        'Tipo de proposta que você manda, é como?',
        'Você manda como - só valor ou algo mais completo?',
        'Qual é seu formato de proposta?',
        'Você manda pelo WhatsApp, email, ou pessoalmente?',
        'Qual é sua estratégia agora - você liga antes, manda por email?',
        'Como você apresenta o valor pra ele - direto ou com contexto?',
        'Faz em PDF ou envia o valor pelo chat mesmo?'
      ],
      'cliente_some': [
        'O cliente costuma sumir depois da proposta?',
        'Ele some depois que você manda ou volta com dúvidas?',
        'Fica no silêncio mesmo?',
        'Você consegue acompanhar depois?',
        'Depois que você manda, o rádio fica mudo ou ele responde?',
        'Quanto tempo leva até o cliente responder normalmente?',
        'Você consegue saber se o cliente abriu a proposta?',
        'É comum ele pedir desconto ou quer mais tempo pra pensar?'
      ],
      'qual_problema': [
        'Então qual é exatamente seu problema?',
        'Qual é a principal dificuldade sua?',
        'E qual é o maior problema?',
        'Qual sua maior dor?',
        'Resumindo: qual é o principal desafio?',
        'Tá certo o que você tá me falando?',
        'Eu tô certo em entender assim?',
        'Então basicamente é isso que tá emperrando?'
      ],
      'objecao_preco': [
        'Entendo. Mas pensando bem, quanto você perde por mês com esse problema?',
        'Quanto você acha que deixa de faturar por essa deficiência?',
        'Tá, mas qual seria o impacto se você conseguisse fechar 3 vendas a mais por mês?',
        'Quantos "vou pensar" você escuta por mês que não viram vendas?'
      ],
      'objecao_tempo': [
        'Tá, leva 1 minuto pra você ver o diagnóstico e tirar suas conclusões. Vale a pena?',
        'Fica de olho então - mando agora e você vê quando tiver um tempinho',
        'Coloca no seu radar pra depois. Mando o link?'
      ]
    };

    // Explicações detalhadas sobre FechaPro (natural, persuasiva)
    this.explicacoesFechapro = `Olha só como funciona:

Você cria uma proposta profissional em 1 minuto (templates prontos, é só preencher).

O cliente recebe pelo WhatsApp - pode ver no navegador ou assinar direto.

E aqui é a mágica: você vê TUDO. Quem abriu, quanto tempo leu, se assinou ou recusou. Você sabe exatamente quando precisa fazer follow-up.

Resultado? Clientes fecham 3x mais rápido. Menos "vou pensar" e mais vendas mesmo.

Normalmente os nossos clientes veem uma melhoria de 40-60% no ciclo de venda nos primeiros 30 dias.

Quer fazer um teste? Aqui: ${this.URL_DIAGNOSTICO}

(Leva 3 minutos e você vê exatamente o quanto você tá deixando de faturar por mês)
    `;
  }

  async inicializar() {
    await nlpLocal.inicializar();
  }

  obterHistoricoResumido(mensagens) {
    if (!mensagens || mensagens.length === 0) return '';

    const ultimasMsgs = mensagens.slice(-4).map(msg => {
      const quem = msg.fromMe ? 'bot' : 'cliente';
      return `${quem}: ${(msg.text || '').substring(0, 100)}`;
    }).join('\n');

    return ultimasMsgs;
  }

  ehRespostaRepetida(telefone, resposta) {
    const historico = this.ultimasRespostasPorContato.get(telefone) || [];
    // Normaliza removendo pontuação e espaços extras, pega primeiras palavras
    const respostaNormalizada = resposta
      .toLowerCase()
      .replace(/[?.!,;]/g, '')
      .trim()
      .substring(0, 80); // Aumentado para melhor detecção

    return historico.some(r => {
      const rNormalizada = r
        .toLowerCase()
        .replace(/[?.!,;]/g, '')
        .trim()
        .substring(0, 80);
      return rNormalizada === respostaNormalizada;
    });
  }

  registrarResposta(telefone, resposta) {
    const historico = this.ultimasRespostasPorContato.get(telefone) || [];
    // Não adiciona se já existe
    if (!this.ehRespostaRepetida(telefone, resposta)) {
      historico.push(resposta);
      // Mantém histórico de até 50 respostas por contato
      if (historico.length > 50) historico.shift();
      this.ultimasRespostasPorContato.set(telefone, historico);
    }
  }

  obterAlternativaQuandoRepetida(telefone, tipoAlternativa) {
    const alternativas = this.alternativasPerguntasComuns[tipoAlternativa] || [];
    if (alternativas.length === 0) return null;

    // Tenta encontrar uma alternativa que ainda não foi usada
    const respostasUsadas = this.ultimasRespostasPorContato.get(telefone) || [];
    const alternativaDisponivel = alternativas.find(alt => !this.ehRespostaRepetida(telefone, alt));

    if (alternativaDisponivel) {
      this.registrarResposta(telefone, alternativaDisponivel);
      return alternativaDisponivel;
    }

    // Se todas as alternativas foram usadas, retorna uma aleatória
    const resposta = alternativas[Math.floor(Math.random() * alternativas.length)];
    return resposta;
  }

  ehObjecao(texto) {
    const palavrasObjecao = ['caro', 'custa muito', 'precio', 'valor', 'não tenho tempo', 'ocupado', 'depois', 'pensa', 'acho que não', 'não serve', 'já temos', 'tenho outro', 'preciso pensar'];
    const textoLower = texto.toLowerCase();
    return palavrasObjecao.some(p => textoLower.includes(p));
  }

  ehDesinteresse(texto) {
    const palavrasDesinteresse = ['não quero', 'não serve', 'não preciso', 'para aqui', 'sai', 'saiiiir', 'bloquear', 'remover lista', 'não mais', 'chega'];
    const textoLower = texto.toLowerCase();
    return palavrasDesinteresse.some(p => textoLower.includes(p));
  }

  async gerarResposta(texto, telefone, identidade = { nome: 'Amanda' }, historicMensagens = []) {
    const etapaAtual = this.etapasPorContato.get(telefone) || 'apresentacao';
    const analise = await nlpLocal.processar(texto);
    let intencao = analise.intencao;
    const confianca = analise.score;

    if (intencao === 'None' || confianca < 0.3) {
      intencao = 'desconhecido';
    }

    // Sempre respeitar desinteresse explícito
    if (this.ehDesinteresse(texto)) {
      this.etapasPorContato.set(telefone, 'encerrado');
      return 'Tudo bem! Sem problema. Qualquer coisa, só chamar. Abraço!';
    }

    if (intencao === 'desinteresse') {
      this.etapasPorContato.set(telefone, 'encerrado');
      return 'Tranquilo, sem problema. Qualquer coisa é só me chamar!';
    }

    if (etapaAtual === 'encerrado') {
      return 'Sem problema!';
    }

    // Handling de objeção
    if (this.ehObjecao(texto) && etapaAtual === 'perguntou_produto') {
      this.etapasPorContato.set(telefone, 'objecao');

      if (texto.toLowerCase().includes('caro') || texto.toLowerCase().includes('custa')) {
        const alt = this.obterAlternativaQuandoRepetida(telefone, 'objecao_preco');
        return alt || 'Entendo. Mas quantas vendas você tá deixando de fazer por mês? Porque geralmente o prejuízo é bem maior que o investimento.';
      }

      if (texto.toLowerCase().includes('tempo') || texto.toLowerCase().includes('ocupado')) {
        const alt = this.obterAlternativaQuandoRepetida(telefone, 'objecao_tempo');
        return alt || 'Tá, nesse caso só gasta 3 minutos pra você tirar suas conclusões. Mando o link e você vê quando tiver um tempinho?';
      }
    }

    if (intencao === 'negatividade') {
      return 'Opa, entendo. Deixa eu ser direto: qual é mesmo seu maior gargalo - é o cliente não responder depois da proposta ou outro problema?';
    }

    if (intencao === 'teste_bot') {
      return 'Boa! Sim, sou assistente. Tô tentando entender seu negócio. Depois que você manda um orçamento, o cliente costuma sumir ou volta com dúvidas?';
    }

    // Verificar se já perguntou algo parecido no histórico
    const perguntasAnteriores = historicMensagens
      .filter(msg => msg.fromMe)
      .map(msg => msg.text || '')
      .join(' ')
      .toLowerCase();

    const jaFezPerguntaSobreOrcamento = perguntasAnteriores.includes('orcamento') || perguntasAnteriores.includes('proposta');
    const jaFezPerguntaSobreVolume = perguntasAnteriores.includes('quantos') || perguntasAnteriores.includes('semana');

    if (intencao === 'preco' || intencao === 'duvida_produto' || intencao === 'urgencia') {
      this.etapasPorContato.set(telefone, 'perguntou_produto');

      // Se quer conhecer melhor como funciona
      if (texto.toLowerCase().includes('como') || texto.toLowerCase().includes('explica') || texto.toLowerCase().includes('me mostra') || texto.toLowerCase().includes('detalhes')) {
        this.registrarResposta(telefone, this.explicacoesFechapro);
        return this.explicacoesFechapro;
      }

      if (jaFezPerguntaSobreVolume) {
        return `Claro! O FechaPro ajuda você a montar propostas melhores e acompanhar. Deixa eu te enviar um diagnóstico rápido pra você ver onde seu processo tá emperrando? ${this.URL_DIAGNOSTICO}`;
      }

      return `Sim! Basicamente ajuda a organizar seus orçamentos e acompanhamento. Mas primeiro me diz - quantos orçamentos você costuma mandar por semana?`;
    }

    if (intencao === 'concorrente') {
      this.etapasPorContato.set(telefone, 'dor');
      return 'Entendo. E a ferramenta que você usa hoje, ela resolve bem o acompanhamento depois que você manda a proposta ou fica muito na mão mesmo?';
    }

    if (intencao === 'volume_alto') {
      this.etapasPorContato.set(telefone, 'dor');
      return 'Com esse volume, até uma pequena melhoria no acompanhamento muda bastante. Você consegue acompanhar quem abriu, quem respondeu ou precisa de follow-up?';
    }

    if (etapaAtual === 'apresentacao') {
      let resposta = '';

      if (intencao === 'saudacao') {
        const opcoes = [
          `Opa! Aqui é ${identidade.nome}. Deixa eu te perguntar algo rápido: depois que você manda uma proposta, o cliente costuma sumir ou volta com dúvidas?`,
          `E aí! Sou ${identidade.nome}. Qual é seu maior problema no momento - é captar cliente, fazer proposta ou fechar a venda mesmo?`,
          `Oi! Sou ${identidade.nome}. Rápido: o cliente costuma demorar pra responder depois do orçamento?`
        ];
        resposta = opcoes[Math.floor(Math.random() * opcoes.length)];
      } else if (['afirmacao_positiva', 'dor_some', 'dor_desconto'].includes(intencao)) {
        this.etapasPorContato.set(telefone, 'dor');

        if (intencao === 'afirmacao_positiva') {
          const opcoes = [
            'Pois é, isso é super comum. Você manda a proposta e fica no vácuo. Aí qual que é - o cliente não vê valor ou não consegue entrar em contato depois?',
            'Tá, então o cliente desaparece depois da proposta. É sempre assim ou tem alguns que voltam?',
            'Entendo. Qual é a maior dificuldade - fazer o cliente entender o valor ou fazer ele responder depois?'
          ];
          resposta = opcoes[Math.floor(Math.random() * opcoes.length)];
        } else {
          const opcoes = [
            'Isso é problema de duas coisas: ou o cliente não vê valor, ou falta follow-up certo. Qual você sente mais?',
            'Tá, então basicamente é falta de acompanhamento? Você consegue saber se o cliente abriu a proposta?',
            'Então o cliente desiste por preço ou por falta de retorno mesmo?'
          ];
          resposta = opcoes[Math.floor(Math.random() * opcoes.length)];
        }
      } else if (jaFezPerguntaSobreOrcamento) {
        resposta = 'Tá. Qual é a principal barreira - captar, fazer proposta, ou fechar?';
      } else {
        resposta = 'Qual é seu maior problema agora - é o cliente não responder, achar caro, ou outra coisa?';
      }

      if (this.ehRespostaRepetida(telefone, resposta)) {
        const alt = this.obterAlternativaQuandoRepetida(telefone, 'qual_gargalo');
        if (alt) return alt;
      }

      this.registrarResposta(telefone, resposta);
      return resposta;
    }

    if (etapaAtual === 'dor') {
      if (['dor_some', 'dor_desconto', 'afirmacao_positiva', 'desconhecido'].includes(intencao)) {
        this.etapasPorContato.set(telefone, 'diagnostico');
        const jaFezPerguntaSobreApresentacao = perguntasAnteriores.includes('apresenta') || perguntasAnteriores.includes('proposta completa');

        let resposta = '';
        if (jaFezPerguntaSobreApresentacao) {
          resposta = 'Tá claro. Você manda proposta, mas falta um acompanhamento melhor. Você controla quem abriu, leu ou precisa de um empurrão?';
        } else {
          resposta = 'Entendo. Mas me diz - você manda só o valor no WhatsApp ou manda uma proposta mais completa?';
        }

        if (this.ehRespostaRepetida(telefone, resposta)) {
          const alt = this.obterAlternativaQuandoRepetida(telefone, 'como_envia');
          if (alt) return alt;
        }

        this.registrarResposta(telefone, resposta);
        return resposta;
      }
    }

    if (etapaAtual === 'diagnostico') {
      this.etapasPorContato.set(telefone, 'permissao_produto');
      const resposta = 'Então o problema não é tanto o preço em si, mas o cliente não ver o valor e você não conseguir acompanhar direito. Tá certo?';

      if (this.ehRespostaRepetida(telefone, resposta)) {
        const alt = this.obterAlternativaQuandoRepetida(telefone, 'qual_problema');
        if (alt) return alt;
      }

      this.registrarResposta(telefone, resposta);
      return resposta;
    }

    if (etapaAtual === 'permissao_produto') {
      if (['afirmacao_positiva', 'duvida_produto', 'preco', 'urgencia'].includes(intencao)) {
        this.etapasPorContato.set(telefone, 'perguntou_produto');

        const opcoes = [
          `Ótimo! O FechaPro é bem simples: você cria propostas em 1 minuto e acompanha quem abriu, quanto leu, se assinou. Quer fazer um teste rápido? ${this.URL_DIAGNOSTICO}`,
          `Perfeito. Basicamente a gente te mostra como você tá deixando de faturar por mês. Aqui tem um diagnóstico rápido (3 min): ${this.URL_DIAGNOSTICO}`,
          `Show! O sistema cria propostas profissionais e te mostra TUDO que o cliente faz com elas. Quer ver como fica pra você? ${this.URL_DIAGNOSTICO}`,
          `Excelente! Deixa eu te mostrar na prática. Aqui você vê o impacto pra seu negócio: ${this.URL_DIAGNOSTICO}`
        ];

        const resposta = opcoes[Math.floor(Math.random() * opcoes.length)];

        if (this.ehRespostaRepetida(telefone, resposta)) {
          const alt = `Manda um diagnóstico aqui? Gasta 3 minutos e você vê o potencial: ${this.URL_DIAGNOSTICO}`;
          this.registrarResposta(telefone, alt);
          return alt;
        }

        this.registrarResposta(telefone, resposta);
        return resposta;
      }

      const opcoes = [
        'Tá bom. O que você sente que mais compromete suas vendas?',
        'Entendo. Qual é então a maior dor - é vender ou acompanhar depois?',
        'Tudo certo. Me diz: qual seria o impacto se você conseguisse fechar 3 vendas a mais por mês?'
      ];

      const respostaPadrao = opcoes[Math.floor(Math.random() * opcoes.length)];

      if (this.ehRespostaRepetida(telefone, respostaPadrao)) {
        const alt = this.obterAlternativaQuandoRepetida(telefone, 'qual_gargalo');
        if (alt) return alt;
      }

      this.registrarResposta(telefone, respostaPadrao);
      return respostaPadrao;
    }

    // Resposta padrão quando não consegue classificar
    let resposta = 'Qual parte da venda mais emperrada pra você - é a proposta, o preço, ou o cliente não voltar depois?';

    if (this.ehRespostaRepetida(telefone, resposta)) {
      const alternativas = [
        'Mas me diz então: qual é seu principal problema?',
        'Então qual é a principal dificuldade sua?',
        'E aí, qual seu maior desafio?',
        'Me fala então: qual é mesmo seu gargalo?',
        'Qual é o número 1 na sua lista de problemas?',
        'Se você pudesse resolver UMA coisa agora, qual seria?'
      ];
      resposta = alternativas[Math.floor(Math.random() * alternativas.length)];
    }

    this.registrarResposta(telefone, resposta);
    return resposta;
  }
}

module.exports = new RoteiroHeuristico();
