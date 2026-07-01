const fs = require('fs');
const path = require('path');

/**
 * Sistema de treinamento com dados reais de conversas
 * Extrai conversas do banco, analisa padrões, treina modelos
 */
class TrainingSystem {
  constructor(pool) {
    this.pool = pool;
    this.pastaTrainamento = path.join(__dirname, '..', 'conhecimento', 'training');
    this.garantirPasta();
  }

  garantirPasta() {
    if (!fs.existsSync(this.pastaTrainamento)) {
      fs.mkdirSync(this.pastaTrainamento, { recursive: true });
    }
  }

  /**
   * Extrai todas as conversas do banco de dados
   */
  async extrairConversas() {
    try {
      const client = await this.pool.connect();
      const query = `
        SELECT
          l.telefone,
          l.status as lead_status,
          c.id as conversa_id,
          c.mensagem_entrada,
          c.mensagem_saida,
          c.created_at,
          l.created_at as lead_created_at
        FROM conversas c
        JOIN leads l ON c.lead_id = l.id
        ORDER BY l.id, c.created_at
      `;

      const result = await client.query(query);
      client.release();

      console.log(`📊 Extraídas ${result.rows.length} mensagens do banco`);
      return result.rows;
    } catch (err) {
      console.error('❌ Erro ao extrair conversas:', err.message);
      return [];
    }
  }

  /**
   * Agrupa mensagens por contato em conversas completas
   */
  agruparPorContato(mensagens) {
    const conversasPorContato = new Map();

    for (const msg of mensagens) {
      const chave = msg.telefone;
      if (!conversasPorContato.has(chave)) {
        conversasPorContato.set(chave, {
          telefone: msg.telefone,
          status: msg.lead_status,
          mensagens: [],
          criadoEm: msg.lead_created_at
        });
      }

      conversasPorContato.get(chave).mensagens.push({
        entrada: msg.mensagem_entrada,
        saida: msg.mensagem_saida,
        timestamp: msg.created_at
      });
    }

    return Array.from(conversasPorContato.values());
  }

  /**
   * Análise: quais padrões levam à conversão?
   */
  analisarPadroes(conversas) {
    const analise = {
      total: conversas.length,
      porStatus: {},
      padroesDePergunta: {},
      padroesDeSaida: {},
      conversaoRate: 0,
      conversasQueConverteram: [],
      conversasQueNaoConverteram: []
    };

    const statusFinal = new Map();

    for (const conversa of conversas) {
      // Contabilizar status
      if (!analise.porStatus[conversa.status]) {
        analise.porStatus[conversa.status] = 0;
      }
      analise.porStatus[conversa.status]++;

      // Extrair padrões de entrada
      for (const msg of conversa.mensagens) {
        if (!msg.entrada) continue;

        const entrada = msg.entrada.toLowerCase().trim();
        const palavrasChave = this.extrairPalavrasChave(entrada);

        for (const palavra of palavrasChave) {
          if (!analise.padroesDePergunta[palavra]) {
            analise.padroesDePergunta[palavra] = { count: 0, conversoes: 0 };
          }
          analise.padroesDePergunta[palavra].count++;

          // Contar como conversão se o status final é 'vendido'
          if (conversa.status === 'vendido') {
            analise.padroesDePergunta[palavra].conversoes++;
          }
        }
      }

      // Separar conversas que converteram
      if (conversa.status === 'vendido') {
        analise.conversasQueConverteram.push(conversa);
      } else {
        analise.conversasQueNaoConverteram.push(conversa);
      }
    }

    // Calcular taxa de conversão
    if (analise.conversasQueConverteram.length > 0) {
      analise.conversaoRate = (
        analise.conversasQueConverteram.length / analise.total * 100
      ).toFixed(2);
    }

    return analise;
  }

  /**
   * Extrai palavras-chave de um texto
   */
  extrairPalavrasChave(texto) {
    const stopwords = new Set([
      'o', 'a', 'de', 'da', 'do', 'e', 'é', 'em', 'para', 'por', 'com', 'sem',
      'que', 'qual', 'quais', 'como', 'quando', 'onde', 'por que', 'se', 'não',
      'sim', 'mais', 'menos', 'tudo', 'nada', 'algo', 'alguém', 'ninguém', 'um', 'uma'
    ]);

    const palavras = texto
      .split(/\s+/)
      .map(p => p.replace(/[^a-záéíóúãõç]/gi, '').toLowerCase())
      .filter(p => p.length > 3 && !stopwords.has(p));

    return [...new Set(palavras)]; // Remove duplicatas
  }

  /**
   * Gera dataset para treinar intent classifier
   */
  gerarDatasetIntentClassifier(conversas) {
    const dataset = [];

    // Intenções comum
    const mapeoIntencoes = {
      // Preco/Objeção
      'caro|preco|valor|quanto|custa|cobr|invoice': 'preco',

      // Dor/Problema
      'problema|dor|gargal|emperr|dificulda|desafio|dificil': 'dor_identificada',

      // Interesse/Afirmação
      'sim|exato|verdade|isso|certo|ok|legal|show|boa|top': 'afirmacao_positiva',

      // Desinteresse
      'não|nunca|nuca|nope|nah|não quero|não preciso|para|sai|bloqueia': 'desinteresse',

      // Pergunta sobre produto
      'como|explica|me mostra|detalh|funciona|qual|é|o que': 'duvida_produto',

      // Teste/verificação
      'teste|é bot|robo|script|ai': 'teste_bot'
    };

    for (const conversa of conversas) {
      for (const msg of conversa.mensagens) {
        if (!msg.entrada) continue;

        const entrada = msg.entrada.toLowerCase().trim();
        let intencaoEncontrada = 'desconhecido';

        // Tentar mapear intenção
        for (const [padrao, intencao] of Object.entries(mapeoIntencoes)) {
          const regex = new RegExp(padrao);
          if (regex.test(entrada)) {
            intencaoEncontrada = intencao;
            break;
          }
        }

        dataset.push({
          texto: msg.entrada,
          intencao: intencaoEncontrada,
          status_final: conversa.status,
          fonte: 'conversa_real'
        });
      }
    }

    return dataset;
  }

  /**
   * Salva análises em arquivo
   */
  salvarAnalises(nome, dados) {
    const caminho = path.join(this.pastaTrainamento, `${nome}.json`);
    fs.writeFileSync(caminho, JSON.stringify(dados, null, 2), 'utf8');
    console.log(`💾 Análise salva em: ${caminho}`);
  }

  /**
   * Salva dataset em formato JSONL
   */
  salvarDataset(nome, dataset) {
    const caminho = path.join(this.pastaTrainamento, `${nome}.jsonl`);
    const linhas = dataset.map(d => JSON.stringify(d)).join('\n');
    fs.writeFileSync(caminho, linhas, 'utf8');
    console.log(`💾 Dataset salvo (${dataset.length} exemplos): ${caminho}`);
  }

  /**
   * Executa pipeline completo de treinamento
   */
  async treinarCompleto() {
    console.log('\n🚀 Iniciando pipeline de treinamento...\n');

    // 1. Extrair conversas
    console.log('1️⃣  Extraindo conversas do banco...');
    const mensagens = await this.extrairConversas();

    if (mensagens.length === 0) {
      console.log('⚠️  Nenhuma conversa encontrada no banco para treinar');
      return null;
    }

    // 2. Agrupar por contato
    console.log('2️⃣  Agrupando em conversas completas...');
    const conversas = this.agruparPorContato(mensagens);
    console.log(`📊 ${conversas.length} conversas únicas`);

    // 3. Analisar padrões
    console.log('3️⃣  Analisando padrões de conversão...');
    const analise = this.analisarPadroes(conversas);
    console.log(`\n📈 Taxa de conversão: ${analise.conversaoRate}%`);
    console.log(`✅ Convertidas: ${analise.conversasQueConverteram.length}`);
    console.log(`❌ Não convertidas: ${analise.conversasQueNaoConverteram.length}`);
    console.log(`\n Status dos leads:`);
    for (const [status, count] of Object.entries(analise.porStatus)) {
      console.log(`  • ${status}: ${count}`);
    }

    // 4. Gerar dataset
    console.log('\n4️⃣  Gerando dataset para Intent Classifier...');
    const dataset = this.gerarDatasetIntentClassifier(conversas);
    console.log(`📚 ${dataset.length} exemplos de treinamento gerados`);

    // 5. Salvar resultados
    console.log('\n5️⃣  Salvando resultados...');
    this.salvarAnalises('analise_completa', analise);
    this.salvarAnalises('padroes_perguntas', analise.padroesDePergunta);
    this.salvarDataset('training_dataset_intent', dataset);

    // 6. Gerar relatório final
    const relatorio = {
      timestamp: new Date().toISOString(),
      resumo: {
        totalConversas: analise.total,
        taxaConversao: parseFloat(analise.conversaoRate),
        exemplosDataset: dataset.length,
        pastaTrainamento: this.pastaTrainamento
      },
      proximosPassos: [
        '1. Revisar padrões em "padroes_perguntas.json"',
        '2. Usar dataset em "training_dataset_intent.jsonl" para fine-tune',
        '3. Analisar "analise_completa.json" para insights de conversão',
        '4. Atualizar roteiro heurístico com padrões que convertem'
      ]
    };

    this.salvarAnalises('relatorio_treinamento', relatorio);

    console.log(`\n✅ Treinamento concluído!\n`);
    console.log('📁 Arquivos gerados:');
    console.log(`   • analise_completa.json`);
    console.log(`   • padroes_perguntas.json`);
    console.log(`   • training_dataset_intent.jsonl`);
    console.log(`   • relatorio_treinamento.json`);

    return relatorio;
  }

  /**
   * Gera insights de quais PADRÕES CONVERTEM
   */
  async gerarInsightsDeConversao() {
    console.log('\n🎯 Gerando insights de conversão...\n');

    try {
      const client = await this.pool.connect();

      // Buscar conversas que converteram
      const query = `
        SELECT
          c.mensagem_entrada as entrada,
          c.mensagem_saida as saida,
          l.status,
          COUNT(*) as frequencia
        FROM conversas c
        JOIN leads l ON c.lead_id = l.id
        WHERE l.status = 'vendido'
        GROUP BY c.mensagem_entrada, c.mensagem_saida, l.status
        ORDER BY frequencia DESC
        LIMIT 50
      `;

      const result = await client.query(query);
      client.release();

      const insights = {
        conversasQueConverteram: result.rows,
        padroes: this.extrairPadroesConversao(result.rows),
        recomendacoes: this.gerarRecomendacoes(result.rows)
      };

      this.salvarAnalises('insights_conversao', insights);
      console.log('✅ Insights de conversão gerados!');
      console.log('\nPrincipais padrões que convertem:');
      for (const [padrao, frequencia] of Object.entries(insights.padroes).slice(0, 10)) {
        console.log(`   • ${padrao}: ${frequencia}x`);
      }

      return insights;
    } catch (err) {
      console.error('❌ Erro ao gerar insights:', err.message);
      return null;
    }
  }

  extrairPadroesConversao(conversas) {
    const padroes = {};

    for (const conv of conversas) {
      const entrada = conv.entrada.toLowerCase();

      // Extrair palavras significativas
      const palavras = entrada.split(/\s+/).filter(p => p.length > 4);
      for (const palavra of palavras) {
        padroes[palavra] = (padroes[palavra] || 0) + conv.frequencia;
      }
    }

    // Ordenar por frequência
    return Object.entries(padroes)
      .sort((a, b) => b[1] - a[1])
      .reduce((obj, [chave, valor]) => {
        obj[chave] = valor;
        return obj;
      }, {});
  }

  gerarRecomendacoes(conversas) {
    const recomendacoes = [];

    // Análise de respostas bem-sucedidas
    const respostasQueConverteram = conversas.map(c => c.saida);

    recomendacoes.push({
      tipo: 'resposta_bem_sucedida',
      descricao: 'Use respostas que conversaram',
      exemplos: respostasQueConverteram.slice(0, 5)
    });

    recomendacoes.push({
      tipo: 'padroes_entrada',
      descricao: 'Tipos de entrada que levaram a venda',
      exemplos: conversas.slice(0, 5).map(c => c.entrada)
    });

    return recomendacoes;
  }
}

module.exports = TrainingSystem;
