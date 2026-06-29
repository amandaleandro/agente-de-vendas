/**
 * 📅 Gerenciador de Agenda de Prospecção
 *
 * Responsável por:
 * - Carregar múltiplas planilhas CSV
 * - Organizar fila de execução
 * - Executar uma planilha por hora
 * - Rastrear progresso
 * - Salvar estado persistido
 */

const fs = require('fs');
const path = require('path');
const { lerCsv } = require('./csv');

class ProspeccaoAgenda {
  constructor(caminhoBase = __dirname) {
    this.caminhoBase = path.dirname(caminhoBase); // backend/
    this.diretorioPlanilhas = path.join(this.caminhoBase, 'listas');
    this.arquivoEstado = path.join(this.caminhoBase, 'prospeccao_agenda.json');

    // Estado
    this.fila = [];
    this.planilhaAtual = null;
    this.statusPlanilhas = new Map(); // nome -> { status, inicio, fim, contatos_totais, contatos_enviados }
    this.intervaloHoras = 1; // 1 hora entre planilhas
    this.proximaExecucao = null;

    this.carregarEstado();
  }

  /**
   * Carrega estado salvo anteriormente
   */
  carregarEstado() {
    try {
      if (fs.existsSync(this.arquivoEstado)) {
        const estado = JSON.parse(fs.readFileSync(this.arquivoEstado, 'utf8'));
        this.fila = estado.fila || [];
        this.planilhaAtual = estado.planilhaAtual;
        this.statusPlanilhas = new Map(Object.entries(estado.statusPlanilhas || {}));
        this.proximaExecucao = estado.proximaExecucao ? new Date(estado.proximaExecucao) : null;
        console.log(`✅ Agenda carregada: ${this.fila.length} planilhas na fila`);
      }
    } catch (err) {
      console.error('⚠️  Erro ao carregar estado da agenda:', err.message);
    }
  }

  /**
   * Salva estado atual em arquivo
   */
  salvarEstado() {
    try {
      const estado = {
        fila: this.fila,
        planilhaAtual: this.planilhaAtual,
        statusPlanilhas: Object.fromEntries(this.statusPlanilhas),
        proximaExecucao: this.proximaExecucao?.toISOString(),
        dataSalvamento: new Date().toISOString()
      };
      fs.writeFileSync(this.arquivoEstado, JSON.stringify(estado, null, 2), 'utf8');
    } catch (err) {
      console.error('❌ Erro ao salvar estado da agenda:', err.message);
    }
  }

  /**
   * Carrega todas as planilhas do diretório
   */
  carregarPlanilhas() {
    try {
      if (!fs.existsSync(this.diretorioPlanilhas)) {
        console.log(`ℹ️  Diretório ${this.diretorioPlanilhas} não existe`);
        return [];
      }

      const arquivos = fs.readdirSync(this.diretorioPlanilhas)
        .filter(f => f.endsWith('.csv') && !f.startsWith('.'));

      if (arquivos.length === 0) {
        console.log(`ℹ️  Nenhuma planilha CSV encontrada em ${this.diretorioPlanilhas}`);
        return [];
      }

      const planilhas = [];
      for (const arquivo of arquivos) {
        const caminho = path.join(this.diretorioPlanilhas, arquivo);
        try {
          const contatos = lerCsv(caminho);
          if (contatos.length > 0) {
            planilhas.push({
              nome: arquivo,
              caminho: caminho,
              contatos_totais: contatos.length,
              contatos: contatos
            });
          }
        } catch (err) {
          console.error(`❌ Erro ao carregar ${arquivo}:`, err.message);
        }
      }

      console.log(`\n📊 Planilhas encontradas: ${planilhas.length}`);
      planilhas.forEach(p => {
        console.log(`  📄 ${p.nome} - ${p.contatos_totais} contatos`);
      });

      return planilhas;
    } catch (err) {
      console.error('❌ Erro ao carregar planilhas:', err.message);
      return [];
    }
  }

  /**
   * Cria fila de planilhas para execução
   */
  criarFila(planilhas = null) {
    // Se não passar planilhas, carrega do diretório
    if (!planilhas) {
      planilhas = this.carregarPlanilhas();
    }

    if (planilhas.length === 0) {
      console.log('⚠️  Nenhuma planilha para adicionar à fila');
      return false;
    }

    // Criar fila com planilhas que ainda não foram iniciadas
    this.fila = planilhas
      .filter(p => !this.statusPlanilhas.has(p.nome))
      .map(p => ({
        nome: p.nome,
        caminho: p.caminho,
        contatos_totais: p.contatos_totais,
        contatos: p.contatos
      }));

    console.log(`\n✅ Fila criada com ${this.fila.length} planilhas`);
    console.log(`📊 Total de contatos: ${this.fila.reduce((sum, p) => sum + p.contatos_totais, 0)}`);

    this.salvarEstado();
    return true;
  }

  /**
   * Obtém próxima planilha a executar
   */
  obterProxima() {
    // Se está executando, retorna a atual
    if (this.planilhaAtual) {
      return this.planilhaAtual;
    }

    // Se não há fila, retorna null
    if (this.fila.length === 0) {
      return null;
    }

    // Verifica se precisa aguardar intervalo
    if (this.proximaExecucao && new Date() < this.proximaExecucao) {
      return null;
    }

    // Remove primeira da fila
    const proxima = this.fila.shift();
    this.planilhaAtual = proxima;

    // Inicializar status
    if (!this.statusPlanilhas.has(proxima.nome)) {
      this.statusPlanilhas.set(proxima.nome, {
        status: 'executando',
        inicio: new Date().toISOString(),
        contatos_totais: proxima.contatos_totais,
        contatos_enviados: 0,
        erros: 0
      });
    }

    console.log(`\n🚀 EXECUTANDO PLANILHA: ${proxima.nome}`);
    console.log(`📞 Contatos: ${proxima.contatos_totais}`);

    this.salvarEstado();
    return proxima;
  }

  /**
   * Marca planilha atual como concluída
   */
  marcarConcluida(enviados = 0, erros = 0) {
    if (!this.planilhaAtual) return;

    const status = this.statusPlanilhas.get(this.planilhaAtual.nome);
    if (status) {
      status.status = 'concluída';
      status.fim = new Date().toISOString();
      status.contatos_enviados = enviados;
      status.erros = erros;
    }

    console.log(`\n✅ PLANILHA CONCLUÍDA: ${this.planilhaAtual.nome}`);
    console.log(`📊 ${enviados} enviados, ${erros} erros`);

    // Agendar próxima execução
    this.proximaExecucao = new Date(Date.now() + this.intervaloHoras * 60 * 60 * 1000);
    console.log(`⏰ Próxima planilha em ${this.intervaloHoras} hora(s): ${this.proximaExecucao.toLocaleString('pt-BR')}`);

    this.planilhaAtual = null;
    this.salvarEstado();
  }

  /**
   * Obtém status da fila
   */
  obterStatus() {
    const pendentes = this.fila.map(p => p.nome);
    const concluidas = Array.from(this.statusPlanilhas.entries())
      .filter(([_, s]) => s.status === 'concluída')
      .map(([nome, status]) => ({ nome, ...status }));

    return {
      planilha_atual: this.planilhaAtual?.nome || null,
      proxima_execucao: this.proximaExecucao?.toLocaleString('pt-BR') || null,
      pendentes: {
        quantidade: this.fila.length,
        planilhas: pendentes
      },
      concluidas: {
        quantidade: concluidas.length,
        planilhas: concluidas
      },
      progresso: {
        total_fila: this.fila.length + concluidas.length,
        completado: concluidas.length,
        percentual: ((concluidas.length / (this.fila.length + concluidas.length)) * 100).toFixed(1) + '%'
      }
    };
  }

  /**
   * Obtém relatório detalhado
   */
  obterRelatorio() {
    const relatorio = {
      data_geracao: new Date().toISOString(),
      resumo: {
        total_planilhas: this.statusPlanilhas.size,
        concluidas: Array.from(this.statusPlanilhas.values()).filter(s => s.status === 'concluída').length,
        pendentes: this.fila.length
      },
      planilhas: Array.from(this.statusPlanilhas.entries()).map(([nome, status]) => ({
        nome,
        ...status
      }))
    };

    // Calcular totais
    const concluidas = Array.from(this.statusPlanilhas.values()).filter(s => s.status === 'concluída');
    relatorio.resumo.total_contatos = concluidas.reduce((sum, s) => sum + (s.contatos_totais || 0), 0);
    relatorio.resumo.total_enviados = concluidas.reduce((sum, s) => sum + (s.contatos_enviados || 0), 0);
    relatorio.resumo.total_erros = concluidas.reduce((sum, s) => sum + (s.erros || 0), 0);

    return relatorio;
  }

  /**
   * Exporta relatório em arquivo
   */
  exportarRelatorio() {
    try {
      const relatorio = this.obterRelatorio();
      const caminhoExportacao = path.join(this.caminhoBase, 'relatorio_agenda.json');
      fs.writeFileSync(caminhoExportacao, JSON.stringify(relatorio, null, 2), 'utf8');
      console.log(`✅ Relatório exportado: ${caminhoExportacao}`);
      return caminhoExportacao;
    } catch (err) {
      console.error('❌ Erro ao exportar relatório:', err.message);
      return null;
    }
  }

  /**
   * Limpa agenda (use com cuidado!)
   */
  limparAgenda() {
    try {
      this.fila = [];
      this.planilhaAtual = null;
      this.statusPlanilhas.clear();
      this.proximaExecucao = null;
      this.salvarEstado();
      console.log('🗑️  Agenda limpa');
      return true;
    } catch (err) {
      console.error('❌ Erro ao limpar agenda:', err.message);
      return false;
    }
  }
}

module.exports = ProspeccaoAgenda;
