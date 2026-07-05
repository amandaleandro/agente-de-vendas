/**
 * Slack Notifications - Envia alertas e notificações para Slack
 */

const https = require('https');
const logger = require('./logger');

class SlackNotifications {
  constructor() {
    this.webhookUrl = process.env.SLACK_WEBHOOK_URL;
    this.enabled = !!this.webhookUrl;
    this.channel = process.env.SLACK_CHANNEL || '#bot-alerts';
    this.username = 'FechaPro Bot 🤖';
    this.icon_emoji = ':robot_face:';

    if (this.enabled) {
      logger.info('✅ Slack Notifications ativado');
    }
  }

  /**
   * Envia mensagem para Slack
   */
  async enviar(titulo, descricao, campos = [], cor = '#667eea') {
    if (!this.enabled) {
      logger.warn('⚠️ Slack não configurado. Use SLACK_WEBHOOK_URL no .env');
      return;
    }

    try {
      const payload = {
        channel: this.channel,
        username: this.username,
        icon_emoji: this.icon_emoji,
        attachments: [
          {
            color: cor,
            title: titulo,
            text: descricao,
            fields: campos,
            ts: Math.floor(Date.now() / 1000)
          }
        ]
      };

      return this.post(payload);
    } catch (err) {
      logger.error('❌ Erro ao enviar Slack', { erro: err.message });
    }
  }

  /**
   * Notificação de Alerta
   */
  async alertaTaxaBaixa(dados) {
    const campos = [
      { title: 'Taxa Atual', value: `${dados.taxa_atual}%`, short: true },
      { title: 'Threshold', value: `${dados.threshold}%`, short: true },
      { title: 'Sucessos', value: `${dados.sucessos}/${dados.total_conversas}`, short: true },
      { title: 'Fracassos', value: dados.fracassos, short: true }
    ];

    return this.enviar(
      '⚠️ Taxa de Sucesso Baixa',
      'O bot está com taxa de sucesso abaixo do esperado!',
      campos,
      '#ff7675'
    );
  }

  /**
   * Notificação de Taxa de Fracasso Alta
   */
  async alertaTaxaFracassoAlta(dados) {
    const campos = [
      { title: 'Taxa de Fracasso', value: `${dados.taxa_fracasso}%`, short: true },
      { title: 'Conversas Falhadas', value: dados.conversas_falhadas, short: true }
    ];

    return this.enviar(
      '🔴 Taxa de Fracasso Muito Alta',
      'Mais de 60% das conversas estão falhando!',
      campos,
      '#d63031'
    );
  }

  /**
   * Notificação de Retreinamento Concluído
   */
  async retreinamentoConcluido(resultado) {
    const campos = [
      { title: 'Frases Adicionadas', value: resultado.sucessos.toString(), short: true },
      { title: 'Total Padrões', value: resultado.novo_total.toString(), short: true },
      { title: 'Novas Intenções', value: (resultado.novas_intencoes?.length || 0).toString(), short: true }
    ];

    return this.enviar(
      '🔄 Retreinamento Concluído',
      'O modelo NLP foi retreinado com sucesso!',
      campos,
      '#27ae60'
    );
  }

  /**
   * Notificação de Risco WhatsApp (logout/shadowban/limite atingido)
   */
  async alertaRiscoWhatsApp(dados) {
    const campos = [
      { title: 'Sessão', value: String(dados.sessao ?? '-'), short: true },
      { title: 'Evento', value: dados.evento || '-', short: true },
      { title: 'Detalhe', value: dados.detalhe || '-', short: false },
      { title: 'Erro', value: dados.erro || '-', short: false }
    ];

    return this.enviar(
      '🚨 Risco WhatsApp: possível ban/shadowban',
      `Evento crítico detectado na sessão ${dados.sessao}. Verifique o número antes de continuar enviando.`,
      campos,
      '#d63031'
    );
  }

  /**
   * Notificação de Status Geral
   */
  async statusGeral(stats) {
    const campos = [
      { title: 'Total Conversas', value: stats.total.toString(), short: true },
      { title: 'Taxa de Sucesso', value: `${stats.taxa_sucesso}%`, short: true },
      { title: 'Sucessos', value: stats.sucessos.toString(), short: true },
      { title: 'Fracassos', value: stats.fracassos.toString(), short: true },
      { title: 'Duração Média', value: `${Math.round(stats.duracao_media_ms / 1000)}s`, short: true }
    ];

    return this.enviar(
      '📊 Status Diário do Bot',
      'Relatório de desempenho do sistema',
      campos,
      '#3498db'
    );
  }

  /**
   * POST para Slack
   */
  private(payload) {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify(payload);

      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length
        }
      };

      const req = https.request(this.webhookUrl, options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            logger.info('✅ Mensagem Slack enviada');
            resolve(body);
          } else {
            reject(new Error(`Slack retornou ${res.statusCode}`));
          }
        });
      });

      req.on('error', reject);
      req.write(data);
      req.end();
    });
  }

  async post(payload) {
    return this.private(payload);
  }
}

module.exports = new SlackNotifications();
