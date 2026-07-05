const fs = require('fs');
const path = require('path');

class ABTesting {
  constructor() {
    this.dir = path.join(__dirname, '..', 'conhecimento');
    this.file = path.join(this.dir, 'ab_tests.json');
    this.tests = this.load();
  }

  load() {
    try {
      if (!fs.existsSync(this.file)) return {};
      return JSON.parse(fs.readFileSync(this.file, 'utf8'));
    } catch (err) {
      return {};
    }
  }

  save() {
    if (!fs.existsSync(this.dir)) fs.mkdirSync(this.dir, { recursive: true });
    fs.writeFileSync(this.file, JSON.stringify(this.tests, null, 2), 'utf8');
  }

  ensureTest(nome, variants = []) {
    const key = String(nome || 'mensagem_inicial').trim() || 'mensagem_inicial';
    if (!this.tests[key]) {
      this.tests[key] = {
        nome: key,
        status: 'ativo',
        createdAt: new Date().toISOString(),
        variants: {}
      };
    }

    variants.forEach((variant, idx) => {
      const id = variant.id || String.fromCharCode(65 + idx);
      if (!this.tests[key].variants[id]) {
        this.tests[key].variants[id] = {
          id,
          label: variant.label || `Variação ${id}`,
          text: variant.text || '',
          sent: 0,
          replies: 0,
          wins: 0,
          losses: 0
        };
      }
    });

    this.save();
    return this.tests[key];
  }

  pickVariant(nome, leadId = '') {
    const test = this.ensureTest(nome, [
      { id: 'A', label: 'Direta' },
      { id: 'B', label: 'Consultiva' }
    ]);
    const variants = Object.values(test.variants);
    const hash = String(leadId || Date.now()).split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return variants[hash % variants.length];
  }

  record(nome, variantId, outcome = 'sent') {
    const test = this.ensureTest(nome);
    const id = variantId || 'A';
    if (!test.variants[id]) {
      test.variants[id] = { id, label: `Variação ${id}`, text: '', sent: 0, replies: 0, wins: 0, losses: 0 };
    }

    const variant = test.variants[id];
    if (outcome === 'reply') variant.replies += 1;
    else if (outcome === 'win') variant.wins += 1;
    else if (outcome === 'loss') variant.losses += 1;
    else variant.sent += 1;

    this.save();
    return variant;
  }

  report() {
    return Object.values(this.tests).map(test => ({
      ...test,
      variants: Object.values(test.variants).map(variant => ({
        ...variant,
        replyRate: variant.sent ? Number(((variant.replies / variant.sent) * 100).toFixed(1)) : 0,
        winRate: variant.sent ? Number(((variant.wins / variant.sent) * 100).toFixed(1)) : 0
      }))
    }));
  }
}

module.exports = new ABTesting();
