/**
 * 🌐 API de Prospecção
 * Endpoints para gerenciar agenda e upload de planilhas
 */

const fs = require('fs');
const path = require('path');
const busboy = require('busboy');

class APIPerspeccao {
  constructor(prospeccaoAgenda) {
    this.agenda = prospeccaoAgenda;
    this.diretorioPlanilhas = path.join(prospeccaoAgenda.caminhoBase, 'listas');
  }

  /**
   * Processa requisição de upload de arquivos
   */
  async handleUpload(req, res) {
    try {
      // Criar diretório se não existir
      if (!fs.existsSync(this.diretorioPlanilhas)) {
        fs.mkdirSync(this.diretorioPlanilhas, { recursive: true });
      }

      const uploadedFiles = [];
      const bb = busboy({ headers: req.headers, limits: { fileSize: 5 * 1024 * 1024 } });

      req.pipe(bb);

      await new Promise((resolve, reject) => {
        bb.on('file', (fieldname, file, info) => {
          const filename = info.filename;

          // Validar se é CSV
          if (!filename.endsWith('.csv')) {
            file.resume();
            return;
          }

          const savePath = path.join(this.diretorioPlanilhas, filename);
          const writeStream = fs.createWriteStream(savePath);

          file.pipe(writeStream);

          writeStream.on('finish', () => {
            uploadedFiles.push(filename);
          });

          writeStream.on('error', reject);
        });

        bb.on('close', resolve);
        bb.on('error', reject);
      });

      // Aguardar upload completar
      await new Promise(resolve => setTimeout(resolve, 500));

      if (uploadedFiles.length === 0) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Nenhum arquivo CSV enviado' }));
        return;
      }

      // Criar fila com as novas planilhas
      const planilhas = this.agenda.carregarPlanilhas();
      this.agenda.criarFila(planilhas);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        message: `${uploadedFiles.length} arquivo(s) enviado(s) com sucesso`,
        files: uploadedFiles,
        total_na_fila: this.agenda.fila.length
      }));
    } catch (err) {
      console.error('❌ Erro no upload:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  }

  /**
   * Retorna status da agenda
   */
  handleStatus(res) {
    try {
      const status = this.agenda.obterStatus();
      const relatorio = this.agenda.obterRelatorio();

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        total_planilhas: relatorio.resumo.total_planilhas,
        concluidas: relatorio.resumo.concluidas,
        total_contatos: relatorio.resumo.total_contatos,
        total_enviados: relatorio.resumo.total_enviados,
        total_erros: relatorio.resumo.total_erros,
        planilha_atual: status.planilha_atual,
        proxima_execucao: status.proxima_execucao,
        planilhas: relatorio.planilhas
      }));
    } catch (err) {
      console.error('❌ Erro ao obter status:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  }

  /**
   * Retorna relatório completo
   */
  handleRelatorio(res) {
    try {
      const relatorio = this.agenda.obterRelatorio();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(relatorio, null, 2));
    } catch (err) {
      console.error('❌ Erro ao gerar relatório:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  }

  /**
   * Inicia prospecção
   */
  handleIniciar(res) {
    try {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Prospecção iniciada' }));
    } catch (err) {
      console.error('❌ Erro ao iniciar:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  }

  /**
   * Pausa prospecção
   */
  handlePausar(res) {
    try {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Prospecção pausada' }));
    } catch (err) {
      console.error('❌ Erro ao pausar:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  }

  /**
   * Limpa agenda
   */
  handleLimpar(res) {
    try {
      this.agenda.limparAgenda();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Agenda limpa' }));
    } catch (err) {
      console.error('❌ Erro ao limpar:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  }

  /**
   * Retorna os contatos da planilha atual
   */
  handleLista(res) {
    try {
      let contatos = [];
      if (this.agenda.planilhaAtual && this.agenda.planilhaAtual.contatos) {
        contatos = this.agenda.planilhaAtual.contatos;
      } else if (this.agenda.fila.length > 0 && this.agenda.fila[0].contatos) {
        contatos = this.agenda.fila[0].contatos;
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, contatos }));
    } catch (err) {
      console.error('❌ Erro ao buscar lista de contatos:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  }

  /**
   * Retorna o histórico de contatos já prospectados
   */
  handleHistorico(res) {
    try {
      let historico = [];
      if (global.prospeccaoHistorico) {
        historico = Array.from(global.prospeccaoHistorico.historicoEmMemoria.entries()).map(([telefone, dados]) => ({
          telefone,
          enviado_em: dados.enviado_em,
          status: dados.status,
          sessao: dados.sessao,
          nome: dados.nome,
          empresa: dados.empresa
        }));
      }
      
      // Ordenar do mais recente para o mais antigo
      historico.sort((a, b) => new Date(b.enviado_em) - new Date(a.enviado_em));

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, historico }));
    } catch (err) {
      console.error('❌ Erro ao buscar histórico de prospecção:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  }

  /**
   * Processa requisição de API de prospecção
   */
  async processar(req, res, url) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return true;
    }

    // Upload
    if (url === '/api/prospeccao/upload' && req.method === 'POST') {
      await this.handleUpload(req, res);
      return true;
    }

    // Status
    if (url === '/api/prospeccao/status' && req.method === 'GET') {
      this.handleStatus(res);
      return true;
    }

    // Relatório
    if (url === '/api/prospeccao/relatorio' && req.method === 'GET') {
      this.handleRelatorio(res);
      return true;
    }

    // Iniciar
    if (url === '/api/prospeccao/iniciar' && req.method === 'POST') {
      this.handleIniciar(res);
      return true;
    }

    // Pausar
    if (url === '/api/prospeccao/pausar' && req.method === 'POST') {
      this.handlePausar(res);
      return true;
    }

    // Limpar
    if (url === '/api/prospeccao/limpar' && req.method === 'POST') {
      this.handleLimpar(res);
      return true;
    }

    // Lista de contatos
    if (url === '/api/prospeccao/lista' && req.method === 'GET') {
      this.handleLista(res);
      return true;
    }

    // Histórico de contatos
    if (url === '/api/prospeccao/historico' && req.method === 'GET') {
      this.handleHistorico(res);
      return true;
    }

    // Exportar Histórico para CSV
    if (url === '/api/prospeccao/exportar-historico' && req.method === 'GET') {
      this.handleExportarHistorico(res);
      return true;
    }

    return false;
  }

  handleExportarHistorico(res) {
    if (!this.agenda || !this.agenda.historico) {
      res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify({ success: false, error: 'Histórico indisponível' }));
    }

    try {
      const historicoArray = Array.from(this.agenda.historico.historicoEmMemoria.values());
      let csvContent = 'Telefone,Data de Envio,Status,Sessao,Nome,Empresa\n';
      
      historicoArray.forEach(item => {
        const nome = item.nome ? `"${item.nome.replace(/"/g, '""')}"` : '';
        const empresa = item.empresa ? `"${item.empresa.replace(/"/g, '""')}"` : '';
        csvContent += `${item.telefone},${item.enviado_em},${item.status},${item.sessao || 1},${nome},${empresa}\n`;
      });

      res.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="historico_prospeccao.csv"',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(csvContent);
    } catch (err) {
      console.error('Erro ao exportar histórico:', err);
      res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
  }
}

module.exports = APIPerspeccao;
