const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const logger = require('./logger');

class BackupManager {
  constructor() {
    this.backupDir = path.join(__dirname, 'backups');
    this.ensureBackupDir();
    this.arquivosImportantes = [
      'fila_mensagens.jsonl',
      'warmup_stats.jsonl',
      'metrics.jsonl',
      'prospeccao_resultados.jsonl',
      'leads_pendentes.jsonl',
    ];
  }

  ensureBackupDir() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  gerarBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupNome = `backup-${timestamp}.tar.gz`;
    const backupCaminho = path.join(this.backupDir, backupNome);

    try {
      logger.info('Iniciando backup automático', { nome: backupNome });

      const arquivosParaBackup = this.arquivosImportantes.filter(arquivo => {
        const caminho = path.join(__dirname, arquivo);
        return fs.existsSync(caminho);
      });

      if (arquivosParaBackup.length === 0) {
        logger.warn('Nenhum arquivo para fazer backup');
        return null;
      }

      // Criar um arquivo de backup simples (JSON)
      const backupData = {};
      for (const arquivo of arquivosParaBackup) {
        const caminho = path.join(__dirname, arquivo);
        try {
          const conteudo = fs.readFileSync(caminho, 'utf8');
          backupData[arquivo] = conteudo;
        } catch (err) {
          logger.warn(`Erro ao ler ${arquivo}`, err);
        }
      }

      // Salvar com compressão
      const jsonBackup = JSON.stringify(backupData, null, 2);
      fs.writeFileSync(backupCaminho, jsonBackup, 'utf8');

      const tamanhoKb = Math.round(fs.statSync(backupCaminho).size / 1024);
      logger.success('Backup concluído', {
        nome: backupNome,
        tamanhoKb,
        arquivos: arquivosParaBackup.length,
      });

      this.limparBackupsAntigos();
      return backupCaminho;
    } catch (err) {
      logger.error('Erro ao fazer backup', err);
      return null;
    }
  }

  restaurarBackup(caminhoBackup) {
    try {
      logger.info('Restaurando backup', { caminho: caminhoBackup });

      if (!fs.existsSync(caminhoBackup)) {
        logger.error('Arquivo de backup não encontrado', null, { caminho: caminhoBackup });
        return false;
      }

      const backupData = JSON.parse(fs.readFileSync(caminhoBackup, 'utf8'));

      for (const [arquivo, conteudo] of Object.entries(backupData)) {
        const caminho = path.join(__dirname, arquivo);
        fs.writeFileSync(caminho, conteudo, 'utf8');
      }

      logger.success('Backup restaurado', {
        arquivos: Object.keys(backupData).length,
      });
      return true;
    } catch (err) {
      logger.error('Erro ao restaurar backup', err);
      return false;
    }
  }

  limparBackupsAntigos(diasRetencao = 30) {
    try {
      const arquivos = fs.readdirSync(this.backupDir);
      const agora = Date.now();
      const msPodia = diasRetencao * 24 * 60 * 60 * 1000;
      let removidos = 0;

      for (const arquivo of arquivos) {
        const caminho = path.join(this.backupDir, arquivo);
        const stats = fs.statSync(caminho);

        if (agora - stats.mtime.getTime() > msPodia) {
          fs.unlinkSync(caminho);
          removidos++;
        }
      }

      if (removidos > 0) {
        logger.info(`Backups antigos removidos`, { quantidade: removidos });
      }
    } catch (err) {
      logger.error('Erro ao limpar backups antigos', err);
    }
  }

  obterBackupsDisponiveis() {
    try {
      const arquivos = fs.readdirSync(this.backupDir)
        .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
        .sort()
        .reverse()
        .slice(0, 10); // Últimos 10 backups

      return arquivos.map(arquivo => {
        const caminho = path.join(this.backupDir, arquivo);
        const stats = fs.statSync(caminho);
        return {
          nome: arquivo,
          tamanho: Math.round(stats.size / 1024),
          data: stats.mtime.toISOString(),
        };
      });
    } catch (err) {
      logger.error('Erro ao listar backups', err);
      return [];
    }
  }
}

module.exports = new BackupManager();
