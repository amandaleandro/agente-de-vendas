const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, 'data', 'google.csv');
const content = fs.readFileSync(csvPath, 'utf-8');
const cleanContent = content.replace(/^﻿/, '');
const lines = cleanContent.split(/\r?\n/);

function parseCSVLine(line) {
  if (!line) return [];

  const result = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 2;
      } else {
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, ''));
      current = '';
      i++;
    } else {
      current += char;
      i++;
    }
  }

  result.push(current.trim().replace(/^"|"$/g, ''));
  return result;
}

const headers = parseCSVLine(lines[0]);
const leads = [];

for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (!line || !line.trim()) {
    console.log(`Linha ${i}: VAZIA`);
    continue;
  }

  const values = parseCSVLine(line);
  const lead = {};

  headers.forEach((header, index) => {
    lead[header] = values[index] || '';
  });

  console.log(`Linha ${i}:`);
  console.log(`  Headers encontrados: ${Object.keys(lead).length}`);
  const nomeKey = Object.keys(lead).find(k => k.toLowerCase().includes('nome'));
  console.log(`  Nome key: "${nomeKey}"`);
  if (nomeKey) {
    console.log(`  Valor: "${lead[nomeKey]}"`);
    console.log(`  Trim: "${lead[nomeKey].trim()}"`);
    console.log(`  Validado: ${!!(lead[nomeKey] && lead[nomeKey].trim())}`);
  }

  const nome = lead[nomeKey]?.trim() || '';
  if (nome) {
    console.log(`  ✅ ADICIONADO: ${nome}`);
    leads.push(lead);
  } else {
    console.log(`  ❌ REJEITADO: nome vazio`);
  }
}

console.log(`\nTotal de leads: ${leads.length}`);
