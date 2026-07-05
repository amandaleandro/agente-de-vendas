/**
 * FollowupScheduler - follow-up automatico baseado em score.
 */

class FollowupScheduler {
  constructor(pool) {
    this.pool = pool;
    this.followupsPendentes = new Map(); // telefone -> { timestamp, tipo, dados }
    this.timersAtivos = new Map();
    this.intervaloVerificacao = 60000; // 1 minuto
    this.delays = {
      FECHAR_AGORA: Number(process.env.FOLLOWUP_SCORE_HOT_MIN) || 2,
      ENVIAR_DIAGNOSTICO: Number(process.env.FOLLOWUP_SCORE_WARM_MIN) || 15,
      RETOMAR_CONVERSA: Number(process.env.FOLLOWUP_SCORE_COLD_MIN) || 120,
      TENTAR_NOVAMENTE: Number(process.env.FOLLOWUP_SCORE_LOW_MIN) || 24 * 60
    };
  }

  agendarFollowup(telefone, score, etapa) {
    let tipoFollowup = null;
    let delayMinutos = 0;

    if (score >= 80 && etapa === 'perguntou_produto') {
      tipoFollowup = 'FECHAR_AGORA';
      delayMinutos = this.delays.FECHAR_AGORA;
    } else if (score >= 60 && etapa === 'diagnostico') {
      tipoFollowup = 'ENVIAR_DIAGNOSTICO';
      delayMinutos = this.delays.ENVIAR_DIAGNOSTICO;
    } else if (score >= 40 && etapa === 'dor') {
      tipoFollowup = 'RETOMAR_CONVERSA';
      delayMinutos = this.delays.RETOMAR_CONVERSA;
    } else if (score < 40 && !this.ehDesistente(telefone)) {
      tipoFollowup = 'TENTAR_NOVAMENTE';
      delayMinutos = this.delays.TENTAR_NOVAMENTE;
    }

    if (!tipoFollowup) return null;

    if (this.timersAtivos.has(telefone)) {
      clearTimeout(this.timersAtivos.get(telefone));
    }

    const timestamp = new Date();
    const dataExecutar = new Date(timestamp.getTime() + delayMinutos * 60000);

    const timer = setTimeout(() => {
      this.executarFollowup(telefone, tipoFollowup);
    }, delayMinutos * 60000);

    this.timersAtivos.set(telefone, timer);

    const followup = {
      telefone,
      tipo: tipoFollowup,
      timestamp,
      dataExecutar,
      score,
      etapa,
      agendado: true
    };

    this.followupsPendentes.set(telefone, followup);

    return followup;
  }

  async executarFollowup(telefone, tipoFollowup) {
    try {
      console.log(`Executando follow-up ${tipoFollowup} para ${telefone}`);

      const mensagens = {
        FECHAR_AGORA: this.mensagemFecha(),
        ENVIAR_DIAGNOSTICO: this.mensagemDiagnostico(),
        RETOMAR_CONVERSA: this.mensagemRetomada(),
        TENTAR_NOVAMENTE: this.mensagemTentarNovamente()
      };

      const mensagem = mensagens[tipoFollowup];

      if (global.socketsConectados && global.socketsConectados.size > 0) {
        const socket = global.socketsConectados.values().next().value;
        if (socket && global.enviarPeloBot) {
          await global.enviarPeloBot(socket, `${telefone}@s.whatsapp.net`, {
            text: mensagem
          });
        }
      }

      this.salvarFollowup(telefone, tipoFollowup);
      this.followupsPendentes.delete(telefone);
    } catch (err) {
      console.error(`Erro ao executar follow-up ${tipoFollowup}:`, err.message);
    }
  }

  ehDesistente(telefone) {
    const normalizado = String(telefone || '').replace(/\D/g, '');
    return !!(global.optOutContatos && global.optOutContatos.has(normalizado));
  }

  mensagemFecha() {
    const mensagens = [
      'Opa! Voce ainda tem interesse? Posso te mandar o link para comecar?',
      'Pronto para comecar? Se fizer sentido, te mando o link agora.',
      'Vi que voce tem interesse. Qual e a melhor forma de seguir daqui?'
    ];
    return mensagens[Math.floor(Math.random() * mensagens.length)];
  }

  mensagemDiagnostico() {
    const mensagens = [
      'Opa, voltei aqui. Quer que eu te mande o diagnostico para ver se faz sentido?',
      'Consigo te mostrar um diagnostico rapido da sua situacao. Quer ver?',
      'Tenho um caminho simples para comparar onde voce pode melhorar o acompanhamento. Te mando?'
    ];
    return mensagens[Math.floor(Math.random() * mensagens.length)];
  }

  mensagemRetomada() {
    const mensagens = [
      'Opa, voltei aqui rapido. Ainda faz sentido falar sobre acompanhamento de clientes?',
      'Continuamos aquela conversa sobre melhorar seus retornos com clientes?',
      'Me diz uma coisa: esse problema de cliente sumir depois da proposta ainda acontece ai?'
    ];
    return mensagens[Math.floor(Math.random() * mensagens.length)];
  }

  mensagemTentarNovamente() {
    const mensagens = [
      'Passando uma ultima vez: esse assunto nao faz sentido agora ou vale retomar depois?',
      'Sem problema se agora nao for o momento. Quer que eu deixe para outro dia?',
      'Tudo bem deixar para depois. Se quiser retomar, me chama por aqui.'
    ];
    return mensagens[Math.floor(Math.random() * mensagens.length)];
  }

  async salvarFollowup(telefone, tipoFollowup) {
    try {
      if (!this.pool) return;

      const client = await this.pool.connect();
      await client.query(
        `INSERT INTO followups_log (telefone, tipo, executado_em)
         VALUES ($1, $2, NOW())`,
        [telefone, tipoFollowup]
      );
      client.release();
    } catch (err) {
      console.error('Erro ao salvar follow-up:', err.message);
    }
  }

  obterPendentes() {
    return Array.from(this.followupsPendentes.values()).sort(
      (a, b) => a.dataExecutar - b.dataExecutar
    );
  }

  cancelarFollowup(telefone) {
    const normalizado = String(telefone || '').split('@')[0].replace(/\D/g, '');
    const chaves = new Set([telefone, String(telefone || ''), normalizado]);

    for (const chave of this.timersAtivos.keys()) {
      const chaveNormalizada = String(chave || '').split('@')[0].replace(/\D/g, '');
      if (chaveNormalizada === normalizado) chaves.add(chave);
    }

    for (const chave of chaves) {
      if (this.timersAtivos.has(chave)) {
        clearTimeout(this.timersAtivos.get(chave));
        this.timersAtivos.delete(chave);
      }
      this.followupsPendentes.delete(chave);
    }
  }

  obterEstatisticas() {
    return {
      totalPendentes: this.followupsPendentes.size,
      porTipo: Array.from(this.followupsPendentes.values()).reduce((acc, followup) => {
        acc[followup.tipo] = (acc[followup.tipo] || 0) + 1;
        return acc;
      }, {}),
      proximoFollowup: this.obterPendentes()[0]?.dataExecutar
    };
  }
}

module.exports = FollowupScheduler;
