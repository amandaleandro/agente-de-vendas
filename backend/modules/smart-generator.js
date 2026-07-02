// Gerador inteligente de mensagens personalizadas (SEM IA)
const leadAnalyzer = require('./lead-analyzer');
const messageStructures = require('./message-structures');
const logger = require('./logger');
const fs = require('fs');
const path = require('path');

class SmartMessageGenerator {
  constructor() {
    this.cache = new Map();
    this.cacheDir = path.join(__dirname, '../data');
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  // Carrega CSV do Google Maps
  loadCSV(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        logger.warn(`Arquivo CSV não encontrado: ${filePath}`);
        return [];
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      // Remove BOM if present
      const cleanContent = content.replace(/^﻿/, '');
      const lines = cleanContent.split(/\r?\n/);

      // Parse primeira linha como headers
      const headers = this.parseCSVLine(lines[0]);
      const leads = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line || !line.trim()) continue;

        const values = this.parseCSVLine(line);
        const lead = {};

        headers.forEach((header, index) => {
          lead[header] = values[index] || '';
        });

        // Procura pelo nome em possíveis colunas
        const nomeKey = Object.keys(lead).find(k => k.toLowerCase().includes('nome'));
        const nome = nomeKey ? lead[nomeKey] : '';
        if (nome && nome.trim()) {
          leads.push(lead);
        }
      }

      logger.info(`Carregados ${leads.length} leads do CSV`);
      return leads;
    } catch (error) {
      logger.error('Erro ao carregar CSV:', error);
      return [];
    }
  }

  // Parse linha CSV respeitando aspas - MELHORADO
  parseCSVLine(line) {
    if (!line) return [];

    const result = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i += 2;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        result.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }

    // Add last field
    result.push(current.trim().replace(/^"|"$/g, ''));
    return result;
  }

  // Gera mensagem para um lead específico
  generateMessage(lead) {
    try {
      // Analisa lead
      const analysis = leadAnalyzer.analyze(lead);
      if (!analysis) {
        return null;
      }

      // Gera mensagem baseado no perfil
      const message = messageStructures.generate(analysis.profile, analysis);

      return {
        lead: analysis,
        message,
        profile: analysis.profile,
        sentiment: analysis.sentiment,
        intensity: analysis.intensity
      };
    } catch (error) {
      logger.error('Erro ao gerar mensagem:', error);
      return null;
    }
  }

  // Gera mensagens para múltiplos leads
  generateMessages(leads, options = {}) {
    const { limit = null, filterProfile = null } = options;

    const results = [];

    for (let i = 0; i < leads.length; i++) {
      if (limit && results.length >= limit) break;

      const lead = leads[i];
      const generated = this.generateMessage(lead);

      if (generated && (!filterProfile || generated.profile === filterProfile)) {
        results.push(generated);
      }
    }

    return results;
  }

  // Gera múltiplas variações de uma mensagem
  generateVariations(lead, count = 3) {
    try {
      const analysis = leadAnalyzer.analyze(lead);
      if (!analysis) {
        return null;
      }

      const variations = messageStructures.generateVariations(analysis.profile, analysis, count);

      return {
        lead: analysis,
        variations,
        profile: analysis.profile,
        count: variations.length
      };
    } catch (error) {
      logger.error('Erro ao gerar variações:', error);
      return null;
    }
  }

  // Salva resultados em arquivo
  saveResults(data, fileName = 'mensagens-geradas.json') {
    try {
      const filePath = path.join(this.cacheDir, fileName);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      logger.info(`Mensagens salvas em: ${filePath}`);
      return filePath;
    } catch (error) {
      logger.error('Erro ao salvar resultados:', error);
      return null;
    }
  }

  // Gera relatório completo
  generateReport(leads) {
    const results = this.generateMessages(leads);

    const report = {
      timestamp: new Date().toISOString(),
      totalLeads: leads.length,
      totalProcessados: results.length,
      profiles: {},
      messages: results.map(r => ({
        nome: r.lead.nome,
        profile: r.profile,
        sentiment: r.lead.sentiment,
        rating: r.lead.rating,
        reviews: r.lead.reviews,
        message: r.message
      }))
    };

    // Agrupa por perfil
    results.forEach(result => {
      if (!report.profiles[result.profile]) {
        report.profiles[result.profile] = 0;
      }
      report.profiles[result.profile]++;
    });

    return report;
  }

  // Exporta para CSV as mensagens
  exportToCSV(results, fileName = 'mensagens-exportadas.csv') {
    try {
      const filePath = path.join(this.cacheDir, fileName);
      const headers = ['Nome', 'Rating', 'Reviews', 'Perfil', 'Sentimento', 'Mensagem'];

      let csv = headers.join(',') + '\n';

      results.forEach(r => {
        const message = (r.message || '').replace(/"/g, '""').replace(/\n/g, ' ');
        csv += `"${r.lead.nome}","${r.lead.rating}","${r.lead.reviews}","${r.profile}","${r.lead.sentiment}","${message}"\n`;
      });

      fs.writeFileSync(filePath, csv);
      logger.info(`CSV exportado: ${filePath}`);
      return filePath;
    } catch (error) {
      logger.error('Erro ao exportar CSV:', error);
      return null;
    }
  }

  // Obtém estatísticas
  getStats(results) {
    const stats = {
      total: results.length,
      byProfile: {},
      bySentiment: {},
      avgRating: 0,
      avgReviews: 0
    };

    let totalRating = 0;
    let totalReviews = 0;

    results.forEach(r => {
      const profile = r.profile;
      const sentiment = r.lead.sentiment;

      stats.byProfile[profile] = (stats.byProfile[profile] || 0) + 1;
      stats.bySentiment[sentiment] = (stats.bySentiment[sentiment] || 0) + 1;

      totalRating += r.lead.rating;
      totalReviews += r.lead.reviews;
    });

    stats.avgRating = (totalRating / results.length).toFixed(2);
    stats.avgReviews = Math.round(totalReviews / results.length);

    return stats;
  }
}

module.exports = new SmartMessageGenerator();
