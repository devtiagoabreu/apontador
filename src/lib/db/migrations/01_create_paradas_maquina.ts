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
  console.log('🔄 Criando tabela paradas_maquina...');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  
  try {
    // Verificar se tabela já existe
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'paradas_maquina'
      );
    `);

    if (tableExists.rows[0].exists) {
      console.log('⏭️ Tabela paradas_maquina já existe');
      return;
    }

    // Criar tabela
    await db.execute(sql`
      CREATE TABLE paradas_maquina (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        maquina_id UUID NOT NULL REFERENCES maquinas(id) ON DELETE CASCADE,
        operador_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        motivo_parada_id UUID NOT NULL REFERENCES motivos_parada(id) ON DELETE CASCADE,
        observacoes TEXT,
        data_inicio TIMESTAMP NOT NULL,
        data_fim TIMESTAMP,
        op_id INTEGER REFERENCES ops(op) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // Criar índices para performance
    await db.execute(sql`
      CREATE INDEX idx_paradas_maquina_maquina ON paradas_maquina(maquina_id);
      CREATE INDEX idx_paradas_maquina_data ON paradas_maquina(data_inicio DESC);
      CREATE INDEX idx_paradas_maquina_operador ON paradas_maquina(operador_id);
    `);

    console.log('✅ Tabela paradas_maquina criada com sucesso!');
    
    // Mostrar estrutura
    const columns = await db.execute(sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'paradas_maquina'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📊 Estrutura da tabela:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
    });

  } catch (error) {
    console.error('❌ Erro na migração:', error);
  } finally {
    await pool.end();
  }
}

migrate();