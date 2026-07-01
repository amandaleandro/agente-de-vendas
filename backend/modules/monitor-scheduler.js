/**
 * Scheduler do Monitor do Sistema
 * Executa verificação a cada minuto
 */

const cron = require('node-cron');
const monitorSystem = require('./monitor-system');
const slackNotifications = require('./slack-notifications');

const logger = console;

class MonitorScheduler {
  constructor() {
    this.agendamento = null;
    this.alertasEnviados = new Set();
  }

  iniciar() {
    try {
      // Executar a cada minuto
      this.agendamento = cron.schedule('* * * * *', async () => {
        const metricas = await monitorSystem.verificarSaude();

        if (metricas) {
          // Enviar alertas para Slack se necessário
          this.processarAlertas(monitorSystem.obterAlertas());
        }
      });

      // Executar primeira verificação imediatamente
      (async () => {
        await monitorSystem.verificarSaude();
      })();

      logger.log('✅ Monitor de sistema iniciado (verificação a cada minuto)');
    } catch (erro) {
      logger.error('❌ Erro ao iniciar monitor:', erro.message);
    }
  }

  async processarAlertas(alertas) {
    for (const alerta of alertas.alertas) {
      const alertaId = `${alerta.tipo}_${alerta.timestamp.toISOString().split('T')[0]}`;

      // Enviar apenas um alerta por tipo por dia
      if (!this.alertasEnviados.has(alertaId) && slackNotifications.enabled) {
        await this.enviarAlertaSlack(alerta);
        this.alertasEnviados.add(alertaId);

        // Limpar ID antigos após 24h
        setTimeout(() => {
          this.alertasEnviados.delete(alertaId);
        }, 24 * 60 * 60 * 1000);
      }
    }
  }

  async enviarAlertaSlack(alerta) {
    try {
      const cores = {
        critical: '#dc2626',
        error: '#ea580c',
        warning: '#eab308'
      };

      const emojis = {
        CPU_ALTA: '⚡',
        MEMORIA_ALTA: '💾',
        DISCO_CHEIO: '💿',
        BD_DESCONECTADO: '❌',
        BD_LENTA: '🐌'
      };

      const campo_emoji = emojis[alerta.tipo] || '⚠️';

      await slackNotifications.enviar(
        `${campo_emoji} Alerta do Sistema: ${alerta.tipo}`,
        alerta.mensagem,
        [
          {
            title: 'Tipo',
            value: alerta.tipo,
            short: true
          },
          {
            title: 'Severidade',
            value: alerta.severidade.toUpperCase(),
            short: true
          },
          {
            title: 'Timestamp',
            value: new Date(alerta.timestamp).toLocaleString('pt-BR'),
            short: false
          }
        ],
        cores[alerta.severidade] || '#3b82f6'
      );

      logger.log(`📧 Alerta enviado para Slack: ${alerta.tipo}`);
    } catch (erro) {
      logger.warn(`⚠️ Erro ao enviar alerta Slack: ${erro.message}`);
    }
  }

  parar() {
    if (this.agendamento) {
      this.agendamento.stop();
      logger.log('⏹️ Monitor de sistema parado');
    }
  }

  obterStatus() {
    return {
      ativo: !!this.agendamento,
      saude: monitorSystem.obterStatus(),
      alertas: monitorSystem.obterAlertas(),
      relatorio: monitorSystem.gerarRelatorioSaude()
    };
  }
}

module.exports = new MonitorScheduler();
