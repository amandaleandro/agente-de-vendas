/**
 * 📊 Gerenciador de Histórico de Prospecção
 *
 * Responsável por:
 * - Salvar registro de contatos prospectados
 * - Carregar histórico ao iniciar
 * - Evitar reenvio para contatos já prospectados
 * - Gerar relatórios de prospecção
 */

const fs = require('fs');
const path = require('path');

class ProspeccaoHistorico {
  constructor(caminhoBase = __dirname) {
    this.caminhoBase = path.dirname(caminhoBase); // backend/
    this.arquivoResultados = path.join(this.caminhoBase, 'listas', 'prospeccao_resultados.jsonl');
    this.arquivoErros = path.join(this.caminhoBase, 'listas', 'prospeccao_erros.jsonl');
    this.historicoEmMemoria = new Map(); // telefone -> { enviado_em, status, sessao }

    this.carregarHistorico();
  }

  /**
   * Carrega o histórico de envios anteriores do arquivo
   */
  carregarHistorico() {
    try {
      // Carregar envios bem-sucedidos
      if (fs.existsSync(this.arquivoResultados)) {
        const linhas = fs.readFileSync(this.arquivoResultados, 'utf8').split('\n').filter(l => l.trim());
        linhas.forEach(linha => {
          try {
            const registro = JSON.parse(linha);
            if (registro.telefone && registro.status === 'enviado') {
              this.historicoEmMemoria.set(registro.telefone, {
                enviado_em: registro.data,
                status: 'enviado',
                sessao: registro.sessao,
                nome: registro.nome,
                empresa: registro.empresa
              });
            }
          } catch (err) {
            // Ignorar linhas inválidas
          }
        });
      }

      const totalEnviados = Array.from(this.historicoEmMemoria.values()).filter(r => r.status === 'enviado').length;
      console.log(`✅ Histórico carregado: ${totalEnviados} contatos já prospectados`);

      return totalEnviados;
    } catch (err) {
      console.error('⚠️  Erro ao carregar histórico:', err.message);
      return 0;
    }
  }

  /**
   * Verifica se um contato já foi prospectado
   */
  jaFoiProspectado(telefone) {
    return this.historicoEmMemoria.has(telefone);
  }

  /**
   * Registra um envio bem-sucedido
   */
  registrarEnvio(dados) {
    const registro = {
      ...dados,
      status: 'enviado',
      data: new Date().toISOString(),
      timestamp: Date.now()
    };

    try {
      // Salvar em arquivo
      fs.appendFileSync(
        this.arquivoResultados,
        `${JSON.stringify(registro)}\n`,
        'utf8'
      );

      // Adicionar em memória
      if (dados.telefone) {
        this.historicoEmMemoria.set(dados.telefone, {
          enviado_em: registro.data,
          status: 'enviado',
          sessao: dados.sessao,
          nome: dados.nome,
          empresa: dados.empresa
        });
      }

      return true;
    } catch (err) {
      console.error('❌ Erro ao registrar envio:', err.message);
      return false;
    }
  }

  /**
   * Registra um erro de envio
   */
  registrarErro(dados) {
    const registro = {
      ...dados,
      status: 'erro',
      data: new Date().toISOString(),
      timestamp: Date.now()
    };

    try {
      fs.appendFileSync(
        this.arquivoErros,
        `${JSON.stringify(registro)}\n`,
        'utf8'
      );
      return true;
    } catch (err) {
      console.error('❌ Erro ao registrar erro:', err.message);
      return false;
    }
  }

  /**
   * Filtra leads removendo os já prospectados
   */
  filtrarLeadsNovos(leads) {
    return leads.filter(lead => !this.jaFoiProspectado(lead.telefone));
  }

  /**
   * Obtém relatório de prospecção
   */
  obterRelatorio() {
    const total = this.historicoEmMemoria.size;
    const enviados = Array.from(this.historicoEmMemoria.values())
      .filter(r => r.status === 'enviado').length;

    let erros = 0;
    try {
      if (fs.existsSync(this.arquivoErros)) {
        const linhas = fs.readFileSync(this.arquivoErros, 'utf8').split('\n').filter(l => l.trim());
        erros = linhas.length;
      }
    } catch (err) {
      // Ignorar
    }

    return {
      total_prospectados: total,
      enviados: enviados,
      erros: erros,
      taxa_sucesso: total > 0 ? ((enviados / total) * 100).toFixed(1) + '%' : '0%'
    };
  }

  /**
   * Limpa histórico (use com cuidado!)
   */
  limparHistorico() {
    try {
      fs.unlinkSync(this.arquivoResultados);
      fs.unlinkSync(this.arquivoErros);
      this.historicoEmMemoria.clear();
      console.log('🗑️  Histórico de prospecção limpo');
      return true;
    } catch (err) {
      console.error('❌ Erro ao limpar histórico:', err.message);
      return false;
    }
  }

  /**
   * Exporta histórico em formato legível
   */
  exportarRelatorio() {
    try {
      const relatorio = {
        data_geracao: new Date().toISOString(),
        resumo: this.obterRelatorio(),
        contatos_prospectados: Array.from(this.historicoEmMemoria.entries()).map(([tel, dados]) => ({
          telefone: tel,
          ...dados
        }))
      };

      const caminhoExportacao = path.join(this.caminhoBase, 'relatorio_prospeccao.json');
      fs.writeFileSync(caminhoExportacao, JSON.stringify(relatorio, null, 2), 'utf8');
      console.log(`✅ Relatório exportado: ${caminhoExportacao}`);
      return caminhoExportacao;
    } catch (err) {
      console.error('❌ Erro ao exportar relatório:', err.message);
      return null;
    }
  }
}

module.exports = ProspeccaoHistorico;
