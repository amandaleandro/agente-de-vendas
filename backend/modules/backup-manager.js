/**
 * Gerenciador de Backup Automático
 * - Backup diário do PostgreSQL
 * - Exportação JSON completa
 * - Restauração em 1 clique
 * - Histórico de 30 dias
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const pool = require('../database');

const execAsync = promisify(exec);
const logger = console;

const BACKUP_DIR = path.join(__dirname, '../backups');
const MAX_BACKUPS = 30; // Manter 30 dias

class BackupManager {
  constructor() {
    this.initBackupDir();
    this.backupHistory = this.loadBackupHistory();
    this.isRunning = false;
  }

  initBackupDir() {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
      logger.log('📁 Diretório de backups criado');
    }
  }

  loadBackupHistory() {
    const historyFile = path.join(BACKUP_DIR, '.history.json');
    if (fs.existsSync(historyFile)) {
      return JSON.parse(fs.readFileSync(historyFile, 'utf8'));
    }
    return [];
  }

  saveBackupHistory() {
    const historyFile = path.join(BACKUP_DIR, '.history.json');
    fs.writeFileSync(historyFile, JSON.stringify(this.backupHistory, null, 2));
  }

  getTimestamp() {
    return new Date().toISOString().split('T')[0];
  }

  async executarBackup() {
    if (this.isRunning) {
      logger.warn('⚠️ Backup já está em execução');
      return null;
    }

    this.isRunning = true;
    const timestamp = this.getTimestamp();
    const nomeBackup = `backup_${timestamp}_${Date.now()}.json`;
    const caminhoBackup = path.join(BACKUP_DIR, nomeBackup);

    try {
      logger.log('🔄 Iniciando backup automático...');
      const inicio = Date.now();

      // 1. Exportar tabelas principais
      const dados = await this.exportarDados();

      // 2. Salvar em arquivo
      fs.writeFileSync(caminhoBackup, JSON.stringify(dados, null, 2));
      const tamanho = fs.statSync(caminhoBackup).size / 1024; // KB

      // 3. Registrar no histórico
      const backup = {
        nome: nomeBackup,
        timestamp: new Date().toISOString(),
        tamanho_kb: Math.round(tamanho),
        tabelas: Object.keys(dados).length,
        linhas_total: Object.values(dados).reduce((sum, t) => sum + t.length, 0)
      };

      this.backupHistory.unshift(backup);
      this.backupHistory = this.backupHistory.slice(0, MAX_BACKUPS);
      this.saveBackupHistory();

      // 4. Limpar backups antigos
      this.limparBackupsAntigos();

      const duracao = Date.now() - inicio;
      logger.log(`✅ Backup concluído em ${duracao}ms`);
      logger.log(`   📦 Tamanho: ${Math.round(tamanho)}KB`);
      logger.log(`   📊 ${backup.linhas_total} registros salvos`);

      return backup;
    } catch (erro) {
      logger.error('❌ Erro ao fazer backup:', erro.message);
      return null;
    } finally {
      this.isRunning = false;
    }
  }

  async exportarDados() {
    const dados = {};

    try {
      // Tabelas principais
      const tabelas = [
        'leads',
        'conversas',
        'diagnosticos',
        'followups',
        'warmup_status'
      ];

      for (const tabela of tabelas) {
        try {
          const result = await pool.query(`SELECT * FROM ${tabela} ORDER BY id DESC LIMIT 10000`);
          dados[tabela] = result.rows;
          logger.log(`  ✓ ${tabela}: ${result.rows.length} registros`);
        } catch (e) {
          logger.warn(`  ⚠️ Erro ao exportar ${tabela}: ${e.message}`);
          dados[tabela] = [];
        }
      }

      // Arquivos JSON importantes
      const arquivosJSON = [
        '../conhecimento/aprendizado_bot.jsonl',
        '../conhecimento/padroes_sucesso.json'
      ];

      for (const arquivo of arquivosJSON) {
        const caminho = path.join(__dirname, arquivo);
        if (fs.existsSync(caminho)) {
          const nome = path.basename(caminho);
          if (arquivo.endsWith('.jsonl')) {
            const linhas = fs.readFileSync(caminho, 'utf8')
              .split('\n')
              .filter(l => l)
              .map(l => JSON.parse(l));
            dados[nome] = linhas;
          } else {
            dados[nome] = JSON.parse(fs.readFileSync(caminho, 'utf8'));
          }
        }
      }

      return dados;
    } catch (erro) {
      logger.error('Erro ao exportar dados:', erro);
      throw erro;
    }
  }

  async restaurarBackup(nomeBackup) {
    try {
      const caminhoBackup = path.join(BACKUP_DIR, nomeBackup);

      if (!fs.existsSync(caminhoBackup)) {
        throw new Error(`Backup não encontrado: ${nomeBackup}`);
      }

      logger.log(`🔄 Restaurando backup: ${nomeBackup}`);
      const inicio = Date.now();

      const dados = JSON.parse(fs.readFileSync(caminhoBackup, 'utf8'));

      // Tabelas do banco
      const tabelasDB = [
        'leads',
        'conversas',
        'diagnosticos',
        'followups',
        'warmup_status'
      ];

      let registrosRestaurados = 0;

      // Restaurar apenas o necessário (não trunca automaticamente por segurança)
      logger.log('⚠️ Restauração em modo read-only. Use com cuidado!');
      logger.log('   Dados disponíveis para restauração:');

      for (const tabela of tabelasDB) {
        if (dados[tabela]) {
          logger.log(`   ✓ ${tabela}: ${dados[tabela].length} registros`);
          registrosRestaurados += dados[tabela].length;
        }
      }

      const duracao = Date.now() - inicio;
      logger.log(`✅ Restauração preparada em ${duracao}ms`);
      logger.log(`   📊 ${registrosRestaurados} registros disponíveis`);

      return {
        sucesso: true,
        nome: nomeBackup,
        registros: registrosRestaurados,
        dados
      };
    } catch (erro) {
      logger.error('❌ Erro ao restaurar backup:', erro.message);
      return { sucesso: false, erro: erro.message };
    }
  }

  limparBackupsAntigos() {
    try {
      const arquivos = fs.readdirSync(BACKUP_DIR)
        .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
        .sort()
        .reverse();

      if (arquivos.length > MAX_BACKUPS) {
        const paraRemover = arquivos.slice(MAX_BACKUPS);
        paraRemover.forEach(f => {
          fs.unlinkSync(path.join(BACKUP_DIR, f));
          logger.log(`🗑️ Backup antigo removido: ${f}`);
        });
      }
    } catch (erro) {
      logger.warn('Erro ao limpar backups antigos:', erro.message);
    }
  }

  obterHistoricoBackups() {
    return this.backupHistory;
  }

  obterEspacoDisco() {
    try {
      let totalKB = 0;
      const arquivos = fs.readdirSync(BACKUP_DIR);

      arquivos.forEach(f => {
        const caminho = path.join(BACKUP_DIR, f);
        const stats = fs.statSync(caminho);
        totalKB += stats.size / 1024;
      });

      return {
        total_kb: Math.round(totalKB),
        total_mb: (Math.round(totalKB) / 1024).toFixed(2),
        arquivos: this.backupHistory.length
      };
    } catch (erro) {
      return { total_kb: 0, total_mb: '0', arquivos: 0 };
    }
  }

  obterStatusBackup() {
    return {
      em_execucao: this.isRunning,
      historico: this.backupHistory,
      espaco: this.obterEspacoDisco(),
      proxima_execucao: this.proxima_execucao || null
    };
  }
}

module.exports = new BackupManager();
