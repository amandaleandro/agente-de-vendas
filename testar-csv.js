#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { lerCsv } = require('./csv');

function normalizarTelefone(valor) {
  let numero = String(valor || '').replace(/\D/g, '');
  if (numero.length === 10 || numero.length === 11) numero = `55${numero}`;
  return /^55\d{10,11}$/.test(numero) ? numero : null;
}

function testarCsv(arquivo) {
  console.log(`\n📋 Testando CSV: ${arquivo}`);

  if (!fs.existsSync(arquivo)) {
    console.log(`❌ Arquivo não encontrado: ${arquivo}`);
    return;
  }

  try {
    const linhas = lerCsv(fs.readFileSync(arquivo, 'utf8'));
    if (linhas.length < 2) {
      console.log('❌ CSV vazio ou sem dados');
      return;
    }

    const cab = linhas[0].map(v => v.trim().toLowerCase());
    console.log(`\n✅ Colunas encontradas: ${cab.join(', ')}`);

    const indice = (...nomes) => cab.findIndex(h => nomes.some(n => h.includes(n)));
    const iNome = indice('empresa', 'nome', 'company', 'business');
    const iTelefone = indice('telefone', 'whatsapp', 'celular', 'phone', 'tel', 'wa');

    if (iNome < 0) console.log('❌ Coluna de NOME não encontrada');
    if (iTelefone < 0) console.log('❌ Coluna de TELEFONE não encontrada');

    if (iNome >= 0 && iTelefone >= 0) {
      const vistos = new Set();
      const leads = linhas.slice(1)
        .map((col, idx) => ({
          linha: idx + 2,
          nome: col[iNome]?.trim(),
          telefone: col[iTelefone]?.trim(),
          telefoneLimpo: normalizarTelefone(col[iTelefone]),
          valido: col[iNome]?.trim() && normalizarTelefone(col[iTelefone])
        }))
        .filter(p => !vistos.has(p.telefoneLimpo) && p.telefoneLimpo && vistos.add(p.telefoneLimpo));

      console.log(`\n✅ ${leads.length} contatos válidos encontrados:\n`);
      leads.slice(0, 5).forEach(lead => {
        console.log(`  ${lead.nome.substring(0, 30).padEnd(30)} | ${lead.telefone}`);
      });

      if (leads.length > 5) {
        console.log(`  ... e mais ${leads.length - 5} contatos`);
      }

      console.log(`\n✅ CSV está OK! Pronto para usar.`);
    }
  } catch (err) {
    console.log(`❌ Erro: ${err.message}`);
  }
}

const arquivo = process.argv[2] || './listas/exemplo.csv';
testarCsv(arquivo);
