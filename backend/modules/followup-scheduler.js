/**
 * FollowupScheduler - Follow-up automático baseado em score
 * Não deixa ninguém cair, reengage leads frios
 */

class FollowupScheduler {
  constructor(pool) {
    this.pool = pool;
    this.followupsPendentes = new Map(); // telefone -> { timestamp, tipo, dados }
    this.timersAtivos = new Map();
    this.intervaloVerificacao = 60000; // 1 minuto
  }

  /**
   * Agenda follow-up baseado no score e comportamento
   */
  agendarFollowup(telefone, score, etapa) {
    let tipoFollowup = null;
    let delayMinutos = 0;

    // Baseado no score e etapa, decidir quando fazer follow-up
    if (score >= 80 && etapa === 'perguntou_produto') {
      // HOT - follow-up IMEDIATO para fechar
      tipoFollowup = 'FECHAR_AGORA';
      delayMinutos = 2; // 2 minutos
    } else if (score >= 60 && etapa === 'diagnostico') {
      // WARM - follow-up com diagnóstico
      tipoFollowup = 'ENVIAR_DIAGNOSTICO';
      delayMinutos = 15; // 15 minutos
    } else if (score >= 40 && etapa === 'dor') {
      // COLD - reengage para continuar conversa
      tipoFollowup = 'RETOMAR_CONVERSA';
      delayMinutos = 120; // 2 horas
    } else if (score < 40 && !this.ehDesistente(telefone)) {
      // DEAD mas não desistente - tentar de novo depois
      tipoFollowup = 'TENTAR_NOVAMENTE';
      delayMinutos = 24 * 60; // 1 dia
    }

    if (!tipoFollowup) return null;

    // Limpar timer anterior se existir
    if (this.timersAtivos.has(telefone)) {
      clearTimeout(this.timersAtivos.get(telefone));
    }

    // Agendar novo timer
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

  /**
   * Executa o follow-up agendado
   */
  async executarFollowup(telefone, tipoFollowup) {
    try {
      console.log(`📞 Executando follow-up ${tipoFollowup} para ${telefone}`);

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

      // Salvar no histórico
      this.salvarFollowup(telefone, tipoFollowup);

      // Remover dos pendentes
      this.followupsPendentes.delete(telefone);
    } catch (err) {
      console.error(`❌ Erro ao executar follow-up ${tipoFollowup}:`, err.message);
    }
  }

  /**
   * Verifica se o lead é desistente (pediu para parar)
   */
  ehDesistente(telefone) {
    // Verificar em opt-out ou histórico de "não quero"
    // Isso seria integrado com o opt-out system
    return false;
  }

  /**
   * Mensagens de follow-up personalizadas
   */
  mensagemFecha() {
    const mensagens = [
      'Opa! Você interessado agora? Mando o link pra você começar? 👇\nhttps://fechapro.com.br/auth/signup?plan=annual',
      'Pronto pra começar? Aqui está o link: https://fechapro.com.br/auth/signup?plan=annual\nQual plano você quer?',
      'Vi que você tem interesse! Qual é a melhor forma pra você começar? Mando o link agora?'
    ];
    return mensagens[Math.floor(Math.random() * mensagens.length)];
  }

  mensagemDiagnostico() {
    const mensagens = [
      'Opa, voltei aqui! Fiz um diagnóstico da sua situação. Vê isso: https://fechapro.com.br/diagnostico',
      'Testei o sistema pra você. Vê como fica: https://fechapro.com.br/diagnostico',
      'Pronto! Aqui está o diagnóstico customizado pro seu negócio: https://fechapro.com.br/diagnostico'
    ];
    return mensagens[Math.floor(Math.random() * mensagens.length)];
  }

  mensagemRetomada() {
    const mensagens = [
      'Opa! Voltei aqui pra retomar nossa conversa. Ainda tem interesse em resolver o problema de acompanhamento de cliente?',
      'E aí? Continuamos conversando sobre como aumentar suas vendas?',
      'Rápido: você resolveu aquele problema de cliente sumir depois da proposta? Se não, podemos resolver junto!'
    ];
    return mensagens[Math.floor(Math.random() * mensagens.length)];
  }

  mensagemTentarNovamente() {
    const mensagens = [
      'Opa, uma última tentativa! Você realmente não se interessou pela solução? 😅',
      'Sem problema se agora não é momento. Mas avisa se mudar de ideia!',
      'Tudo bem deixar pra depois. Só chama quando precisar! 😊'
    ];
    return mensagens[Math.floor(Math.random() * mensagens.length)];
  }

  /**
   * Salva follow-up executado no banco (para análise futura)
   */
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

  /**
   * Retorna lista de follow-ups pendentes
   */
  obterPendentes() {
    return Array.from(this.followupsPendentes.values()).sort(
      (a, b) => a.dataExecutar - b.dataExecutar
    );
  }

  /**
   * Cancela follow-up de um lead
   */
  cancelarFollowup(telefone) {
    if (this.timersAtivos.has(telefone)) {
      clearTimeout(this.timersAtivos.get(telefone));
      this.timersAtivos.delete(telefone);
    }
    this.followupsPendentes.delete(telefone);
  }

  /**
   * Retorna estatísticas
   */
  obterEstatisticas() {
    return {
      totalPendentes: this.followupsPendentes.size,
      porTipo: Array.from(this.followupsPendentes.values()).reduce((acc, f) => {
        acc[f.tipo] = (acc[f.tipo] || 0) + 1;
        return acc;
      }, {}),
      proximoFollowup: this.obterPendentes()[0]?.dataExecutar
    };
  }
}

module.exports = FollowupScheduler;
