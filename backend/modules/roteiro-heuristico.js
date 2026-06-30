const nlpLocal = require('./nlp-local');

class RoteiroHeuristico {
  constructor() {
    this.etapasPorContato = new Map();
    this.ultimasRespostasPorContato = new Map(); // Track all responses to avoid repetition
    this.URL_DIAGNOSTICO = 'https://fechapro.com.br/diagnostico';
    this.URL_COMPRA_ANUAL = 'https://fechapro.com.br/auth/signup?plan=annual';

    // Alternativas para respostas comuns
    this.alternativasPerguntasComuns = {
      'qual_gargalo': [
        'Qual é o seu maior problema então?',
        'Me diz: qual é seu principal desafio?',
        'Qual é a sua dor principal?',
        'Qual parte mais te irrita no processo?',
        'Qual é o seu maior obstáculo?'
      ],
      'como_envia': [
        'E como você envia o orçamento hoje?',
        'Tipo de proposta que você manda, é como?',
        'Você manda como - só valor ou algo mais completo?',
        'Qual é seu formato de proposta?'
      ],
      'cliente_some': [
        'O cliente costuma sumir depois da proposta?',
        'Ele some depois que você manda ou volta com dúvidas?',
        'Fica no silêncio mesmo?',
        'Você consegue acompanhar depois?'
      ],
      'qual_problema': [
        'Então qual é exatamente seu problema?',
        'Qual é a principal dificuldade sua?',
        'E qual é o maior problema?',
        'Qual sua maior dor?'
      ]
    };

    // Explicações detalhadas sobre FechaPro
    this.explicacoesFechapro = `
📋 *Como o FechaPro funciona*

*1️⃣ Você cria propostas profissionais em 1 minuto*
- Templates prontos com sua marca
- Preenche dados do cliente uma vez
- Gera PDF ou link interativo

*2️⃣ O cliente recebe pelo WhatsApp/Email*
- Vê direto no navegador ou app
- Assinatura digital incluída
- Você acompanha em tempo real

*3️⃣ Você acompanha tudo*
- Quem abriu a proposta
- Quanto tempo ficou lendo
- Se assinou ou recusou
- Quando precisa fazer follow-up

*4️⃣ Resultados*
- Clientes fecham 3x mais rápido
- Menos "vou pensar" e mais vendas
- Menos tempo administrativo

${this.URL_DIAGNOSTICO} ← faz um diagnóstico da sua situação atual

Quer que eu explique melhor alguma parte?
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

  async gerarResposta(texto, telefone, identidade = { nome: 'Amanda' }, historicMensagens = []) {
    const etapaAtual = this.etapasPorContato.get(telefone) || 'apresentacao';
    const analise = await nlpLocal.processar(texto);
    let intencao = analise.intencao;
    const confianca = analise.score;

    if (intencao === 'None' || confianca < 0.3) {
      intencao = 'desconhecido';
    }

    if (intencao === 'desinteresse') {
      this.etapasPorContato.set(telefone, 'encerrado');
      return 'Tranquilo, sem problema. Qualquer coisa é só me chamar 👍';
    }

    if (etapaAtual === 'encerrado') {
      return 'Sem problema!';
    }

    if (intencao === 'negatividade') {
      return 'Opa, peço desculpas. Deixa eu ser direto: qual é mesmo seu maior gargalo - é o cliente não responder depois da proposta ou outro problema?';
    }

    if (intencao === 'teste_bot') {
      return 'Boa! Sim, sou assistente aqui mesmo. Tô tentando entender como funciona seu negócio. Depois que você manda um orçamento, o cliente costuma sumir ou volta com dúvidas?';
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
        resposta = `Oi! Aqui é ${identidade.nome}. Então me conta uma coisa: depois que você manda um orçamento, o cliente costuma sumir ou volta com dúvidas?`;
      } else if (['afirmacao_positiva', 'dor_some', 'dor_desconto'].includes(intencao)) {
        this.etapasPorContato.set(telefone, 'dor');

        if (intencao === 'afirmacao_positiva') {
          if (jaFezPerguntaSobreOrcamento) {
            resposta = 'Pois é, isso é bem comum mesmo. Então basicamente você manda a proposta e fica no vácuo. É sempre assim ou tem clientes que voltam?';
          } else {
            resposta = 'Então esse é mesmo o seu principal desafio?';
          }
        } else {
          resposta = 'Isso geralmente passa por dois problemas: o cliente não vê o valor, ou falta um acompanhamento certo. Qual você sente mais?';
        }
      } else if (jaFezPerguntaSobreOrcamento) {
        resposta = 'Tá, então qual é o seu maior desafio mesmo - captar cliente, montar uma proposta melhor, ou fazer o cliente responder?';
      } else {
        resposta = 'Então me diz: qual é o seu gargalo mesmo? É o cliente sumir, o preço ficar caro, ou é outra coisa?';
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
        const resposta = `O FechaPro basicamente te ajuda a criar propostas profissionais e acompanhar o cliente depois. Deixa eu te mandar um diagnóstico rápido? ${this.URL_DIAGNOSTICO}`;

        if (this.ehRespostaRepetida(telefone, resposta)) {
          const alt = `Deixa eu mandar um diagnóstico pra você: ${this.URL_DIAGNOSTICO}`;
          this.registrarResposta(telefone, alt);
          return alt;
        }

        this.registrarResposta(telefone, resposta);
        return resposta;
      }

      const respostaPadrao = 'Tá bom. O que você sente que mais compromete suas vendas?';
      if (this.ehRespostaRepetida(telefone, respostaPadrao)) {
        const alt = this.obterAlternativaQuandoRepetida(telefone, 'qual_gargalo');
        if (alt) return alt;
      }

      this.registrarResposta(telefone, respostaPadrao);
      return respostaPadrao;
    }

    let resposta = 'Qual parte da venda mais emperrada pra você - é a proposta, o preço, ou o cliente não voltar depois?';

    // Check if response is repeated
    if (this.ehRespetaRepetida(telefone, resposta)) {
      const alternativas = [
        'Mas me diz então: qual é seu principal problema?',
        'Então qual é a principal dificuldade sua?',
        'E aí, qual seu maior desafio?',
        'Me fala então: qual é mesmo seu gargalo?'
      ];
      resposta = alternativas[Math.floor(Math.random() * alternativas.length)];
    }

    this.registrarResposta(telefone, resposta);
    return resposta;
  }
}

module.exports = new RoteiroHeuristico();
