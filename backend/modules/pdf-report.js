/**
 * Gerador de Relatorios PDF
 * Consolida metricas do dashboard (funil, conversas, IA) em um PDF periodico
 */

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const learningManager = require('./learning-manager');
const crmPipeline = require('./crm-pipeline');

const REPORTS_DIR = path.join(__dirname, '../relatorios');
const HISTORY_FILE = path.join(REPORTS_DIR, '.history.json');

function garantirDiretorio() {
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }
}

function lerHistorico() {
  garantirDiretorio();
  if (!fs.existsSync(HISTORY_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
  } catch (e) {
    return [];
  }
}

function salvarHistorico(historico) {
  garantirDiretorio();
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(historico.slice(0, 60), null, 2));
}

function formatarDuracao(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return '0min';
  const totalSegundos = Math.round(ms / 1000);
  const horas = Math.floor(totalSegundos / 3600);
  const minutos = Math.floor((totalSegundos % 3600) / 60);
  if (horas > 0) return `${horas}h ${minutos}min`;
  return `${minutos}min`;
}

function desenharTitulo(doc, texto) {
  doc.moveDown(0.5);
  doc.fontSize(14).fillColor('#111111').text(texto, { underline: false });
  doc.moveTo(doc.x, doc.y + 2).lineTo(doc.page.width - doc.page.margins.right, doc.y + 2)
    .strokeColor('#dddddd').stroke();
  doc.moveDown(0.5);
  doc.fillColor('#000000').fontSize(10);
}

function desenharLinha(doc, label, valor) {
  doc.fontSize(10).fillColor('#444444').text(label, { continued: true, width: 260 });
  doc.fillColor('#111111').text(String(valor));
}

function coletarDados({ dataInicio, dataFim } = {}) {
  const webserver = require('./webserver');
  const analytics = webserver.obterDadosAnalytics();
  const filtroLearning = dataInicio ? { dataApos: dataInicio } : {};
  const learningStats = learningManager.analisarConversas(filtroLearning);
  const funil = crmPipeline.funil();

  return { analytics, learningStats, funil };
}

function gerarPDF({ dataInicio, dataFim, titulo } = {}) {
  garantirDiretorio();

  const agora = new Date();
  const nomeArquivo = `relatorio_${agora.toISOString().slice(0, 10)}_${agora.getTime()}.pdf`;
  const caminho = path.join(REPORTS_DIR, nomeArquivo);

  const { analytics, learningStats, funil } = coletarDados({ dataInicio, dataFim });

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(caminho);
    doc.pipe(stream);

    doc.fontSize(20).fillColor('#111111').text(titulo || 'Relatorio FechaPro', { align: 'left' });
    doc.fontSize(10).fillColor('#666666').text(
      `Gerado em ${agora.toLocaleString('pt-BR')}${dataInicio ? ` — periodo desde ${new Date(dataInicio).toLocaleDateString('pt-BR')}` : ''}`
    );
    doc.moveDown();

    desenharTitulo(doc, 'Resumo de Conversas (Learning)');
    desenharLinha(doc, 'Total de conversas', learningStats.total || 0);
    desenharLinha(doc, 'Sucessos', learningStats.sucessos || 0);
    desenharLinha(doc, 'Fracassos', learningStats.fracassos || 0);
    desenharLinha(doc, 'Taxa de sucesso', `${learningStats.taxa_sucesso || 0}%`);
    desenharLinha(doc, 'Duracao media', formatarDuracao(learningStats.duracao_media_ms));

    desenharTitulo(doc, 'Funil de Prospeccao (envios/respostas)');
    desenharLinha(doc, 'Leads prospectados', analytics.funil.prospectados);
    desenharLinha(doc, 'Leads que responderam', analytics.funil.responderam);
    desenharLinha(doc, 'Taxa de conversao', `${analytics.funil.taxaConversao}%`);
    desenharLinha(doc, 'Duracao media de fila', analytics.filas.duracaoMedia);

    desenharTitulo(doc, 'Funil de Vendas (CRM)');
    desenharLinha(doc, 'Total de leads no funil', funil.resumo.total);
    Object.entries(funil.resumo.porEstagio || {}).forEach(([estagio, qtd]) => {
      desenharLinha(doc, `  Estagio: ${estagio}`, qtd);
    });
    desenharLinha(doc, 'Valor em aberto (R$)', funil.resumo.valorTotalAberto.toFixed(2));
    desenharLinha(doc, 'Valor ganho (R$)', funil.resumo.valorGanho.toFixed(2));
    desenharLinha(doc, 'Taxa de conversao (fechados)', `${funil.resumo.taxaConversao}%`);

    if (Object.keys(learningStats.intencoes || {}).length > 0) {
      desenharTitulo(doc, 'Top Intencoes Detectadas');
      Object.entries(learningStats.intencoes)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([intencao, qtd]) => desenharLinha(doc, intencao, qtd));
    }

    if (analytics.leadsQuentes.length > 0) {
      desenharTitulo(doc, `Leads Quentes (${analytics.leadsQuentes.length} responderam)`);
      analytics.leadsQuentes.slice(0, 15).forEach(lead => {
        desenharLinha(doc, `${lead.nome} (${lead.empresa})`, `${lead.total_mensagens} msgs`);
      });
    }

    doc.end();

    stream.on('finish', () => {
      const stat = fs.statSync(caminho);
      const registro = {
        nome: nomeArquivo,
        gerado_em: agora.toISOString(),
        tamanho_kb: Math.round(stat.size / 1024),
        taxa_sucesso: learningStats.taxa_sucesso || 0,
        total_conversas: learningStats.total || 0
      };
      const historico = lerHistorico();
      historico.unshift(registro);
      salvarHistorico(historico);
      resolve(registro);
    });
    stream.on('error', reject);
  });
}

function obterHistorico() {
  return lerHistorico();
}

function caminhoRelatorio(nome) {
  const seguro = path.basename(nome);
  const caminho = path.join(REPORTS_DIR, seguro);
  if (!fs.existsSync(caminho)) return null;
  return caminho;
}

module.exports = { gerarPDF, obterHistorico, caminhoRelatorio };
