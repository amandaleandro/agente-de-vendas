/**
 * Monitor de Sistema 24/7
 * - Uptime do servidor
 * - CPU/Memória/Disco
 * - Status APIs
 * - Alertas automáticos
 */

const os = require('os');
const fs = require('fs');
const path = require('path');
const pool = require('../database');

const logger = console;

class MonitorSystem {
  constructor() {
    this.metricas = {
      timestamp: new Date(),
      uptime: process.uptime(),
      cpu: { uso: 0, cores: os.cpus().length },
      memoria: { livre: 0, total: 0, uso_pct: 0 },
      disco: { livre: 0, total: 0, uso_pct: 0 },
      apis: { saudaveis: 0, falhas: 0 },
      banco_dados: { conectado: false, latencia_ms: 0 },
      ultima_verificacao: new Date()
    };

    this.historico = [];
    this.alertas = [];
    this.limites = {
      cpu_max: 80,
      memoria_max: 85,
      disco_max: 90,
      latencia_max: 5000 // 5 segundos
    };
  }

  async verificarSaude() {
    try {
      const inicio = Date.now();

      // 1. Uptime
      this.metricas.uptime = process.uptime();

      // 2. Memória
      const memoria = os.freemem();
      const memoriaTotal = os.totalmem();
      this.metricas.memoria = {
        livre: Math.round(memoria / 1024 / 1024),
        total: Math.round(memoriaTotal / 1024 / 1024),
        uso_pct: Math.round(((memoriaTotal - memoria) / memoriaTotal) * 100)
      };

      // 3. Disco
      this.metricas.disco = await this.verificarDisco();

      // 4. CPU (simplificado)
      this.metricas.cpu.uso = this.obterUsoCPU();

      // 5. Banco de Dados
      this.metricas.banco_dados = await this.verificarBancoDados();

      // 6. APIs Críticas
      this.metricas.apis = await this.verificarAPIs();

      // Adicionar ao histórico
      this.metricas.timestamp = new Date();
      this.metricas.ultima_verificacao = new Date();
      this.historico.unshift({ ...this.metricas });

      // Manter apenas últimas 24h (1440 minutos)
      if (this.historico.length > 1440) {
        this.historico = this.historico.slice(0, 1440);
      }

      // Verificar alertas
      this.verificarAlertas();

      const duracao = Date.now() - inicio;
      logger.log(
        `✅ Monitor: CPU ${this.metricas.cpu.uso}% | ` +
        `MEM ${this.metricas.memoria.uso_pct}% | ` +
        `DISCO ${this.metricas.disco.uso_pct}% | ` +
        `BD ${this.metricas.banco_dados.conectado ? '✓' : '✗'} | ` +
        `(${duracao}ms)`
      );

      return this.metricas;
    } catch (erro) {
      logger.error('❌ Erro ao verificar saúde:', erro.message);
      return null;
    }
  }

  async verificarDisco() {
    try {
      const stats = fs.statfsSync('/');

      const livre = Math.round(stats.bavail * stats.bsize / 1024 / 1024 / 1024);
      const total = Math.round(stats.blocks * stats.bsize / 1024 / 1024 / 1024);
      const usado = total - livre;
      const uso_pct = Math.round((usado / total) * 100);

      return { livre, total, usado, uso_pct };
    } catch (e) {
      logger.warn('⚠️ Não foi possível ler espaço em disco');
      return { livre: 0, total: 0, usado: 0, uso_pct: 0 };
    }
  }

  obterUsoCPU() {
    try {
      const cpus = os.cpus();
      let totalIdle = 0;
      let totalTick = 0;

      cpus.forEach(cpu => {
        for (const type in cpu.times) {
          totalTick += cpu.times[type];
        }
        totalIdle += cpu.times.idle;
      });

      return Math.round(((totalTick - totalIdle) / totalTick) * 100);
    } catch (e) {
      return 0;
    }
  }

  async verificarBancoDados() {
    const inicio = Date.now();
    try {
      const result = await pool.query('SELECT NOW()');
      const latencia = Date.now() - inicio;

      return {
        conectado: !!result.rows,
        latencia_ms: latencia,
        status: 'online'
      };
    } catch (erro) {
      return {
        conectado: false,
        latencia_ms: Date.now() - inicio,
        status: 'offline',
        erro: erro.message
      };
    }
  }

  async verificarAPIs() {
    // Simulação: verificar endpoints críticos
    try {
      // Em produção, fazer ping a endpoints reais
      return {
        saudaveis: 1,
        falhas: 0,
        total: 1
      };
    } catch (e) {
      return {
        saudaveis: 0,
        falhas: 1,
        total: 1
      };
    }
  }

  verificarAlertas() {
    const novosAlertas = [];

    // CPU
    if (this.metricas.cpu.uso > this.limites.cpu_max) {
      novosAlertas.push({
        tipo: 'CPU_ALTA',
        severidade: 'warning',
        mensagem: `CPU em ${this.metricas.cpu.uso}% (limite: ${this.limites.cpu_max}%)`,
        timestamp: new Date()
      });
    }

    // Memória
    if (this.metricas.memoria.uso_pct > this.limites.memoria_max) {
      novosAlertas.push({
        tipo: 'MEMORIA_ALTA',
        severidade: 'warning',
        mensagem: `Memória em ${this.metricas.memoria.uso_pct}% (limite: ${this.limites.memoria_max}%)`,
        timestamp: new Date()
      });
    }

    // Disco
    if (this.metricas.disco.uso_pct > this.limites.disco_max) {
      novosAlertas.push({
        tipo: 'DISCO_CHEIO',
        severidade: 'error',
        mensagem: `Disco em ${this.metricas.disco.uso_pct}% (limite: ${this.limites.disco_max}%)`,
        timestamp: new Date()
      });
    }

    // Banco de Dados
    if (!this.metricas.banco_dados.conectado) {
      novosAlertas.push({
        tipo: 'BD_DESCONECTADO',
        severidade: 'critical',
        mensagem: 'Banco de dados offline!',
        timestamp: new Date()
      });
    }

    if (this.metricas.banco_dados.latencia_ms > this.limites.latencia_max) {
      novosAlertas.push({
        tipo: 'BD_LENTA',
        severidade: 'warning',
        mensagem: `Banco de dados lenta: ${this.metricas.banco_dados.latencia_ms}ms`,
        timestamp: new Date()
      });
    }

    // Adicionar alertas novos
    if (novosAlertas.length > 0) {
      this.alertas.unshift(...novosAlertas);
      this.alertas = this.alertas.slice(0, 100); // Manter últimos 100

      // Log
      novosAlertas.forEach(a => {
        const emoji = a.severidade === 'critical' ? '🔴' : a.severidade === 'error' ? '🟠' : '🟡';
        logger.warn(`${emoji} ${a.tipo}: ${a.mensagem}`);
      });
    }
  }

  obterStatus() {
    return {
      metricas: this.metricas,
      alertas: this.alertas.slice(0, 10),
      uptime_horas: Math.round(this.metricas.uptime / 3600),
      saudavel: this.verificarSaudavel()
    };
  }

  verificarSaudavel() {
    return (
      this.metricas.memoria.uso_pct < 90 &&
      this.metricas.cpu.uso < 90 &&
      this.metricas.disco.uso_pct < 95 &&
      this.metricas.banco_dados.conectado
    );
  }

  obterHistorico(ultimas_horas = 24) {
    const limite = ultimas_horas * 60; // Converter para minutos
    return this.historico.slice(0, limite);
  }

  obterAlertas() {
    return {
      ativos: this.alertas.length,
      alertas: this.alertas,
      limites: this.limites
    };
  }

  configurarLimites(novoLimites) {
    this.limites = { ...this.limites, ...novoLimites };
    logger.log('✅ Limites atualizados:', this.limites);
  }

  gerarRelatorioSaude() {
    if (this.historico.length === 0) return null;

    const horas = this.historico.slice(0, 60); // Últimas 60 minutos
    const dias = this.historico.slice(0, 1440); // Últimas 24h

    const calcularMedia = (campo) => {
      return Math.round(
        dias.reduce((sum, m) => sum + (m.memoria?.[campo] || 0), 0) / dias.length
      );
    };

    return {
      periodo: '24 horas',
      memoriaMedia: calcularMedia('uso_pct'),
      cpuMedia: Math.round(
        dias.reduce((sum, m) => sum + (m.cpu?.uso || 0), 0) / dias.length
      ),
      uptime_horas: Math.round(this.metricas.uptime / 3600),
      alertas_total: this.alertas.length,
      bd_conectado: this.metricas.banco_dados.conectado,
      recomendacoes: this.gerarRecomendacoes()
    };
  }

  gerarRecomendacoes() {
    const recomendacoes = [];

    if (this.metricas.memoria.uso_pct > 70) {
      recomendacoes.push('💾 Considere aumentar memória RAM do servidor');
    }

    if (this.metricas.disco.uso_pct > 80) {
      recomendacoes.push('💿 Espaço em disco baixo. Limpe arquivos antigos ou aumente armazenamento');
    }

    if (this.metricas.banco_dados.latencia_ms > 1000) {
      recomendacoes.push('🗄️ Banco de dados lento. Considere otimizar queries ou aumentar recursos');
    }

    if (!this.metricas.banco_dados.conectado) {
      recomendacoes.push('⚠️ Banco de dados offline! Verifique conexão imediatamente');
    }

    if (recomendacoes.length === 0) {
      recomendacoes.push('✅ Tudo funcionando bem!');
    }

    return recomendacoes;
  }
}

module.exports = new MonitorSystem();
