// Análise inteligente de dados de lead para gerar perfil único
const logger = require('./logger');

class LeadAnalyzer {
  constructor() {
    this.ratingThresholds = {
      excellent: 4.5,
      good: 3.5,
      average: 2.5,
      poor: 0
    };
  }

  // Remove caracteres não-ASCII mantendo apenas letras/números
  normalizeForSearch(str) {
    return str.toLowerCase()
      .replace(/[^\x00-\x7F]/g, '')
      .replace(/[^a-z0-9]/g, '');
  }

  // Busca uma chave no objeto usando matching flexível
  findKey(obj, searchTerm) {
    const search = this.normalizeForSearch(searchTerm);

    // Procura por match exato ou parcial
    return Object.keys(obj).find(k => {
      const keyNorm = this.normalizeForSearch(k);
      // Verifica se começa com o termo ou contém como substring
      return keyNorm.startsWith(search) || keyNorm.includes(search);
    }) || Object.keys(obj).find(k => {
      // Fallback: procura por qualquer chave que contenha o padrão (mesmo incompleto)
      const keyNorm = this.normalizeForSearch(k);
      const terms = search.split('');
      return terms.length > 2 && keyNorm.includes(terms.slice(0, 3).join(''));
    });
  }

  // Analisa lead e cria perfil único
  analyze(lead) {
    try {
      // Busca coluna de avaliação
      const avaliacaoKey = this.findKey(lead, 'avaliacao');
      const avaliacaoStr = (lead[avaliacaoKey] || '0').toString().replace(',', '.');
      const rating = parseFloat(avaliacaoStr) || 0;

      const qtdAvaliacoesKey = this.findKey(lead, 'quantidade');
      const reviews = this.parseReviews(lead[qtdAvaliacoesKey]);

      const categoryKey = this.findKey(lead, 'segmento');
      const category = lead[categoryKey] || '';

      const websiteKey = this.findKey(lead, 'site');
      const hasWebsite = !!lead[websiteKey] && lead[websiteKey].trim() !== '';

      const phoneKey = this.findKey(lead, 'telefone');
      const hasPhone = !!lead[phoneKey] && lead[phoneKey].trim() !== '';

      const enderecoKey = this.findKey(lead, 'endereco');
      const hasAddress = !!lead[enderecoKey] && lead[enderecoKey].trim() !== '';

      const profile = this.determineProfile({
        rating,
        reviews,
        category,
        hasWebsite,
        hasPhone,
        hasAddress
      });

      // Busca coluna de nome
      const nomeKey = this.findKey(lead, 'nome');
      const nome = lead[nomeKey]?.trim() || 'Empresa';

      return {
        nome,
        rating,
        reviews,
        category: category.trim(),
        hasWebsite,
        hasPhone,
        phone: lead[phoneKey]?.trim() || '',
        website: lead[websiteKey]?.trim() || '',
        address: lead[enderecoKey]?.trim() || '',
        profile,
        intensity: this.calculateIntensity(rating, reviews),
        sentiment: this.analyzeSentiment(rating, reviews)
      };
    } catch (error) {
      logger.error('Erro ao analisar lead:', error);
      return null;
    }
  }

  // Determina perfil único da empresa
  determineProfile(data) {
    const { rating, reviews, category } = data;

    // Sem nenhuma avaliação - Invisível online
    if (reviews === 0 && rating === 0) {
      return 'invisible';
    }

    // Poucas avaliações com rating alto - Emergente
    if (reviews > 0 && reviews <= 10 && rating >= this.ratingThresholds.good) {
      return 'emerging';
    }

    // Poucas avaliações com rating baixo - Iniciante em dificuldade
    if (reviews > 0 && reviews <= 10 && rating < this.ratingThresholds.good) {
      return 'struggling';
    }

    // Muitas avaliações com rating alto - Consolidada
    if (reviews > 30 && rating >= this.ratingThresholds.excellent) {
      return 'consolidated';
    }

    // Muitas avaliações com rating bom - Estabelecida
    if (reviews > 30 && rating >= this.ratingThresholds.good) {
      return 'established';
    }

    // Muitas avaliações com rating baixo - Necessita melhorias
    if (reviews > 30 && rating < this.ratingThresholds.good) {
      return 'needs_improvement';
    }

    // Rating muito baixo - Crítica
    if (rating < this.ratingThresholds.poor + 1) {
      return 'critical';
    }

    return 'stable';
  }

  // Calcula intensidade do pitch (quanto mais destaque)
  calculateIntensity(rating, reviews) {
    let score = 0;

    if (rating >= 4.5) score += 3;
    else if (rating >= 3.5) score += 2;
    else if (rating > 0) score += 1;

    if (reviews >= 50) score += 3;
    else if (reviews >= 20) score += 2;
    else if (reviews > 0) score += 1;

    return Math.min(score, 10);
  }

  // Analisa sentimento geral da empresa
  analyzeSentiment(rating, reviews) {
    if (rating === 0 && reviews === 0) return 'unknown';
    if (rating >= 4.5) return 'positive';
    if (rating >= 3.5) return 'neutral';
    if (rating >= 2.5) return 'negative';
    return 'critical';
  }

  // Parse número de avaliações (pode vir como "(99)" ou "99")
  parseReviews(value) {
    if (!value) return 0;
    const cleaned = value.toString().replace(/[()]/g, '').trim();
    const num = parseInt(cleaned, 10);
    return isNaN(num) ? 0 : num;
  }

  // Dica de gatilho para explorar na conversa
  getTrigger(profile, data) {
    const triggers = {
      invisible: `Começou a chamar atenção no Google em ${data.category}`,
      emerging: `Está decolando! Tem ${data.reviews} avaliações positivas`,
      struggling: `Tem potencial mas precisa de ajustes na comunicação`,
      consolidated: `Excelente reputação - ${data.reviews} clientes satisfeitos`,
      established: `Está crescendo com ${data.reviews} referências boas`,
      needs_improvement: `Tem muito movimento mas precisa melhorar satisfação`,
      critical: `Momento crucial para mudar estratégia`,
      stable: `Mantém posição estável no mercado`
    };
    return triggers[profile] || 'Empresa interessante para parceria';
  }
}

module.exports = new LeadAnalyzer();
