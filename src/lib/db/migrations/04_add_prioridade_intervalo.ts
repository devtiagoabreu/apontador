// src/lib/db/migrations/04_add_prioridade_intervalo.ts
// Backlog: prioridade de manutenção (0-3) em agendamentos/manutenções
// + intervalo em dias para plano de manutenção por período (tipos_manutencao).
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { sql } from 'drizzle-orm';

dotenv.config({ path: path.join(process.cwd(), '.env') });

if (process.env.NODE_ENV === 'development') {
  neonConfig.wsProxy = (host) => `${host}:54330/v1`;
  neonConfig.useSecureWebSocket = false;
  neonConfig.pipelineTLS = false;
  neonConfig.pipelineConnect = false;
}

async function columnExists(db: any, tableName: string, columnName: string): Promise<boolean> {
  const result = await db.execute(sql`
    SELECT EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_name = ${tableName} AND column_name = ${columnName}
    );
  `);
  return result.rows[0].exists;
}

async function migrate() {
  console.log('🔄 Iniciando migração 04 (prioridade + intervalo em dias)...');

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  try {
    // 1. agendamentos_manutencao.prioridade (0-3, default 1 = Normal)
    if (!(await columnExists(db, 'agendamentos_manutencao', 'prioridade'))) {
      console.log('🔄 Adicionando agendamentos_manutencao.prioridade...');
      await db.execute(sql`
        ALTER TABLE agendamentos_manutencao
        ADD COLUMN prioridade SMALLINT NOT NULL DEFAULT 1
        CHECK (prioridade BETWEEN 0 AND 3);
      `);
      console.log('✅ prioridade adicionada em agendamentos_manutencao!');
    } else {
      console.log('⏭️  agendamentos_manutencao.prioridade já existe');
    }

    // 2. manutencoes.prioridade (0-3, default 1 = Normal)
    if (!(await columnExists(db, 'manutencoes', 'prioridade'))) {
      console.log('🔄 Adicionando manutencoes.prioridade...');
      await db.execute(sql`
        ALTER TABLE manutencoes
        ADD COLUMN prioridade SMALLINT NOT NULL DEFAULT 1
        CHECK (prioridade BETWEEN 0 AND 3);
      `);
      console.log('✅ prioridade adicionada em manutencoes!');
    } else {
      console.log('⏭️  manutencoes.prioridade já existe');
    }

    // 3. tipos_manutencao.intervalo_em_dias (plano por período — opcional)
    if (!(await columnExists(db, 'tipos_manutencao', 'intervalo_em_dias'))) {
      console.log('🔄 Adicionando tipos_manutencao.intervalo_em_dias...');
      await db.execute(sql`
        ALTER TABLE tipos_manutencao
        ADD COLUMN intervalo_em_dias INTEGER;
      `);
      console.log('✅ intervalo_em_dias adicionado em tipos_manutencao!');
    } else {
      console.log('⏭️  tipos_manutencao.intervalo_em_dias já existe');
    }

    console.log('✅ Migração 04 concluída com sucesso!');
  } catch (error) {
    console.error('❌ Erro na migração 04:', error);
  } finally {
    await pool.end();
  }
}

migrate();