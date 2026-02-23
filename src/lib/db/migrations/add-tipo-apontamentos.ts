import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { sql } from 'drizzle-orm';

dotenv.config({ path: path.join(process.cwd(), '.env') });

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL não encontrada');
  process.exit(1);
}

async function migrate() {
  console.log('🔄 Iniciando migração da tabela apontamentos...');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  
  try {
    // Verificar se a coluna tipo já existe
    const result = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'apontamentos' AND column_name = 'tipo'
    `);

    if (result.rows.length === 0) {
      console.log('➕ Adicionando coluna: tipo');
      await db.execute(sql`
        ALTER TABLE apontamentos 
        ADD COLUMN tipo VARCHAR(10) NOT NULL DEFAULT 'PRODUCAO'
      `);
      console.log('✅ Coluna tipo adicionada com sucesso');
    } else {
      console.log('⏭️ Coluna tipo já existe');
    }

    // Verificar resultado
    const columns = await db.execute(sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'apontamentos'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📊 Estrutura atual da tabela:');
    columns.rows.forEach(row => {
      console.log(`  - ${row.column_name} (${row.data_type})`);
    });

  } catch (error) {
    console.error('❌ Erro na migração:', error);
  } finally {
    await pool.end();
  }
}

migrate();