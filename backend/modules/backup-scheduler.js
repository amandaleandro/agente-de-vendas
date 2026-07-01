/**
 * Scheduler de Backup Automático
 * Executa backup diário às 2:00 AM (configurável)
 */

const cron = require('node-cron');
const backupManager = require('./backup-manager');

const logger = console;

class BackupScheduler {
  constructor() {
    this.agendamento = null;
    this.ultimoBackup = null;
    this.proximoBackup = null;
  }

  iniciar(horario = '0 2 * * *') {
    try {
      // Padrão cron: "0 2 * * *" = 2:00 AM todos os dias
      // Customizável via ENV: BACKUP_SCHEDULE_CRON

      this.agendamento = cron.schedule(horario, async () => {
        logger.log('\n📅 ===== BACKUP AGENDADO =====');
        const resultado = await backupManager.executarBackup();

        if (resultado) {
          this.ultimoBackup = resultado;
          this.enviarNotificacao(resultado);
        }

        this.atualizarProximoBackup(horario);
        logger.log('============================\n');
      });

      this.atualizarProximoBackup(horario);
      logger.log('✅ Scheduler de backup iniciado');
      logger.log(`   ⏰ Próximo backup: ${this.proximoBackup}`);

      // Fazer primeiro backup na primeira inicialização (opcional)
      this.fazerPrimeiroBackup();
    } catch (erro) {
      logger.error('❌ Erro ao iniciar scheduler:', erro.message);
    }
  }

  async fazerPrimeiroBackup() {
    const status = backupManager.obterStatusBackup();

    // Se não há backups, fazer um agora
    if (status.historico.length === 0) {
      logger.log('📦 Nenhum backup anterior encontrado. Criando backup inicial...');
      await backupManager.executarBackup();
    }
  }

  atualizarProximoBackup(horario) {
    const agora = new Date();
    const [minuto, hora] = horario.split(' ').slice(0, 2);

    const proxima = new Date(agora);
    proxima.setHours(parseInt(hora), parseInt(minuto), 0, 0);

    if (proxima <= agora) {
      proxima.setDate(proxima.getDate() + 1);
    }

    this.proximoBackup = proxima.toISOString();
  }

  enviarNotificacao(resultado) {
    // Aqui pode integrar com Slack, email, etc.
    logger.log('📧 Notificação de backup:');
    logger.log(`   ✓ Tamanho: ${resultado.tamanho_kb}KB`);
    logger.log(`   ✓ Registros: ${resultado.linhas_total}`);
  }

  parar() {
    if (this.agendamento) {
      this.agendamento.stop();
      logger.log('⏹️ Scheduler de backup parado');
    }
  }

  obterStatus() {
    return {
      ativo: !!this.agendamento,
      ultimo_backup: this.ultimoBackup,
      proximo_backup: this.proximoBackup
    };
  }
}

module.exports = new BackupScheduler();
