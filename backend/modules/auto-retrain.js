/**
 * Auto Retrain - Sistema de retreinamento automático do NLP
 * Dispara retreinamento baseado em triggers (conversas, tempo, etc)
 */

const learningManager = require('./learning-manager');
const NLPRetrain = require('./nlp-retrain');
const logger = require('./logger');

class AutoRetrain {
  constructor() {
    this.enabled = process.env.AUTO_RETRAIN_ENABLED === 'true';
    this.intervaloMinutos = parseInt(process.env.AUTO_RETRAIN_INTERVALO_MIN) || 60; // Default: 1 hora
    this.minConversasParaRetreinar = parseInt(process.env.AUTO_RETRAIN_MIN_CONVERSAS) || 20;
    this.ultimoRetreino = new Date();
    this.conversasDesdeUltimoRetreino = 0;
    this.retreinando = false;
    this.historico = [];

    if (this.enabled) {
      this.iniciar();
    }
  }

  iniciar() {
    logger.info('🧠 Auto Retrain inicializado', {
      intervalo: `${this.intervaloMinutos} minutos`,
      minConversas: this.minConversasParaRetreinar
    });

    // Executar retrain a cada intervalo
    setInterval(() => this.verificarERetreinar(), this.intervaloMinutos * 60 * 1000);

    // Executar verificação imediatamente
    this.verificarERetreinar();
  }

  async verificarERetreinar() {
    if (this.retreinando) {
      logger.warn('⚠️ Retreinamento já em andamento, pulando verificação');
      return;
    }

    try {
      const stats = learningManager.analisarConversas();
      const tempoDesdeUltimoMinutos = (new Date() - this.ultimoRetreino) / 60000;

      // Critérios para retreinar
      const cumpriuTempo = tempoDesdeUltimoMinutos >= this.intervaloMinutos;
      const cumpriuConversas = stats.sucessos >= this.minConversasParaRetreinar;
      const taxaSucessoMudou = stats.taxa_sucesso !== this.ultimaTaxaSucesso;

      if (!cumpriuTempo && !cumpriuConversas && !taxaSucessoMudou) {
        return; // Não precisa retreinar ainda
      }

      if (stats.total < 5) {
        logger.info('⏳ Esperando mais conversas para retreinar...', { total: stats.total });
        return;
      }

      logger.info('🔄 Iniciando retreinamento automático...', {
        tempoDesde: `${tempoDesdeUltimoMinutos.toFixed(1)}min`,
        conversasComSucesso: stats.sucessos,
        totalConversas: stats.total,
        taxaSucesso: `${stats.taxa_sucesso}%`
      });

      await this.retreinar();
    } catch (err) {
      logger.error('❌ Erro na verificação de retreino automático', { erro: err.message });
    }
  }

  async retreinar() {
    try {
      this.retreinando = true;

      const retrain = new NLPRetrain();
      const resultado = await retrain.retreinarComNovosPadroes();

      this.ultimoRetreino = new Date();
      this.ultimaTaxaSucesso = learningManager.analisarConversas().taxa_sucesso;

      const registro = {
        data: new Date(),
        resultado,
        tipo: 'automatico'
      };

      this.historico.push(registro);
      if (this.historico.length > 50) this.historico.shift(); // Manter últimos 50

      logger.info('✅ Retreinamento automático concluído com sucesso!', {
        frasesAdicionadas: resultado.sucessos,
        novoTotal: resultado.novo_total,
        novasIntencoes: resultado.novas_intencoes?.length || 0
      });

      return resultado;
    } catch (err) {
      logger.error('❌ Erro durante retreinamento automático', { erro: err.message });
      throw err;
    } finally {
      this.retreinando = false;
    }
  }

  /**
   * Retorna status do sistema de auto retrain
   */
  getStatus() {
    const stats = learningManager.analisarConversas();
    const tempoDesdeUltimoMinutos = (new Date() - this.ultimoRetreino) / 60000;

    return {
      enabled: this.enabled,
      retreinando: this.retreinando,
      ultimoRetreino: this.ultimoRetreino,
      tempoDesdeUltimo: `${tempoDesdeUltimoMinutos.toFixed(1)}min`,
      intervaloConfigurarado: `${this.intervaloMinutos}min`,
      minConversasParaRetreinar: this.minConversasParaRetreinar,
      statsAtual: {
        totalConversas: stats.total,
        sucessos: stats.sucessos,
        taxaSucesso: `${stats.taxa_sucesso}%`
      },
      proximoRetreino: this.calcularProximoRetreino(tempoDesdeUltimoMinutos),
      historico: this.historico.slice(-5).map(h => ({
        data: h.data,
        frasesAdicionadas: h.resultado.sucessos,
        novasIntencoes: h.resultado.novas_intencoes?.length || 0
      }))
    };
  }

  /**
   * Calcula quando será o próximo retreinamento
   */
  calcularProximoRetreino(tempoDesdeUltimoMinutos) {
    const minutosFaltando = this.intervaloMinutos - tempoDesdeUltimoMinutos;

    if (minutosFaltando <= 0) {
      return 'Pode executar agora';
    }

    const horas = Math.floor(minutosFaltando / 60);
    const minutos = Math.round(minutosFaltando % 60);

    if (horas > 0) {
      return `${horas}h ${minutos}min`;
    }
    return `${minutos}min`;
  }

  /**
   * Força retreinamento imediatamente
   */
  async forcaRetreino() {
    if (this.retreinando) {
      throw new Error('Retreinamento já em andamento');
    }

    logger.info('⚡ Retreinamento forçado pelo usuário');
    return this.retreinar();
  }

  /**
   * Muda configurações em tempo real
   */
  configurar(opcoes) {
    if (opcoes.enabled !== undefined) {
      this.enabled = opcoes.enabled;
      if (this.enabled) {
        this.iniciar();
      }
      logger.info(`Auto Retrain ${this.enabled ? 'ativado' : 'desativado'}`);
    }

    if (opcoes.intervaloMinutos) {
      this.intervaloMinutos = opcoes.intervaloMinutos;
      logger.info(`Intervalo ajustado para ${opcoes.intervaloMinutos} minutos`);
    }

    if (opcoes.minConversasParaRetreinar) {
      this.minConversasParaRetreinar = opcoes.minConversasParaRetreinar;
      logger.info(`Mínimo de conversas ajustado para ${opcoes.minConversasParaRetreinar}`);
    }
  }
}

module.exports = new AutoRetrain();
