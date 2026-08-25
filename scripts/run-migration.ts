import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(process.cwd(), '.env') });

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL não encontrada');
  }

  const sql = fs.readFileSync(
    path.join(process.cwd(), 'migrations/001_configuracoes.sql'),
    'utf-8'
  );

  console.log('🔄 Conectando ao banco de dados...');
  const client = neon(process.env.DATABASE_URL);

  console.log('🔄 Executando migration...');
  await client(sql);

  console.log('✅ Migration aplicada com sucesso!');
}

main().catch((error) => {
  console.error('❌ Erro ao aplicar migration:', error);
  process.exit(1);
});
