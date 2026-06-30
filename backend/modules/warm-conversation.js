const fs = require('fs');
const path = require('path');

class WarmConversationManager {
  constructor() {
    this.conversasAtivas = new Map(); // conversaId -> { sessao1, sessao2, mensagens: [], rodando }
    this.repertorio = this.carregarRepertorio();
    this.historico = [];
    this.proximaConversaId = 1;
  }

  carregarRepertorio() {
    try {
      const caminhoRepertorio = path.join(__dirname, '..', 'conhecimento', 'conversas.json');
      if (!fs.existsSync(caminhoRepertorio)) {
        console.log('⚠️  Arquivo de conversas não encontrado');
        return { temas: [] };
      }
      const conteudo = fs.readFileSync(caminhoRepertorio, 'utf8');
      return JSON.parse(conteudo);
    } catch (err) {
      console.log(`⚠️ Erro ao carregar repertório: ${err.message}`);
      return { temas: [] };
    }
  }

  // Obtém uma resposta aleatória para uma pergunta
  obterResposta(pergunta) {
    if (!this.repertorio.temas || this.repertorio.temas.length === 0) {
      return 'Tudo bem!';
    }

    for (const tema of this.repertorio.temas) {
      for (const conversa of tema.conversas) {
        // Verificar se a pergunta é similar (contém palavras-chave)
        if (this.perguntasSimilares(pergunta, conversa.pergunta)) {
          return conversa.respostas[Math.floor(Math.random() * conversa.respostas.length)];
        }
      }
    }

    // Fallback: retornar uma resposta genérica
    return 'Que legal! Continua...';
  }

  perguntasSimilares(pergunta1, pergunta2) {
    const p1 = pergunta1.toLowerCase().trim();
    const p2 = pergunta2.toLowerCase().trim();

    // Match exato ou partial
    if (p1 === p2) return true;
    if (p1.includes(p2) || p2.includes(p1)) return true;

    // Verificar palavras-chave
    const palavras1 = p1.split(' ');
    const palavras2 = p2.split(' ');
    const matches = palavras1.filter(p => palavras2.includes(p)).length;

    return matches >= 2; // Pelo menos 2 palavras em comum
  }

  iniciarConversa(sessao1, sessao2, tema = null) {
    const conversaId = `conv_${this.proximaConversaId++}`;

    const temaEscolhido = tema
      ? this.repertorio.temas.find(t => t.id === tema)
      : this.repertorio.temas[Math.floor(Math.random() * this.repertorio.temas.length)];

    if (!temaEscolhido) {
      return { sucesso: false, erro: 'Tema não encontrado' };
    }

    this.conversasAtivas.set(conversaId, {
      sessao1,
      sessao2,
      tema: temaEscolhido.id,
      mensagens: [],
      rodando: true,
      iniciada_em: new Date().toISOString(),
      turno: Math.random() > 0.5 ? sessao1 : sessao2 // Quem começa
    });

    return {
      sucesso: true,
      conversaId,
      tema: temaEscolhido.nome,
      mensagem: `Conversa iniciada entre Sessão ${sessao1} e ${sessao2}`
    };
  }

  proxima MensagemNaConversa(conversaId) {
    const conversa = this.conversasAtivas.get(conversaId);
    if (!conversa || !conversa.rodando) return null;

    const temaObj = this.repertorio.temas.find(t => t.id === conversa.tema);
    if (!temaObj || !temaObj.conversas.length) return null;

    // Escolher uma pergunta aleatória do tema
    const conversaEscolhida = temaObj.conversas[Math.floor(Math.random() * temaObj.conversas.length)];
    const pergunta = conversaEscolhida.pergunta;
    const resposta = this.obterResposta(pergunta);

    // Registrar a mensagem
    conversa.mensagens.push({
      sessao: conversa.turno,
      texto: pergunta,
      tipo: 'pergunta',
      timestamp: new Date().toISOString()
    });

    conversa.mensagens.push({
      sessao: conversa.turno === conversa.sessao1 ? conversa.sessao2 : conversa.sessao1,
      texto: resposta,
      tipo: 'resposta',
      timestamp: new Date().toISOString()
    });

    // Alternar turno
    conversa.turno = conversa.turno === conversa.sessao1 ? conversa.sessao2 : conversa.sessao1;

    return {
      conversaId,
      sessaoEnviou: conversa.mensagens[conversa.mensagens.length - 2].sessao,
      pergunta,
      sessaoRespondeu: conversa.mensagens[conversa.mensagens.length - 1].sessao,
      resposta,
      totalMensagens: conversa.mensagens.length
    };
  }

  obterStatusConversa(conversaId) {
    const conversa = this.conversasAtivas.get(conversaId);
    if (!conversa) return null;

    return {
      conversaId,
      sessao1: conversa.sessao1,
      sessao2: conversa.sessao2,
      tema: conversa.tema,
      rodando: conversa.rodando,
      totalMensagens: conversa.mensagens.length,
      ultimaMensagem: conversa.mensagens.length > 0 ? conversa.mensagens[conversa.mensagens.length - 1] : null,
      iniciada_em: conversa.iniciada_em
    };
  }

  obterHistoricoConversa(conversaId) {
    const conversa = this.conversasAtivas.get(conversaId);
    if (!conversa) return null;

    return {
      conversaId,
      sessao1: conversa.sessao1,
      sessao2: conversa.sessao2,
      tema: conversa.tema,
      mensagens: conversa.mensagens,
      rodando: conversa.rodando
    };
  }

  pararConversa(conversaId) {
    const conversa = this.conversasAtivas.get(conversaId);
    if (!conversa) return { sucesso: false, erro: 'Conversa não encontrada' };

    conversa.rodando = false;
    this.historico.push({
      ...conversa,
      parada_em: new Date().toISOString()
    });

    return {
      sucesso: true,
      mensagem: `Conversa ${conversaId} parada com ${conversa.mensagens.length} mensagens`
    };
  }

  obterConversasAtivas() {
    const ativas = [];
    this.conversasAtivas.forEach((conversa, id) => {
      if (conversa.rodando) {
        ativas.push({
          conversaId: id,
          sessao1: conversa.sessao1,
          sessao2: conversa.sessao2,
          tema: conversa.tema,
          mensagens: conversa.mensagens.length
        });
      }
    });
    return ativas;
  }

  obterTemas() {
    return this.repertorio.temas.map(t => ({
      id: t.id,
      nome: t.nome,
      qtdConversas: t.conversas.length
    }));
  }

  adicionarConversaAoRepertorio(tema, pergunta, respostas) {
    const temaObj = this.repertorio.temas.find(t => t.id === tema);
    if (!temaObj) {
      return { sucesso: false, erro: 'Tema não encontrado' };
    }

    temaObj.conversas.push({ pergunta, respostas });
    this.salvarRepertorio();

    return { sucesso: true, mensagem: 'Conversa adicionada ao repertório' };
  }

  salvarRepertorio() {
    try {
      const caminhoRepertorio = path.join(__dirname, '..', 'conhecimento', 'conversas.json');
      fs.writeFileSync(caminhoRepertorio, JSON.stringify(this.repertorio, null, 2), 'utf8');
      console.log('💾 Repertório de conversas salvo');
    } catch (err) {
      console.log(`⚠️ Erro ao salvar repertório: ${err.message}`);
    }
  }
}

module.exports = WarmConversationManager;
