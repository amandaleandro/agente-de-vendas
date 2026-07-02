const fs = require('fs');
const path = require('path');

const KB_FILE = path.join(__dirname, '..', 'data', 'knowledge-base.json');

// Garantir diretório
if (!fs.existsSync(path.dirname(KB_FILE))) {
  fs.mkdirSync(path.dirname(KB_FILE), { recursive: true });
}

class KnowledgeBase {
  constructor() {
    this.materiais = [];
    this.carregarDados();
  }

  carregarDados() {
    try {
      if (fs.existsSync(KB_FILE)) {
        const dados = fs.readFileSync(KB_FILE, 'utf-8');
        this.materiais = JSON.parse(dados) || [];
      }
    } catch (err) {
      console.error('Erro ao carregar Knowledge Base:', err);
      this.materiais = [];
    }
  }

  salvarDados() {
    try {
      fs.writeFileSync(KB_FILE, JSON.stringify(this.materiais, null, 2));
    } catch (err) {
      console.error('Erro ao salvar Knowledge Base:', err);
    }
  }

  // Adicionar novo material
  adicionar(material) {
    if (!material.titulo || !material.conteudo) {
      throw new Error('Material deve ter título e conteúdo');
    }

    const novo = {
      id: material.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      titulo: material.titulo,
      conteudo: material.conteudo,
      categoria: material.categoria || 'geral',
      palavrasChave: material.palavrasChave || [],
      origem: material.origem || null,
      criado: new Date().toISOString(),
      atualizado: new Date().toISOString()
    };

    this.materiais.push(novo);
    this.salvarDados();
    return novo;
  }

  adicionarVarios(materiais) {
    if (!Array.isArray(materiais) || materiais.length === 0) {
      throw new Error('Nenhum material para adicionar');
    }

    const agora = new Date().toISOString();
    const novos = materiais.map((material, idx) => {
      if (!material.titulo || !material.conteudo) {
        throw new Error('Todos os materiais devem ter titulo e conteudo');
      }

      return {
        id: material.id || `${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 8)}`,
        titulo: material.titulo,
        conteudo: material.conteudo,
        categoria: material.categoria || 'geral',
        palavrasChave: material.palavrasChave || [],
        origem: material.origem || null,
        criado: agora,
        atualizado: agora
      };
    });

    this.materiais.push(...novos);
    this.salvarDados();
    return novos;
  }

  // Atualizar material
  atualizar(id, dados) {
    const idx = this.materiais.findIndex(m => m.id === id);
    if (idx === -1) throw new Error('Material não encontrado');

    this.materiais[idx] = {
      ...this.materiais[idx],
      ...dados,
      id: this.materiais[idx].id,
      criado: this.materiais[idx].criado,
      atualizado: new Date().toISOString()
    };

    this.salvarDados();
    return this.materiais[idx];
  }

  // Deletar material
  deletar(id) {
    const idx = this.materiais.findIndex(m => m.id === id);
    if (idx === -1) throw new Error('Material não encontrado');

    this.materiais.splice(idx, 1);
    this.salvarDados();
    return true;
  }

  // Listar todos
  listarTodos() {
    return this.materiais;
  }

  // Buscar por categoria
  buscarPorCategoria(categoria) {
    return this.materiais.filter(m => m.categoria === categoria);
  }

  // Buscar contexto relevante para uma conversa
  buscarContextoRelevante(texto, limite = 3) {
    if (!texto || texto.trim().length === 0) return [];

    const textoBaixo = texto.toLowerCase();
    const scores = this.materiais.map(material => {
      let score = 0;

      // Score por palavra-chave exata
      material.palavrasChave?.forEach(palavra => {
        if (textoBaixo.includes(palavra.toLowerCase())) {
          score += 10;
        }
      });

      // Score por palavras no título
      const tituloPartes = material.titulo.toLowerCase().split(' ');
      tituloPartes.forEach(parte => {
        if (textoBaixo.includes(parte) && parte.length > 3) {
          score += 5;
        }
      });

      // Score por palavras no conteúdo
      const conteudoPartes = material.conteudo.toLowerCase().split(' ');
      conteudoPartes.forEach(parte => {
        if (textoBaixo.includes(parte) && parte.length > 3) {
          score += 2;
        }
      });

      return { material, score };
    });

    return scores
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limite)
      .map(s => s.material);
  }

  // Gerar prompt com contexto de conhecimento
  gerarPromptComContexto(messagemDoUsuario, instrucoesBase) {
    const contexto = this.buscarContextoRelevante(messagemDoUsuario, 2);

    let promptFinal = instrucoesBase;

    if (contexto.length > 0) {
      promptFinal += `\n\n🎯 CONTEXTO SOBRE O QUE VOCÊ VENDE:\n`;

      contexto.forEach((material, idx) => {
        promptFinal += `\n### ${material.titulo}\n`;
        promptFinal += `${material.conteudo}\n`;
      });

      promptFinal += `\n(Use essas informações para responder com mais propriedade quando relevante)`;
    }

    return promptFinal;
  }

  // Estatísticas
  obterEstatisticas() {
    const categorias = {};
    this.materiais.forEach(m => {
      categorias[m.categoria] = (categorias[m.categoria] || 0) + 1;
    });

    return {
      totalMateriais: this.materiais.length,
      categorias,
      ultimaAtualizacao: this.materiais.length > 0
        ? this.materiais[this.materiais.length - 1].atualizado
        : null
    };
  }
}

module.exports = new KnowledgeBase();
