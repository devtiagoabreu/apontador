import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { sql } from 'drizzle-orm';

dotenv.config({ path: path.join(process.cwd(), '.env') });

async function migrate() {
  console.log('🔄 Criando tabela producoes...');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  
  try {
    // Verificar se tabela já existe
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'producoes'
      );
    `);

    if (tableExists.rows[0].exists) {
      console.log('⏭️ Tabela producoes já existe');
      return;
    }

    // Criar tabela
    await db.execute(sql`
      CREATE TABLE producoes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        op_id INTEGER NOT NULL REFERENCES ops(op) ON DELETE CASCADE,
        maquina_id UUID NOT NULL REFERENCES maquinas(id) ON DELETE CASCADE,
        operador_inicio_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        operador_fim_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
        estagio_id UUID NOT NULL REFERENCES estagios(id) ON DELETE CASCADE,
        data_inicio TIMESTAMP NOT NULL,
        data_fim TIMESTAMP,
        metragem_programada DECIMAL(10,2) NOT NULL,
        metragem_processada DECIMAL(10,2),
        is_reprocesso BOOLEAN DEFAULT false,
        observacoes TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // Criar índices
    await db.execute(sql`
      CREATE INDEX idx_producoes_op ON producoes(op_id);
      CREATE INDEX idx_producoes_maquina ON producoes(maquina_id);
      CREATE INDEX idx_producoes_estagio ON producoes(estagio_id);
      CREATE INDEX idx_producoes_operador ON producoes(operador_inicio_id);
      CREATE INDEX idx_producoes_data ON producoes(data_inicio DESC);
      CREATE INDEX idx_producoes_ativas ON producoes(maquina_id) WHERE data_fim IS NULL;
    `);

    console.log('✅ Tabela producoes criada com sucesso!');

  } catch (error) {
    console.error('❌ Erro na migração:', error);
  } finally {
    await pool.end();
  }
}

migrate();