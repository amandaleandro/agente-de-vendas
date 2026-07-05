const intentClassifier = require('./intent-classifier');

const URL_DIAGNOSTICO = 'https://fechapro.com.br/diagnostico';
const URL_COMPRA_ANUAL = 'https://fechapro.com.br/auth/signup?plan=annual';

const historicoRespostas = new Map();

function normalizar(texto) {
  return intentClassifier.normalizarTexto(texto || '');
}

function contem(texto, termos) {
  return termos.some(termo => texto.includes(termo));
}

function escolher(telefone, opcoes) {
  const usadas = historicoRespostas.get(telefone) || [];
  const disponivel = opcoes.find(opcao => !usadas.includes(opcao));
  const resposta = disponivel || opcoes[Math.floor(Math.random() * opcoes.length)];

  usadas.push(resposta);
  if (usadas.length > 30) usadas.shift();
  historicoRespostas.set(telefone, usadas);

  return resposta;
}

function ultimaMensagemBot(historico) {
  return [...(historico || [])].reverse().find(msg => msg.fromMe && msg.text)?.text || '';
}

function extrairNumero(texto) {
  const match = String(texto || '').match(/\d+/);
  return match ? Number(match[0]) : null;
}

function detectarIntencao(textoOriginal, historico = []) {
  const texto = normalizar(textoOriginal);
  const ultimaBot = normalizar(ultimaMensagemBot(historico));
  const numero = extrairNumero(textoOriginal);

  if (!texto) return { tipo: 'vazio', texto, numero, ultimaBot };

  if (contem(texto, ['link', 'manda', 'mandar', 'diagnostico', 'teste', 'testar', 'comecar', 'quero', 'pode enviar'])) {
    return { tipo: 'cta', texto, numero, ultimaBot };
  }

  if (contem(texto, ['como funciona', 'como e', 'explica', 'me explica', 'o que faz', 'pra que serve', 'para que serve'])) {
    return { tipo: 'funcionamento', texto, numero, ultimaBot };
  }

  if (contem(texto, ['caro', 'muito caro', 'sem dinheiro', 'nao posso pagar', 'investimento alto'])) {
    return { tipo: 'objecao_preco', texto, numero, ultimaBot };
  }

  if (contem(texto, ['sem tempo', 'ocupado', 'correria', 'depois eu vejo', 'vejo depois', 'mais tarde', 'agora nao consigo'])) {
    return { tipo: 'objecao_tempo', texto, numero, ultimaBot };
  }

  if (contem(texto, ['nao confio', 'tenho receio', 'tenho medo', 'seguro', 'seguranca', 'funciona mesmo', 'garantia'])) {
    return { tipo: 'objecao_confianca', texto, numero, ultimaBot };
  }

  if (contem(texto, ['ja uso', 'ja tenho', 'temos sistema', 'uso excel', 'uso planilha', 'crm', 'pipedrive', 'hubspot', 'concorrente'])) {
    return { tipo: 'concorrente', texto, numero, ultimaBot };
  }

  if (contem(texto, ['quanto custa', 'qual o valor', 'valor', 'preco', 'precos', 'plano', 'planos', 'mensal', 'anual'])) {
    return { tipo: 'preco', texto, numero, ultimaBot };
  }

  if (contem(texto, ['cliente some', 'cliente nao responde', 'nao responde', 'some', 'sumiu', 'retorno', 'follow up', 'vacuo'])) {
    return { tipo: 'cliente_some', texto, numero, ultimaBot };
  }

  if (contem(texto, ['orcamento', 'orcamentos', 'proposta', 'propostas']) || numero) {
    return { tipo: 'volume_ou_proposta', texto, numero, ultimaBot };
  }

  if (/^(sim|ok|certo|beleza|pode|manda|quero|isso|exato|perfeito)\b/.test(texto)) {
    if (contem(ultimaBot, ['diagnostico', 'link', 'testar'])) {
      return { tipo: 'cta', texto, numero, ultimaBot };
    }
    return { tipo: 'confirmacao', texto, numero, ultimaBot };
  }

  if (texto.length <= 18) return { tipo: 'curta', texto, numero, ultimaBot };

  return { tipo: 'contexto_livre', texto, numero, ultimaBot };
}

function gerarResposta(textoCliente, telefone, identidade = { nome: 'Amanda' }, historico = []) {
  const intent = detectarIntencao(textoCliente, historico);
  const nome = identidade.nome || 'Amanda';

  switch (intent.tipo) {
    case 'preco':
      return escolher(telefone, [
        `Consigo te passar, sim. Antes de cravar plano, me diz uma coisa: voce quer resolver mais criacao da proposta ou acompanhamento depois que envia?`,
        `Tem plano mensal e anual, mas o melhor depende do uso. Hoje voce manda mais ou menos quantas propostas por semana?`,
        `Te explico. O ponto e escolher pelo retorno: seu gargalo hoje e montar proposta, cobrar retorno ou fechar mais rapido?`
      ]);

    case 'cta':
      return escolher(telefone, [
        `Perfeito. Faz esse diagnostico rapido aqui: ${URL_DIAGNOSTICO}. Depois me chama com o resultado que eu te ajudo a interpretar.`,
        `Claro. O melhor primeiro passo e o diagnostico de 3 minutos: ${URL_DIAGNOSTICO}. Ele mostra onde seu processo esta perdendo venda.`,
        `Mando sim: ${URL_DIAGNOSTICO}. Se fizer agora, me diz depois qual ponto apareceu mais fraco que eu te oriento no proximo passo.`
      ]);

    case 'funcionamento':
      return escolher(telefone, [
        `Funciona assim: voce monta uma proposta profissional, envia pro cliente e acompanha se ele abriu, leu, assinou ou travou. Ai o follow-up fica no momento certo, nao no chute.`,
        `Na pratica, o FechaPro organiza a proposta e mostra o comportamento do cliente depois do envio. Isso ajuda a saber quando insistir, quando ajustar e quando fechar.`,
        `Ele tira a proposta do improviso: cria, envia e acompanha tudo. O ponto principal e voce parar de ficar sem saber se o cliente viu ou simplesmente sumiu.`
      ]);

    case 'objecao_preco':
      return escolher(telefone, [
        `Entendo. Nao quero forcar algo que nao faca sentido. Pra comparar direito: uma venda fechada sua vale em media quanto?`,
        `Faz sentido se preocupar com investimento. A conta que importa e simples: se recuperar uma venda que hoje some, isso ja compensa?`,
        `Concordo que precisa fechar a conta. O que pesa mais agora: o valor em si ou ainda nao ficou claro o retorno que isso pode trazer?`,
        `Totalmente justo. Se hoje voce perde propostas por falta de retorno, o custo real talvez esteja ali. Quantas propostas boas ficam sem resposta por mes?`
      ]);

    case 'objecao_tempo':
      return escolher(telefone, [
        `Entendo, correria mesmo. Pra nao tomar seu tempo: o diagnostico leva poucos minutos e ja mostra se vale continuar. Quer que eu mande e voce ve quando puder?`,
        `Sem problema. So pra eu nao insistir errado: e falta de tempo agora ou esse assunto nao e prioridade pra voces?`,
        `Claro. Posso deixar simples: quando voce tiver 3 minutos, olha o diagnostico e decide se faz sentido. Quer o link?`
      ]);

    case 'objecao_confianca':
      return escolher(telefone, [
        `Justo ter esse cuidado. O melhor caminho e voce testar sem compromisso pelo diagnostico e ver se a logica faz sentido no seu caso. Quer que eu mande?`,
        `Entendo o receio. Em vez de pedir pra confiar de cara, prefiro te mostrar na pratica: voce faz o diagnostico e avalia com seus proprios numeros.`,
        `Boa pergunta. O FechaPro ajuda principalmente a organizar proposta e acompanhar abertura/retorno. O que voce quer validar primeiro: seguranca, resultado ou funcionamento?`
      ]);

    case 'concorrente':
      return escolher(telefone, [
        `Boa, entao voce ja tem um processo. Nao vou sugerir trocar por trocar: o que ele nao resolve bem hoje?`,
        `Perfeito, melhor ainda. Se ja funciona, talvez o ponto seja so melhorar uma parte. Onde trava mais: proposta, organizacao ou retorno do cliente?`,
        `Entendi. E esse sistema te mostra se o cliente abriu a proposta e quanto tempo ficou nela, ou isso ainda fica no escuro?`,
        `Legal. Se a ferramenta atual ja atende tudo, faz sentido continuar. O que te faria considerar algo diferente: menos trabalho manual ou mais controle do follow-up?`
      ]);

    case 'cliente_some':
      return escolher(telefone, [
        `Esse e exatamente o ponto. Quando o cliente some, hoje voce sabe se ele abriu a proposta ou voce fica tentando follow-up meio no escuro?`,
        `Isso costuma matar venda boa. O problema maior e ele nao responder depois do valor ou nem chegar a entender a proposta?`,
        `Entendi. Quando isso acontece, voce tem uma rotina de retorno ou depende de lembrar manualmente?`
      ]);

    case 'volume_ou_proposta':
      if (intent.numero && intent.numero >= 20) {
        return escolher(telefone, [
          `${intent.numero} por periodo ja e volume suficiente pra pequenos vazamentos virarem dinheiro. Dessas, quantas costumam fechar hoje?`,
          `Com ${intent.numero} propostas, acompanhar no detalhe faz bastante diferenca. Voce sabe quais clientes abriram e quais precisam de retorno?`
        ]);
      }
      return escolher(telefone, [
        `Entendi. E dessas propostas, o que mais trava: criar rapido, mostrar valor ou conseguir resposta depois?`,
        `Legal. Hoje voce envia isso por WhatsApp mesmo, PDF, planilha ou outro formato?`
      ]);

    case 'confirmacao':
      return escolher(telefone, [
        `Show. Entao me diz direto: hoje o que mais pesa, cliente sumindo depois da proposta ou dificuldade de apresentar valor?`,
        `Perfeito. Pra eu te guiar certo: seu processo trava antes de enviar a proposta ou depois que o cliente recebe?`,
        `Certo. Qual seria uma melhoria que ja mudaria o jogo pra voce nesta semana?`
      ]);

    case 'curta':
    case 'vazio':
      return escolher(telefone, [
        `Me da so um pouco mais de contexto: voce quer saber sobre preco, funcionamento ou como melhorar suas propostas?`,
        `Pra eu nao chutar: sua duvida e mais sobre proposta, acompanhamento do cliente ou planos?`,
        `Entendi em parte. Hoje o maior problema e captar cliente, montar proposta ou fazer o cliente responder?`
      ]);

    case 'contexto_livre':
    default:
      return escolher(telefone, [
        `Entendi. Pelo que voce falou, parece mais um problema de processo do que de esforco. Onde isso mais trava hoje: antes de enviar a proposta ou depois?`,
        `Faz sentido. Me ajuda a fechar o diagnostico: quando voce perde uma venda, normalmente e por preco, demora no retorno ou falta de clareza na proposta?`,
        `${nome} aqui. Pelo seu contexto, eu olharia primeiro para acompanhamento. Voce sabe hoje quais clientes abriram suas propostas?`
      ]);
  }
}

function limparHistorico(telefone) {
  historicoRespostas.delete(telefone);
}

module.exports = {
  gerarResposta,
  detectarIntencao,
  limparHistorico
};
