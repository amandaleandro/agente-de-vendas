/**
 * ChipRolesManager
 *
 * Define o papel de cada numero (sessao) conectado:
 *  - 'prospeccao': usado apenas para envio de prospeccao
 *  - 'maturacao':  usado apenas no warmup cruzado (conversas entre chips)
 *  - 'ambos':      participa dos dois (comportamento padrao)
 *
 * Persistido em backend/chip-roles.json para sobreviver a reinicios.
 */

const fs = require('fs');
const path = require('path');

const PAPEIS_VALIDOS = ['prospeccao', 'maturacao', 'ambos'];
const ARQUIVO = path.join(__dirname, '..', 'chip-roles.json');

class ChipRolesManager {
  constructor() {
    this.papeis = new Map(); // sessao (number) -> papel
    this.carregar();
  }

  carregar() {
    try {
      if (fs.existsSync(ARQUIVO)) {
        const dados = JSON.parse(fs.readFileSync(ARQUIVO, 'utf8'));
        Object.entries(dados).forEach(([sessao, papel]) => {
          if (PAPEIS_VALIDOS.includes(papel)) {
            this.papeis.set(Number(sessao), papel);
          }
        });
        console.log(`🎭 Papéis dos chips carregados: ${JSON.stringify(dados)}`);
      }
    } catch (err) {
      console.log(`⚠️ Erro ao carregar papéis dos chips: ${err.message}`);
    }
  }

  salvar() {
    try {
      fs.writeFileSync(ARQUIVO, JSON.stringify(Object.fromEntries(this.papeis), null, 2), 'utf8');
    } catch (err) {
      console.log(`⚠️ Erro ao salvar papéis dos chips: ${err.message}`);
    }
  }

  obterPapel(sessao) {
    return this.papeis.get(Number(sessao)) || 'ambos';
  }

  definirPapel(sessao, papel) {
    if (!PAPEIS_VALIDOS.includes(papel)) {
      return { sucesso: false, erro: `Papel inválido. Use: ${PAPEIS_VALIDOS.join(', ')}` };
    }
    this.papeis.set(Number(sessao), papel);
    this.salvar();
    console.log(`🎭 Sessão ${sessao} agora tem papel: ${papel}`);
    return { sucesso: true, sessao: Number(sessao), papel };
  }

  podeProspectar(sessao) {
    const papel = this.obterPapel(sessao);
    return papel === 'prospeccao' || papel === 'ambos';
  }

  podeMaturar(sessao) {
    const papel = this.obterPapel(sessao);
    return papel === 'maturacao' || papel === 'ambos';
  }

  obterTodos() {
    return Object.fromEntries(this.papeis);
  }
}

module.exports = new ChipRolesManager();
