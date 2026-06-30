const nlpLocal = require('./nlp-local');

class RoteiroHeuristico {
  constructor() {
    this.etapasPorContato = new Map();
    this.URL_DIAGNOSTICO = 'https://fechapro.com.br/diagnostico';
    this.URL_COMPRA_ANUAL = 'https://fechapro.com.br/auth/signup?plan=annual';
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
      return 'Tudo bem, obrigado por avisar. Nao vou insistir.';
    }

    if (etapaAtual === 'encerrado') {
      return 'Tudo bem. Nao vou insistir.';
    }

    if (intencao === 'negatividade') {
      return 'Desculpa se minha mensagem ficou fora do ponto. Posso entender melhor: hoje sua maior dificuldade e conseguir cliente, montar proposta ou fazer o cliente responder depois do orcamento?';
    }

    if (intencao === 'teste_bot') {
      return 'Sou um assistente virtual aqui para entender seu processo comercial. Antes de qualquer coisa: depois que voce passa orcamento, o cliente costuma responder ou some bastante?';
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

      if (jaFezPerguntaSobreVolume) {
        return `Posso te explicar, sim. O FechaPro ajuda a criar propostas melhores e acompanhar o cliente depois do envio. Quer que eu te mande um diagnostico rapido pra ver onde seu processo esta travando? ${this.URL_DIAGNOSTICO}`;
      }

      return `Posso te explicar, sim. O FechaPro ajuda a organizar propostas e acompanhamento de vendas. Mas pra eu te orientar certo: voce hoje envia quantos orcamentos por semana?`;
    }

    if (intencao === 'concorrente') {
      this.etapasPorContato.set(telefone, 'dor');
      return 'Boa, entendi. E a ferramenta que voce usa hoje resolve bem o acompanhamento depois que envia a proposta, ou ainda fica muito manual?';
    }

    if (intencao === 'volume_alto') {
      this.etapasPorContato.set(telefone, 'dor');
      return 'Com esse volume, qualquer melhoria no acompanhamento muda bastante o resultado. Hoje voce controla quem abriu, respondeu ou precisa de retorno?';
    }

    if (etapaAtual === 'apresentacao') {
      const temHistorico = historicMensagens && historicMensagens.length > 2;

      if (intencao === 'saudacao') {
        return `Oi, tudo bem? Aqui e ${identidade.nome}. Queria entender uma coisa rapida: quando voce passa um orcamento, o cliente costuma responder ou some bastante?`;
      }

      if (['afirmacao_positiva', 'dor_some', 'dor_desconto'].includes(intencao)) {
        this.etapasPorContato.set(telefone, 'dor');

        // Se respondeu "Sempre acontece", "Sim", "Isso mesmo" ou similar
        if (intencao === 'afirmacao_positiva') {
          if (jaFezPerguntaSobreOrcamento) {
            return 'Entendi, isso eh bem comum mesmo. Entao o desafio principal eh que depois que voce manda a proposta, o cliente nao responde mais ou demora muito pra dar retorno?';
          }
          return 'Que bacana que respondeu. Entao esse eh realmente o maior gargalo no seu processo de venda?';
        }

        return 'Entendi. Isso geralmente trava por dois motivos: o cliente nao percebe valor antes do preco, ou falta retorno na hora certa. Qual dos dois acontece mais com voce?';
      }

      if (jaFezPerguntaSobreOrcamento) {
        return 'Tendi. Entao, pra eu nao perguntar a mesma coisa de novo: qual eh realmente o seu maior desafio - conseguir cliente, montar proposta melhor, ou fazer o cliente responder depois?';
      }

      return 'Antes de te falar qualquer coisa, quero entender seu caso: quando voce passa um orcamento, o cliente costuma responder ou some bastante?';
    }

    if (etapaAtual === 'dor') {
      if (['dor_some', 'dor_desconto', 'afirmacao_positiva', 'desconhecido'].includes(intencao)) {
        this.etapasPorContato.set(telefone, 'diagnostico');
        const jaFezPerguntaSobreApresentacao = perguntasAnteriores.includes('apresenta') || perguntasAnteriores.includes('proposta completa');

        if (jaFezPerguntaSobreApresentacao) {
          return 'Entendi seu fluxo. O que acontece eh que falta acompanhamento depois que mandam a proposta. Voce ja pensou em ter um sistema pra organizar quem abriu, respondeu ou precisa de follow-up?';
        }

        return 'Faz sentido. Como voce apresenta o servico hoje: manda so o valor no WhatsApp ou envia uma proposta mais completa com detalhes e beneficios?';
      }
    }

    if (etapaAtual === 'diagnostico') {
      this.etapasPorContato.set(telefone, 'permissao_produto');
      return 'Entendi. O problema parece menos "preco" e mais percepcao de valor e acompanhamento. Se fizer sentido, posso te mostrar um jeito mais organizado de conduzir isso.';
    }

    if (etapaAtual === 'permissao_produto') {
      if (['afirmacao_positiva', 'duvida_produto', 'preco', 'urgencia'].includes(intencao)) {
        this.etapasPorContato.set(telefone, 'perguntou_produto');
        return `A ideia do FechaPro e te ajudar a montar propostas melhores e acompanhar o cliente depois do envio. Quer que eu te mande o diagnostico rapido pra ver onde seu processo esta travando? ${this.URL_DIAGNOSTICO}`;
      }

      return 'Sem problema. Me diz entao: hoje o que mais te incomoda no processo de venda?';
    }

    return 'Entendi. Pra eu nao te mandar algo generico: qual parte da venda mais trava hoje, proposta, preco ou retorno do cliente?';
  }
}

module.exports = new RoteiroHeuristico();
