#!/usr/bin/env node

/**
 * Script de DEMONSTRAÇÃO do sistema de treinamento
 * Usa dados de exemplo para mostrar como funciona
 *
 * Uso: node demo-training.js
 */

const fs = require('fs');
const path = require('path');

class DemoTraining {
  constructor() {
    this.pastaTrainamento = path.join(__dirname, 'conhecimento', 'training');
    this.arquivoDados = path.join(this.pastaTrainamento, 'dados_exemplo.jsonl');
  }

  /**
   * Carrega dados de exemplo do JSONL
   */
  carregarDados() {
    if (!fs.existsSync(this.arquivoDados)) {
      console.error('❌ Arquivo de dados não encontrado:', this.arquivoDados);
      return [];
    }

    const linhas = fs.readFileSync(this.arquivoDados, 'utf8').split('\n').filter(l => l.trim());
    const dados = linhas.map(linha => {
      try {
        return JSON.parse(linha);
      } catch (e) {
        return null;
      }
    }).filter(Boolean);

    return dados;
  }

  /**
   * Analisa padrões nos dados
   */
  analisarPadroes(dados) {
    const analise = {
      total: dados.length,
      porStatus: {},
      padroesPorIntencao: {},
      intencoes: {},
      conversaoRate: 0
    };

    const vendidos = dados.filter(d => d.status_final === 'vendido');

    for (const dado of dados) {
      // Contabilizar status
      if (!analise.porStatus[dado.status_final]) {
        analise.porStatus[dado.status_final] = 0;
      }
      analise.porStatus[dado.status_final]++;

      // Contabilizar intenção
      if (!analise.intencoes[dado.intencao]) {
        analise.intencoes[dado.intencao] = { count: 0, vendidos: 0 };
      }
      analise.intencoes[dado.intencao].count++;

      if (dado.status_final === 'vendido') {
        analise.intencoes[dado.intencao].vendidos++;
      }
    }

    // Calcular taxa
    analise.conversaoRate = ((vendidos.length / dados.length) * 100).toFixed(1);

    return analise;
  }

  /**
   * Extrai padrões que convertem
   */
  extrairPadroesQueConvertem(dados) {
    const vendidos = dados.filter(d => d.status_final === 'vendido');
    const padroes = {};

    for (const msg of vendidos) {
      const palavras = msg.texto.toLowerCase().split(/\s+/).filter(p => p.length > 3);
      for (const palavra of palavras) {
        padroes[palavra] = (padroes[palavra] || 0) + 1;
      }
    }

    // Ordenar por frequência
    return Object.entries(padroes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .reduce((obj, [chave, valor]) => {
        obj[chave] = valor;
        return obj;
      }, {});
  }

  /**
   * Salva resultados
   */
  salvarResultados(nome, dados) {
    const caminho = path.join(this.pastaTrainamento, `${nome}.json`);
    fs.writeFileSync(caminho, JSON.stringify(dados, null, 2), 'utf8');
  }

  /**
   * Executa demo
   */
  async executar() {
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║      🤖 DEMONSTRAÇÃO DO SISTEMA DE TREINAMENTO           ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    console.log('📂 Carregando dados de exemplo...');
    const dados = this.carregarDados();

    if (dados.length === 0) {
      console.error('❌ Nenhum dado encontrado!');
      return;
    }

    console.log(`✅ Carregados ${dados.length} exemplos\n`);

    // Análise
    console.log('📊 Analisando padrões...\n');
    const analise = this.analisarPadroes(dados);

    console.log('📈 RESULTADOS DA ANÁLISE:\n');
    console.log(`   Total de mensagens: ${analise.total}`);
    console.log(`   Taxa de conversão: ${analise.conversaoRate}%\n`);

    console.log('   Por Status:');
    for (const [status, count] of Object.entries(analise.porStatus)) {
      const percentual = ((count / analise.total) * 100).toFixed(1);
      console.log(`      • ${status}: ${count} (${percentual}%)`);
    }

    console.log('\n   Intenções Identificadas:');
    for (const [intencao, stats] of Object.entries(analise.intencoes)) {
      const conversaoIntencao = ((stats.vendidos / stats.count) * 100).toFixed(0);
      console.log(`      • ${intencao}: ${stats.count} mensagens (${conversaoIntencao}% convertem)`);
    }

    // Padrões que convertem
    console.log('\n🎯 PADRÕES QUE MAIS CONVERTEM:\n');
    const padroes = this.extrairPadroesQueConvertem(dados);

    let rank = 1;
    for (const [palavra, freq] of Object.entries(padroes)) {
      console.log(`   ${rank}. "${palavra}" (aparece ${freq}x em vendas)`);
      rank++;
    }

    // Mensagens que converteram
    console.log('\n✅ EXEMPLOS DE MENSAGENS QUE VENDERAM:\n');
    const vendidos = dados.filter(d => d.status_final === 'vendido').slice(0, 5);
    for (const msg of vendidos) {
      console.log(`   • [${msg.intencao}] "${msg.texto}"`);
    }

    // Salvar análises
    console.log('\n💾 Salvando análises...');
    this.salvarResultados('demo_analise', analise);
    this.salvarResultados('demo_padroes', padroes);

    console.log(`✅ Análises salvas em: ${this.pastaTrainamento}\n`);

    console.log('🎯 RECOMENDAÇÕES:\n');
    console.log('   1. Use os padrões acima no roteiro heurístico');
    console.log('   2. Copie as mensagens que convertem');
    console.log('   3. Replique o estilo das intenções que vendem');
    console.log('   4. Quando banco tiver dados reais, rodar: node train.js\n');

    console.log('📝 Próximo passo:');
    console.log('   - Conectar banco PostgreSQL');
    console.log('   - Rodar: node train.js\n');
  }
}

const demo = new DemoTraining();
demo.executar().catch(err => console.error('❌ Erro:', err));
