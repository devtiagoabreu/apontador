const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.join(__dirname, '../.env'), 'utf-8');
const match = envContent.match(/DATABASE_URL="([^"]+)"/);
if (!match) { console.error('DATABASE_URL nao encontrada'); process.exit(1); }

const sql = fs.readFileSync(path.join(__dirname, '../migrations/002_sistemas_integracao.sql'), 'utf-8');

async function main() {
  const client = new Client({ connectionString: match[1], ssl: { rejectUnauthorized: false } });
  console.log('Conectando ao banco...');
  await client.connect();
  console.log('Executando migration 002...');
  await client.query(sql);
  console.log('Migration 002 aplicada com sucesso!');
  await client.end();
}

main().catch((err) => { console.error('Erro:', err.message); process.exit(1); });
