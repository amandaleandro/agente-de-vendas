/**
 * Test Learning System - Script para testar o sistema de aprendizado
 * Simula várias conversas e mostra como o sistema aprende
 */

const learningManager = require('./modules/learning-manager');
const logger = require('./modules/logger');

// Simular algumas conversas para teste
async function testarSistemaAprendizado() {
  console.log('\n=== TESTE DO SISTEMA DE APRENDIZADO DO BOT ===\n');

  try {
    // Simular Conversa 1: Sucesso
    console.log('📱 Simulando Conversa 1 (SUCESSO)...');
    learningManager.registrarInicio('5585999887701', { nome: 'Amanda' });
    learningManager.registrarInteracao('5585999887701', 'Oi', 'saudacao', 'Opa! Aqui é Amanda. Depois que você manda uma proposta, o cliente costuma sumir ou volta com dúvidas?', 'apresentacao');
    learningManager.registrarInteracao('5585999887701', 'Sim, cliente some demais', 'dor_some', 'Pois é, isso é super comum. Você manda a proposta e fica no vácuo.', 'dor');
    learningManager.registrarInteracao('5585999887701', 'Exato, é ruim demais', 'afirmacao_positiva', 'Perfeito! Então basicamente o cliente desaparece depois da proposta. O FechaPro resolve isso. Quer fazer um teste?', 'perguntou_produto');
    learningManager.registrarResultado('5585999887701', 'sucesso', 'cliente_clicou_link');
    console.log('✅ Conversa 1 registrada como SUCESSO\n');

    // Simular Conversa 2: Sucesso
    console.log('📱 Simulando Conversa 2 (SUCESSO)...');
    learningManager.registrarInicio('5585999887702', { nome: 'Amanda' });
    learningManager.registrarInteracao('5585999887702', 'Olá', 'saudacao', 'E aí! Qual é seu maior problema no momento?', 'apresentacao');
    learningManager.registrarInteracao('5585999887702', 'Cliente não responde depois da proposta', 'dor_some', 'Tá, então o cliente desaparece depois da proposta. É sempre assim ou tem alguns que voltam?', 'dor');
    learningManager.registrarInteracao('5585999887702', 'Sempre desaparece', 'afirmacao_positiva', 'Entendo. O FechaPro ajuda você a acompanhar melhor. Quer testar?', 'perguntou_produto');
    learningManager.registrarResultado('5585999887702', 'sucesso', 'cliente_clicou_link');
    console.log('✅ Conversa 2 registrada como SUCESSO\n');

    // Simular Conversa 3: Fracasso
    console.log('📱 Simulando Conversa 3 (FRACASSO)...');
    learningManager.registrarInicio('5585999887703', { nome: 'Amanda' });
    learningManager.registrarInteracao('5585999887703', 'Oi', 'saudacao', 'Opa! Aqui é Amanda. Qual é sua maior dor?', 'apresentacao');
    learningManager.registrarInteracao('5585999887703', 'Não tenho interesse', 'desinteresse', 'Tudo bem, sem problema!', 'encerrado');
    learningManager.registrarResultado('5585999887703', 'fracasso', 'desinteresse_explicito');
    console.log('❌ Conversa 3 registrada como FRACASSO\n');

    // Simular Conversa 4: Indeciso
    console.log('📱 Simulando Conversa 4 (INDECISO)...');
    learningManager.registrarInicio('5585999887704', { nome: 'Amanda' });
    learningManager.registrarInteracao('5585999887704', 'Opa', 'saudacao', 'Opa! Aqui é Amanda.', 'apresentacao');
    learningManager.registrarInteracao('5585999887704', 'Me explica', 'duvida_produto', 'Basicamente ajuda você a organizar propostas e acompanhar.', 'perguntou_produto');
    learningManager.registrarResultado('5585999887704', 'indeciso', 'sem_resposta');
    console.log('⏳ Conversa 4 registrada como INDECISO\n');

    // Analisar estatísticas
    console.log('📊 ESTATÍSTICAS GERAIS\n');
    const stats = learningManager.analisarConversas();
    console.log(`Total de Conversas: ${stats.total}`);
    console.log(`Sucessos: ${stats.sucessos}`);
    console.log(`Fracassos: ${stats.fracassos}`);
    console.log(`Taxa de Sucesso: ${stats.taxa_sucesso}%`);
    console.log(`Duração Média: ${stats.duracao_media_ms}ms`);
    console.log(`\nIntençõe Detectadas:`);
    for (const [intencao, count] of Object.entries(stats.intencoes)) {
      console.log(`  - ${intencao}: ${count}`);
    }

    // Mostrar padrões descobertos
    console.log('\n🎯 PADRÕES DE SUCESSO DESCOBERTOS\n');
    const padroes = Array.from(learningManager.padroesSucesso.values())
      .sort((a, b) => b.taxaSucesso - a.taxaSucesso)
      .slice(0, 5);

    if (padroes.length === 0) {
      console.log('(Ainda sem padrões - precisa de mais conversas bem-sucedidas)');
    } else {
      padroes.forEach((p, i) => {
        console.log(`${i + 1}. [${p.intencao}] Taxa: ${p.taxaSucesso}% | ${p.resposta.substring(0, 60)}...`);
      });
    }

    // Mostrar últimas conversas
    console.log('\n📜 ÚLTIMAS CONVERSAS\n');
    const ultimas = learningManager.obterUltimasConversas(5);
    ultimas.forEach((c, i) => {
      console.log(`${i + 1}. ${c.telefone} → ${c.resultado.toUpperCase()} (${c.duracao_ms}ms)`);
    });

    // Gerar dados de treinamento
    console.log('\n📚 DADOS PARA RETREINAMENTO\n');
    const dados = learningManager.gerarDadosTreinamento();
    console.log(`Novas frases descobertas: ${dados.novasFrases.length}`);
    if (dados.novasFrases.length > 0) {
      console.log(`Exemplos:`);
      dados.novasFrases.slice(0, 3).forEach((d, i) => {
        console.log(`  ${i + 1}. "${d.frase}" → ${d.intencao}`);
      });
    }

    // Exportar CSV
    console.log('\n💾 EXPORTAR CSV\n');
    const csv = learningManager.exportarCSV();
    if (csv) {
      const linhas = csv.split('\n');
      console.log(`CSV gerado com ${linhas.length - 1} linhas`);
      console.log(`Primeiras linhas:`);
      linhas.slice(0, 3).forEach(l => console.log(`  ${l}`));
    }

    console.log('\n✅ TESTE CONCLUÍDO COM SUCESSO\n');
    console.log('Arquivos criados em:');
    console.log('  - backend/conhecimento/aprendizado_bot.jsonl');
    console.log('  - backend/conhecimento/padroes_sucesso.json');

  } catch (err) {
    console.error('❌ Erro durante teste:', err.message);
    process.exit(1);
  }
}

// Executar teste
testarSistemaAprendizado().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});
