import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { sql } from 'drizzle-orm';

dotenv.config({ path: path.join(process.cwd(), '.env') });

async function migrate() {
  console.log('🔄 Iniciando migração da tabela apontamentos...');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  
  try {
    // Verificar colunas existentes
    const columns = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'apontamentos'
    `);
    
    const columnNames = columns.rows.map(c => c.column_name);
    console.log('📊 Colunas atuais:', columnNames);

    // Adicionar is_reprocesso se não existir
    if (!columnNames.includes('is_reprocesso')) {
      console.log('➕ Adicionando coluna: is_reprocesso');
      await db.execute(sql`
        ALTER TABLE apontamentos 
        ADD COLUMN is_reprocesso BOOLEAN DEFAULT false
      `);
      console.log('✅ Coluna is_reprocesso adicionada');
    }

    // Verificar resultado
    const result = await db.execute(sql`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'apontamentos'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📊 Estrutura final:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name} (${row.data_type})`);
    });

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await pool.end();
  }
}

migrate();