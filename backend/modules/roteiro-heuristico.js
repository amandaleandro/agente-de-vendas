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
      if (intencao === 'saudacao') {
        return `Oi! Aqui é ${identidade.nome}. Então me conta uma coisa: depois que você manda um orçamento, o cliente costuma sumir ou volta com dúvidas?`;
      }

      if (['afirmacao_positiva', 'dor_some', 'dor_desconto'].includes(intencao)) {
        this.etapasPorContato.set(telefone, 'dor');

        if (intencao === 'afirmacao_positiva') {
          if (jaFezPerguntaSobreOrcamento) {
            return 'Pois é, isso é bem comum mesmo. Então basicamente você manda a proposta e fica no vácuo. É sempre assim ou tem clientes que voltam?';
          }
          return 'Então esse é mesmo o seu principal desafio?';
        }

        return 'Isso geralmente passa por dois problemas: o cliente não vê o valor, ou falta um acompanhamento certo. Qual você sente mais?';
      }

      if (jaFezPerguntaSobreOrcamento) {
        return 'Tá, então qual é o seu maior desafio mesmo - captar cliente, montar uma proposta melhor, ou fazer o cliente responder?';
      }

      return 'Então me diz: qual é o seu gargalo mesmo? É o cliente sumir, o preço ficar caro, ou é outra coisa?';
    }

    if (etapaAtual === 'dor') {
      if (['dor_some', 'dor_desconto', 'afirmacao_positiva', 'desconhecido'].includes(intencao)) {
        this.etapasPorContato.set(telefone, 'diagnostico');
        const jaFezPerguntaSobreApresentacao = perguntasAnteriores.includes('apresenta') || perguntasAnteriores.includes('proposta completa');

        if (jaFezPerguntaSobreApresentacao) {
          return 'Tá claro. Você manda proposta, mas falta um acompanhamento melhor. Você controla quem abriu, leu ou precisa de um empurrão?';
        }

        return 'Entendo. Mas me diz - você manda só o valor no WhatsApp ou manda uma proposta mais completa?';
      }
    }

    if (etapaAtual === 'diagnostico') {
      this.etapasPorContato.set(telefone, 'permissao_produto');
      return 'Então o problema não é tanto o preço em si, mas o cliente não ver o valor e você não conseguir acompanhar direito. Tá certo?';
    }

    if (etapaAtual === 'permissao_produto') {
      if (['afirmacao_positiva', 'duvida_produto', 'preco', 'urgencia'].includes(intencao)) {
        this.etapasPorContato.set(telefone, 'perguntou_produto');
        return `O FechaPro basicamente te ajuda a criar propostas profissionais e acompanhar o cliente depois. Deixa eu te mandar um diagnóstico rápido? ${this.URL_DIAGNOSTICO}`;
      }

      return 'Tá bom. O que você sente que mais compromete suas vendas?';
    }

    return 'Qual parte da venda mais emperrada pra você - é a proposta, o preço, ou o cliente não voltar depois?';
  }
}

module.exports = new RoteiroHeuristico();
