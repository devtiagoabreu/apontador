// Script para rodar migration SQL no banco Neon
// Execute: node scripts/run-migration.js

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Ler DATABASE_URL do .env
const envContent = fs.readFileSync(path.join(__dirname, '../.env'), 'utf-8');
const match = envContent.match(/DATABASE_URL="([^"]+)"/);
if (!match) {
  console.error('DATABASE_URL nao encontrada no .env');
  process.exit(1);
}

const DATABASE_URL = match[1];

// Ler SQL
const sql = fs.readFileSync(path.join(__dirname, '../migrations/001_configuracoes.sql'), 'utf-8');

async function main() {
  const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

  console.log('Conectando ao banco de dados...');
  await client.connect();

  console.log('Executando migration...');
  await client.query(sql);

  console.log('Migration aplicada com sucesso!');
  await client.end();
}

main().catch((err) => {
  console.error('Erro:', err.message);
  process.exit(1);
});
