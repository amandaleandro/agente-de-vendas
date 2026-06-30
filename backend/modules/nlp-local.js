const { NlpManager } = require('node-nlp');

class NLPLocal {
  constructor() {
    // Configura o manager para português, desativando a persistência no disco por padrão
    this.manager = new NlpManager({ languages: ['pt'], forceNER: true, autoSave: false });
    this.treinado = false;
  }

  async inicializar() {
    if (this.treinado) return;

    console.log('🧠 Treinando o modelo de Machine Learning Local...');

    // ============================================
    // INTENÇÕES E FRASES DE TREINAMENTO
    // ============================================

    // 1. Saudação
    this.manager.addDocument('pt', 'oi', 'saudacao');
    this.manager.addDocument('pt', 'ola', 'saudacao');
    this.manager.addDocument('pt', 'bom dia', 'saudacao');
    this.manager.addDocument('pt', 'boa tarde', 'saudacao');
    this.manager.addDocument('pt', 'boa noite', 'saudacao');
    this.manager.addDocument('pt', 'opa', 'saudacao');

    // 2. Preço
    this.manager.addDocument('pt', 'qual o valor', 'preco');
    this.manager.addDocument('pt', 'quanto custa', 'preco');
    this.manager.addDocument('pt', 'ta caro', 'preco');
    this.manager.addDocument('pt', 'muito caro', 'preco');
    this.manager.addDocument('pt', 'qual o preco', 'preco');
    this.manager.addDocument('pt', 'tem que pagar', 'preco');
    this.manager.addDocument('pt', 'paga alguma coisa', 'preco');
    this.manager.addDocument('pt', 'aceita pix', 'preco');
    this.manager.addDocument('pt', 'fora do meu orcamento', 'preco');

    // 3. Dúvida Produto
    this.manager.addDocument('pt', 'como funciona isso', 'duvida_produto');
    this.manager.addDocument('pt', 'para que serve', 'duvida_produto');
    this.manager.addDocument('pt', 'como uso esse sistema', 'duvida_produto');
    this.manager.addDocument('pt', 'como o fechapro pode me ajudar', 'duvida_produto');
    this.manager.addDocument('pt', 'o que o sistema faz', 'duvida_produto');
    this.manager.addDocument('pt', 'me explica direito', 'duvida_produto');

    // 4. Dor: Cliente Some
    this.manager.addDocument('pt', 'cliente some', 'dor_some');
    this.manager.addDocument('pt', 'deixam no vacuo', 'dor_some');
    this.manager.addDocument('pt', 'vizualiza e nao responde', 'dor_some');
    this.manager.addDocument('pt', 'param de falar', 'dor_some');
    this.manager.addDocument('pt', 'nao me dao retorno', 'dor_some');

    // 5. Dor: Desconto
    this.manager.addDocument('pt', 'pedem muito desconto', 'dor_desconto');
    this.manager.addDocument('pt', 'ficam chorando por preco', 'dor_desconto');
    this.manager.addDocument('pt', 'acham meu servico caro', 'dor_desconto');

    // 6. Volume Alto / Interesse em Fechar
    this.manager.addDocument('pt', 'faco muitos orcamentos', 'volume_alto');
    this.manager.addDocument('pt', 'mando mais de dez por dia', 'volume_alto');
    this.manager.addDocument('pt', 'tenho bastante cliente', 'volume_alto');

    // 7. Afirmação Positiva
    this.manager.addDocument('pt', 'sim', 'afirmacao_positiva');
    this.manager.addDocument('pt', 'isso mesmo', 'afirmacao_positiva');
    this.manager.addDocument('pt', 'exato', 'afirmacao_positiva');
    this.manager.addDocument('pt', 'acontece', 'afirmacao_positiva');
    this.manager.addDocument('pt', 'com certeza', 'afirmacao_positiva');
    this.manager.addDocument('pt', 'quero', 'afirmacao_positiva');

    // 8. Desinteresse
    this.manager.addDocument('pt', 'nao tenho interesse', 'desinteresse');
    this.manager.addDocument('pt', 'agora nao', 'desinteresse');
    this.manager.addDocument('pt', 'to sem tempo', 'desinteresse');
    this.manager.addDocument('pt', 'deixa pra proxima', 'desinteresse');
    this.manager.addDocument('pt', 'nao quero', 'desinteresse');
    this.manager.addDocument('pt', 'fica pra outra hora', 'desinteresse');
    this.manager.addDocument('pt', 'fica para uma outra hora', 'desinteresse');
    this.manager.addDocument('pt', 'nao damos conta dos servicos', 'desinteresse');
    this.manager.addDocument('pt', 'temos muito servico', 'desinteresse');
    this.manager.addDocument('pt', 'estamos com agenda cheia', 'desinteresse');
    this.manager.addDocument('pt', 'nao dou conta dos servicos que tenho', 'desinteresse');

    // 9. Urgencia (Compra)
    this.manager.addDocument('pt', 'quero comprar agora', 'urgencia');
    this.manager.addDocument('pt', 'quero testar logo', 'urgencia');
    this.manager.addDocument('pt', 'passa o link pra eu assinar', 'urgencia');
    this.manager.addDocument('pt', 'como eu pago', 'urgencia');
    this.manager.addDocument('pt', 'bora fechar', 'urgencia');

    // 10. Concorrente
    this.manager.addDocument('pt', 'ja uso uma plataforma', 'concorrente');
    this.manager.addDocument('pt', 'ja tenho sistema', 'concorrente');
    this.manager.addDocument('pt', 'uso um concorrente', 'concorrente');

    // 11. Teste de Bot / Xingamentos
    this.manager.addDocument('pt', 'voce e robo', 'teste_bot');
    this.manager.addDocument('pt', 'e inteligencia artificial', 'teste_bot');
    this.manager.addDocument('pt', 'vc e robo ne', 'teste_bot');
    this.manager.addDocument('pt', 'burro', 'negatividade');
    this.manager.addDocument('pt', 'nao funciona', 'negatividade');

    // ============================================
    // TREINAR E GERAR MODELO NA MEMÓRIA
    // ============================================
    await this.manager.train();
    this.treinado = true;
    console.log('✅ Machine Learning Local treinado com sucesso!');
  }

  async processar(texto) {
    if (!this.treinado) {
      await this.inicializar();
    }
    const response = await this.manager.process('pt', texto);
    
    // response.intent -> Intenção vencedora
    // response.score -> Grau de certeza (0.0 a 1.0)
    return {
      intencao: response.intent,
      score: response.score,
      entities: response.entities,
      sentiment: response.sentiment
    };
  }
}

module.exports = new NLPLocal();
