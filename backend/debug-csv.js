const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, 'data', 'google.csv');
const content = fs.readFileSync(csvPath, 'utf-8');
const cleanContent = content.replace(/^﻿/, '');
const lines = cleanContent.split(/\r?\n/);

console.log('Total de linhas:', lines.length);
console.log('\nPrimeira linha (headers):');
console.log(lines[0]);
console.log('\nSegunda linha (exemplo):');
console.log(lines[1].substring(0, 200));

// Parse headers
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
console.log('\nHeaders parseados:');
headers.forEach((h, i) => {
  console.log(`${i}: "${h}"`);
});

console.log('\n\nValores da segunda linha:');
const values = parseCSVLine(lines[1]);
values.forEach((v, i) => {
  console.log(`${i}: "${v.substring(0, 50)}"`);
});
