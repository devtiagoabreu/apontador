// Script para rodar migration SQL no banco Neon via HTTP API
// Execute: node scripts/run-migration.mjs

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Ler DATABASE_URL do .env
const envContent = readFileSync(join(__dirname, '../.env'), 'utf-8');
const match = envContent.match(/DATABASE_URL="([^"]+)"/);
if (!match) {
  console.error('❌ DATABASE_URL não encontrada no .env');
  process.exit(1);
}

const DATABASE_URL = match[1];

// Converter connection string para HTTP API do Neon
// O Neon HTTP API aceita queries via POST em https://<host>/sql
const url = new URL(DATABASE_URL);
const host = url.hostname;
const neonApiUrl = `https://${host}/sql`;

// Ler SQL
const sql = readFileSync(join(__dirname, '../migrations/001_configuracoes.sql'), 'utf-8');

// Separar statements (remover comentários e linhas vazias)
const statements = sql
  .split(';')
  .map(s => s.replace(/--.*$/gm, '').trim())
  .filter(s => s.length > 0);

console.log(`🔄 Conectando a ${host}...`);
console.log(`📝 ${statements.length} statements para executar`);

for (let i = 0; i < statements.length; i++) {
  const stmt = statements[i];
  console.log(`  [${i + 1}/${statements.length}] ${stmt.substring(0, 60)}...`);

  const response = await fetch(neonApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Neon-Connection-String': DATABASE_URL,
    },
    body: JSON.stringify({ query: stmt }),
  });

  const result = await response.json();

  if (result.message) {
    console.log(`    ✅ ${result.message}`);
  } else if (result.error) {
    console.error(`    ❌ Erro: ${result.error}`);
    process.exit(1);
  }
}

console.log('✅ Migration aplicada com sucesso!');
