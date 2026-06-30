/**
 * Gerenciador de Historico de Prospeccao
 *
 * Responsavel por:
 * - Salvar registro de contatos prospectados
 * - Carregar historico ao iniciar
 * - Evitar reenvio para contatos ja prospectados
 * - Gerar relatorios de prospeccao
 */

const fs = require('fs');
const path = require('path');

class ProspeccaoHistorico {
  constructor(caminhoBase = __dirname) {
    this.caminhoBase = path.dirname(caminhoBase); // backend/
    this.arquivoResultados = path.join(this.caminhoBase, 'listas', 'prospeccao_resultados.jsonl');
    this.arquivoErros = path.join(this.caminhoBase, 'listas', 'prospeccao_erros.jsonl');
    this.historicoEmMemoria = new Map(); // telefone -> { enviado_em, status, sessao }
    this.errosEmMemoria = new Map(); // telefone -> { erro_em, status, erro }
    this.emProcessamento = new Set();

    this.carregarHistorico();
  }

  normalizarTelefone(telefone) {
    let numero = String(telefone || '').replace(/\D/g, '');
    if ((numero.length === 10 || numero.length === 11) && !numero.startsWith('55')) {
      numero = `55${numero}`;
    }
    return numero;
  }

  reservarEnvio(telefone) {
    const normalizado = this.normalizarTelefone(telefone);
    if (!normalizado || this.historicoEmMemoria.has(normalizado) || this.errosEmMemoria.has(normalizado) || this.emProcessamento.has(normalizado)) {
      return false;
    }
    this.emProcessamento.add(normalizado);
    return true;
  }

  liberarReserva(telefone) {
    const normalizado = this.normalizarTelefone(telefone);
    if (normalizado) this.emProcessamento.delete(normalizado);
  }

  carregarHistorico() {
    try {
      if (fs.existsSync(this.arquivoResultados)) {
        const linhas = fs.readFileSync(this.arquivoResultados, 'utf8').split('\n').filter(l => l.trim());
        linhas.forEach(linha => {
          try {
            const registro = JSON.parse(linha);
            if (registro.telefone && registro.status === 'enviado') {
              const telefone = this.normalizarTelefone(registro.telefone);
              this.historicoEmMemoria.set(telefone, {
                enviado_em: registro.data,
                status: 'enviado',
                sessao: registro.sessao,
                nome: registro.nome,
                empresa: registro.empresa
              });
            }
          } catch (err) {
            // Ignorar linhas invalidas
          }
        });
      }

      if (fs.existsSync(this.arquivoErros)) {
        const linhas = fs.readFileSync(this.arquivoErros, 'utf8').split('\n').filter(l => l.trim());
        linhas.forEach(linha => {
          try {
            const registro = JSON.parse(linha);
            if (registro.telefone && registro.status === 'erro') {
              const telefone = this.normalizarTelefone(registro.telefone);
              this.errosEmMemoria.set(telefone, {
                erro_em: registro.data,
                status: 'erro',
                erro: registro.erro,
                nome: registro.nome,
                empresa: registro.empresa,
                categoria: registro.categoria
              });
            }
          } catch (err) {
            // Ignorar linhas invalidas
          }
        });
      }

      const totalEnviados = Array.from(this.historicoEmMemoria.values()).filter(r => r.status === 'enviado').length;
      const totalErros = this.errosEmMemoria.size;
      console.log(`Historico carregado: ${totalEnviados} contatos ja prospectados, ${totalErros} erros`);

      return totalEnviados;
    } catch (err) {
      console.error('Erro ao carregar historico:', err.message);
      return 0;
    }
  }

  jaFoiProspectado(telefone) {
    const normalizado = this.normalizarTelefone(telefone);
    return this.historicoEmMemoria.has(normalizado) || this.errosEmMemoria.has(normalizado) || this.emProcessamento.has(normalizado);
  }

  registrarEnvio(dados) {
    const telefone = this.normalizarTelefone(dados.telefone);
    const registro = {
      ...dados,
      telefone,
      status: 'enviado',
      data: new Date().toISOString(),
      timestamp: Date.now()
    };

    try {
      fs.appendFileSync(
        this.arquivoResultados,
        `${JSON.stringify(registro)}\n`,
        'utf8'
      );

      if (telefone) {
        this.historicoEmMemoria.set(telefone, {
          enviado_em: registro.data,
          status: 'enviado',
          sessao: dados.sessao,
          nome: dados.nome,
          empresa: dados.empresa
        });
        this.liberarReserva(telefone);
      }

      return true;
    } catch (err) {
      console.error('Erro ao registrar envio:', err.message);
      return false;
    }
  }

  registrarErro(dados) {
    const telefone = this.normalizarTelefone(dados.telefone);
    const registro = {
      ...dados,
      telefone,
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

      if (telefone) {
        this.errosEmMemoria.set(telefone, {
          erro_em: registro.data,
          status: 'erro',
          erro: dados.erro,
          nome: dados.nome,
          empresa: dados.empresa,
          categoria: dados.categoria
        });
        this.liberarReserva(telefone);
      }

      return true;
    } catch (err) {
      console.error('Erro ao registrar erro:', err.message);
      return false;
    }
  }

  filtrarLeadsNovos(leads) {
    const vistos = new Set();
    return leads.filter(lead => {
      const telefone = this.normalizarTelefone(lead.telefone);
      if (!telefone || vistos.has(telefone) || this.jaFoiProspectado(telefone)) return false;
      vistos.add(telefone);
      lead.telefone = telefone;
      return true;
    });
  }

  obterRelatorio() {
    const total = this.historicoEmMemoria.size;
    const enviados = Array.from(this.historicoEmMemoria.values())
      .filter(r => r.status === 'enviado').length;
    const erros = this.errosEmMemoria.size;

    return {
      total_prospectados: total,
      enviados: enviados,
      erros: erros,
      taxa_sucesso: total > 0 ? ((enviados / total) * 100).toFixed(1) + '%' : '0%'
    };
  }

  limparHistorico() {
    try {
      if (fs.existsSync(this.arquivoResultados)) fs.unlinkSync(this.arquivoResultados);
      if (fs.existsSync(this.arquivoErros)) fs.unlinkSync(this.arquivoErros);
      this.historicoEmMemoria.clear();
      this.errosEmMemoria.clear();
      console.log('Historico de prospeccao limpo');
      return true;
    } catch (err) {
      console.error('Erro ao limpar historico:', err.message);
      return false;
    }
  }

  exportarRelatorio() {
    try {
      const relatorio = {
        data_geracao: new Date().toISOString(),
        resumo: this.obterRelatorio(),
        contatos_prospectados: Array.from(this.historicoEmMemoria.entries()).map(([tel, dados]) => ({
          telefone: tel,
          ...dados
        })),
        contatos_com_erro: Array.from(this.errosEmMemoria.entries()).map(([tel, dados]) => ({
          telefone: tel,
          ...dados
        }))
      };

      const caminhoExportacao = path.join(this.caminhoBase, 'relatorio_prospeccao.json');
      fs.writeFileSync(caminhoExportacao, JSON.stringify(relatorio, null, 2), 'utf8');
      console.log(`Relatorio exportado: ${caminhoExportacao}`);
      return caminhoExportacao;
    } catch (err) {
      console.error('Erro ao exportar relatorio:', err.message);
      return null;
    }
  }
}

module.exports = ProspeccaoHistorico;
