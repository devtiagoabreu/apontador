// E:\dev\apontador\src\lib\db\migrate.ts
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';

// Carregar variáveis de ambiente
dotenv.config({ path: path.join(process.cwd(), '.env') });

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL não encontrada');
  }

  console.log('🔄 Conectando ao banco de dados...');
  
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
  });

  const db = drizzle(pool);

  console.log('🔄 Aplicando migrations...');
  
  await migrate(db, { migrationsFolder: './migrations' });
  
  console.log('✅ Migrations aplicadas com sucesso!');
  
  await pool.end();
}

main().catch((error) => {
  console.error('❌ Erro ao aplicar migrations:', error);
  process.exit(1);
});