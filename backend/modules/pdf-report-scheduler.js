/**
 * Scheduler de Relatorio PDF
 * Gera relatorio periodico (padrao: segunda-feira 8h) com metricas do dashboard
 */

const cron = require('node-cron');
const pdfReport = require('./pdf-report');
const slackNotifications = require('./slack-notifications');

const logger = console;

class PdfReportScheduler {
  constructor() {
    this.agendamento = null;
    this.ultimoRelatorio = null;
    this.proximoRelatorio = null;
  }

  iniciar(horario = '0 8 * * 1') {
    try {
      // Padrão cron: "0 8 * * 1" = 8:00 toda segunda-feira
      // Customizável via ENV: REPORT_SCHEDULE_CRON

      this.agendamento = cron.schedule(horario, async () => {
        logger.log('\n📄 ===== RELATORIO AGENDADO =====');
        await this.gerar();
        this.atualizarProximoRelatorio(horario);
        logger.log('================================\n');
      });

      this.atualizarProximoRelatorio(horario);
      logger.log('✅ Scheduler de relatorio iniciado');
      logger.log(`   ⏰ Próximo relatório: ${this.proximoRelatorio}`);
    } catch (erro) {
      logger.error('❌ Erro ao iniciar scheduler de relatorio:', erro.message);
    }
  }

  async gerar(opcoes = {}) {
    try {
      const registro = await pdfReport.gerarPDF(opcoes);
      this.ultimoRelatorio = registro;
      await slackNotifications.relatorioGerado(registro);
      return registro;
    } catch (erro) {
      logger.error('❌ Erro ao gerar relatorio PDF:', erro.message);
      throw erro;
    }
  }

  atualizarProximoRelatorio(horario) {
    const partes = horario.split(' ');
    const [minuto, hora, , , diaSemana] = partes;
    const agora = new Date();

    const proxima = new Date(agora);
    proxima.setHours(parseInt(hora), parseInt(minuto), 0, 0);

    if (diaSemana !== '*' && !Number.isNaN(parseInt(diaSemana))) {
      const alvo = parseInt(diaSemana);
      let diff = (alvo - proxima.getDay() + 7) % 7;
      if (diff === 0 && proxima <= agora) diff = 7;
      proxima.setDate(proxima.getDate() + diff);
    } else if (proxima <= agora) {
      proxima.setDate(proxima.getDate() + 1);
    }

    this.proximoRelatorio = proxima.toISOString();
  }

  parar() {
    if (this.agendamento) {
      this.agendamento.stop();
      logger.log('⏹️ Scheduler de relatorio parado');
    }
  }

  obterStatus() {
    return {
      ativo: !!this.agendamento,
      ultimo_relatorio: this.ultimoRelatorio,
      proximo_relatorio: this.proximoRelatorio
    };
  }
}

module.exports = new PdfReportScheduler();
