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
  console.log('🔄 Iniciando migração da tabela estagios...');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  
  try {
    // Verificar se coluna 'cor' existe
    const corExists = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'estagios' AND column_name = 'cor'
    `);

    if (corExists.rows.length === 0) {
      console.log('➕ Adicionando coluna: cor');
      await db.execute(sql`
        ALTER TABLE estagios 
        ADD COLUMN cor varchar(7) DEFAULT '#3b82f6'
      `);
    } else {
      console.log('✅ Coluna cor já existe');
    }

    // Verificar se coluna 'mostrar_no_kanban' existe
    const kanbanExists = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'estagios' AND column_name = 'mostrar_no_kanban'
    `);

    if (kanbanExists.rows.length === 0) {
      console.log('➕ Adicionando coluna: mostrar_no_kanban');
      await db.execute(sql`
        ALTER TABLE estagios 
        ADD COLUMN mostrar_no_kanban boolean DEFAULT true
      `);
    } else {
      console.log('✅ Coluna mostrar_no_kanban já existe');
    }

    console.log('✅ Migração concluída!');
    
    // Mostrar resultado
    const result = await db.execute(sql`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'estagios'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📊 Estrutura atual da tabela:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name} (${row.data_type}) ${row.column_default ? `default: ${row.column_default}` : ''}`);
    });

  } catch (error) {
    console.error('❌ Erro na migração:', error);
  } finally {
    await pool.end();
  }
}

migrate();