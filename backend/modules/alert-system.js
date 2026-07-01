/**
 * Alert System - Sistema de alertas para monitorar saúde do bot
 */

const learningManager = require('./learning-manager');
const logger = require('./logger');

class AlertSystem {
  constructor() {
    this.alerts = new Map(); // alertId -> alertData
    this.thresholds = {
      taxa_sucesso_minima: parseFloat(process.env.ALERT_TAXA_MINIMA) || 50,
      tempo_sem_retrain: parseInt(process.env.ALERT_TEMPO_RETRAIN) || 240, // 4 horas em minutos
      conversas_minimas: parseInt(process.env.ALERT_CONVERSAS_MIN) || 10
    };
    this.callbacks = new Map(); // 'taxa_baixa' -> [func1, func2]
    this.ultimaVerificacao = new Date();
    this.iniciar();
  }

  iniciar() {
    logger.info('🚨 Alert System inicializado', this.thresholds);

    // Verificar alertas a cada 5 minutos
    setInterval(() => this.verificarAlertas(), 5 * 60 * 1000);

    // Primeira verificação imediata
    this.verificarAlertas();
  }

  /**
   * Verifica se há alertas que precisam ser disparados
   */
  async verificarAlertas() {
    try {
      const stats = learningManager.analisarConversas();

      // Alerta 1: Taxa de sucesso baixa
      if (stats.total >= this.thresholds.conversas_minimas) {
        const taxaNumero = parseFloat(stats.taxa_sucesso);
        if (taxaNumero < this.thresholds.taxa_sucesso_minima) {
          this.disparar('taxa_sucesso_baixa', {
            taxa_atual: stats.taxa_sucesso,
            threshold: this.thresholds.taxa_sucesso_minima,
            total_conversas: stats.total,
            sucessos: stats.sucessos,
            fracassos: stats.fracassos
          });
        } else {
          this.limpar('taxa_sucesso_baixa');
        }
      }

      // Alerta 2: Taxa de fracasso aumentando
      const taxaFracasso = 100 - parseFloat(stats.taxa_sucesso);
      if (taxaFracasso > 60) {
        this.disparar('taxa_fracasso_alta', {
          taxa_fracasso: taxaFracasso.toFixed(1),
          conversas_falhadas: stats.fracassos
        });
      } else {
        this.limpar('taxa_fracasso_alta');
      }

      // Alerta 3: Poucas conversas
      if (stats.total < 5 && stats.total > 0) {
        this.disparar('poucas_conversas', {
          total: stats.total,
          minimo_esperado: 5
        });
      } else {
        this.limpar('poucas_conversas');
      }

      this.ultimaVerificacao = new Date();
    } catch (err) {
      logger.error('❌ Erro ao verificar alertas', { erro: err.message });
    }
  }

  /**
   * Dispara um alerta
   */
  disparar(tipo, dados) {
    const alertId = `${tipo}_${Date.now()}`;

    if (!this.alerts.has(tipo)) {
      this.alerts.set(tipo, {
        tipo,
        dados,
        criado_em: new Date(),
        nivel: this.obterNivel(tipo)
      });

      logger.warn(`⚠️ ALERTA: ${tipo}`, dados);

      // Executar callbacks registrados
      const callbacks = this.callbacks.get(tipo) || [];
      callbacks.forEach(cb => {
        try {
          cb(dados);
        } catch (err) {
          logger.error('Erro ao executar callback de alerta', { tipo, erro: err.message });
        }
      });
    }
  }

  /**
   * Limpa um alerta
   */
  limpar(tipo) {
    if (this.alerts.has(tipo)) {
      logger.info(`✅ Alerta resolvido: ${tipo}`);
      this.alerts.delete(tipo);
    }
  }

  /**
   * Registra callback para um tipo de alerta
   */
  onAlerta(tipo, callback) {
    if (!this.callbacks.has(tipo)) {
      this.callbacks.set(tipo, []);
    }
    this.callbacks.get(tipo).push(callback);
  }

  /**
   * Retorna nível de severidade
   */
  obterNivel(tipo) {
    const niveis = {
      'taxa_sucesso_baixa': 'alto',
      'taxa_fracasso_alta': 'alto',
      'poucas_conversas': 'baixo',
      'sem_retrain_recente': 'medio'
    };
    return niveis[tipo] || 'medio';
  }

  /**
   * Retorna status de alertas
   */
  getStatus() {
    const alertas = Array.from(this.alerts.values()).map(a => ({
      tipo: a.tipo,
      nivel: a.nivel,
      criado_em: a.criado_em,
      dados: a.dados
    }));

    return {
      total_alertas: alertas.length,
      alertas,
      ultima_verificacao: this.ultimaVerificacao,
      thresholds: this.thresholds
    };
  }

  /**
   * Atualiza thresholds
   */
  configurar(novasConfig) {
    if (novasConfig.taxa_sucesso_minima !== undefined) {
      this.thresholds.taxa_sucesso_minima = novasConfig.taxa_sucesso_minima;
    }
    if (novasConfig.tempo_sem_retrain !== undefined) {
      this.thresholds.tempo_sem_retrain = novasConfig.tempo_sem_retrain;
    }
    if (novasConfig.conversas_minimas !== undefined) {
      this.thresholds.conversas_minimas = novasConfig.conversas_minimas;
    }

    logger.info('✅ Configuração de alertas atualizada', this.thresholds);
  }

  /**
   * Retorna lista de alertas ativos
   */
  getAlertas() {
    return Array.from(this.alerts.values());
  }
}

module.exports = new AlertSystem();
