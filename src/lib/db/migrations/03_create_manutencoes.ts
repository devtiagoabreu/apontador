import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { sql } from 'drizzle-orm';

dotenv.config({ path: path.join(process.cwd(), '.env') });

// Configuração para desenvolvimento local
if (process.env.NODE_ENV === 'development') {
  neonConfig.wsProxy = (host) => `${host}:54330/v1`;
  neonConfig.useSecureWebSocket = false;
  neonConfig.pipelineTLS = false;
  neonConfig.pipelineConnect = false;
}

async function tableExists(db: any, tableName: string): Promise<boolean> {
  const result = await db.execute(sql`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_name = ${tableName}
    );
  `);
  return result.rows[0].exists;
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

async function constraintExists(db: any, constraintName: string): Promise<boolean> {
  const result = await db.execute(sql`
    SELECT EXISTS (
      SELECT FROM information_schema.table_constraints
      WHERE constraint_name = ${constraintName}
    );
  `);
  return result.rows[0].exists;
}

async function createTable(
  db: any,
  name: string,
  createSql: ReturnType<typeof sql>,
  indexes: ReturnType<typeof sql>[] = []
) {
  if (await tableExists(db, name)) {
    console.log(`⏭️  Tabela ${name} já existe`);
    return;
  }
  console.log(`🔄 Criando tabela ${name}...`);
  await db.execute(createSql);
  for (const indexSql of indexes) {
    await db.execute(indexSql);
  }
  console.log(`✅ Tabela ${name} criada com sucesso!`);
}

async function migrate() {
  console.log('🔄 Iniciando migração do módulo de manutenção...');

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  try {
    // 1. tipos_manutencao (CRUD)
    await createTable(
      db,
      'tipos_manutencao',
      sql`
        CREATE TABLE tipos_manutencao (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          codigo VARCHAR(20) NOT NULL UNIQUE,
          nome VARCHAR(100) NOT NULL,
          ativo BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW() NOT NULL
        );
      `
    );

    // 2. atividades_manutencao (CRUD)
    await createTable(
      db,
      'atividades_manutencao',
      sql`
        CREATE TABLE atividades_manutencao (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          codigo VARCHAR(20) NOT NULL UNIQUE,
          nome VARCHAR(100) NOT NULL,
          ativo BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW() NOT NULL
        );
      `
    );

    // 3. manutencoes — criada ANTES para permitir FK circular no fim.
    // agendamento_id é adicionada como coluna simples aqui; a FK é criada por último.
    await createTable(
      db,
      'manutencoes',
      sql`
        CREATE TABLE manutencoes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          maquina_id UUID NOT NULL REFERENCES maquinas(id) ON DELETE CASCADE,
          operador_inicio_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
          operador_fim_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
          tipo_manutencao_id UUID NOT NULL REFERENCES tipos_manutencao(id) ON DELETE RESTRICT,
          atividade_manutencao_id UUID NOT NULL REFERENCES atividades_manutencao(id) ON DELETE RESTRICT,
          periodicidade VARCHAR(10) NOT NULL CHECK (periodicidade IN ('EVENTUAL', 'PERIODICA')),
          data_inicio TIMESTAMP NOT NULL DEFAULT NOW(),
          data_fim TIMESTAMP,
          observacoes TEXT,
          status VARCHAR(20) NOT NULL DEFAULT 'EM_ANDAMENTO'
            CHECK (status IN ('EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA')),
          agendamento_id UUID,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW() NOT NULL
        );
      `,
      [
        sql`CREATE INDEX idx_manut_maquina ON manutencoes(maquina_id);`,
        sql`CREATE INDEX idx_manut_operador ON manutencoes(operador_inicio_id);`,
        sql`CREATE INDEX idx_manut_tipo ON manutencoes(tipo_manutencao_id);`,
        sql`CREATE INDEX idx_manut_atividade ON manutencoes(atividade_manutencao_id);`,
        sql`CREATE INDEX idx_manut_status ON manutencoes(status);`,
        sql`CREATE INDEX idx_manut_data ON manutencoes(data_inicio DESC);`,
        sql`CREATE INDEX idx_manut_ativas ON manutencoes(maquina_id) WHERE data_fim IS NULL;`,
        sql`CREATE INDEX idx_manut_agendamento ON manutencoes(agendamento_id);`,
      ]
    );

    // 4. agendamentos_manutencao — referencia manutencoes (origem_manutencao_id)
    await createTable(
      db,
      'agendamentos_manutencao',
      sql`
        CREATE TABLE agendamentos_manutencao (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          maquina_id UUID NOT NULL REFERENCES maquinas(id) ON DELETE CASCADE,
          tipo_manutencao_id UUID NOT NULL REFERENCES tipos_manutencao(id) ON DELETE RESTRICT,
          atividade_manutencao_id UUID NOT NULL REFERENCES atividades_manutencao(id) ON DELETE RESTRICT,
          periodicidade VARCHAR(10) NOT NULL CHECK (periodicidade IN ('EVENTUAL', 'PERIODICA')),
          data_prevista TIMESTAMP NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'AGENDADO'
            CHECK (status IN ('AGENDADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO')),
          origem_manutencao_id UUID REFERENCES manutencoes(id) ON DELETE SET NULL,
          observacoes TEXT,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW() NOT NULL
        );
      `,
      [
        sql`CREATE INDEX idx_agend_manut_maquina ON agendamentos_manutencao(maquina_id);`,
        sql`CREATE INDEX idx_agend_manut_status ON agendamentos_manutencao(status);`,
        sql`CREATE INDEX idx_agend_manut_data ON agendamentos_manutencao(data_prevista);`,
        sql`CREATE INDEX idx_agend_manut_pendentes ON agendamentos_manutencao(data_prevista) WHERE status = 'AGENDADO';`,
      ]
    );

    // 5. FK circular: manutencoes.agendamento_id -> agendamentos_manutencao (agora que existe)
    if (!(await constraintExists(db, 'manutencoes_agendamento_id_fk'))) {
      console.log('🔄 Adicionando FK circular manutencoes.agendamento_id...');
      await db.execute(sql`
        ALTER TABLE manutencoes
        ADD CONSTRAINT manutencoes_agendamento_id_fk
        FOREIGN KEY (agendamento_id) REFERENCES agendamentos_manutencao(id) ON DELETE SET NULL;
      `);
      console.log('✅ FK circular adicionada!');
    } else {
      console.log('⏭️  FK circular já existe');
    }

    console.log('✅ Migração do módulo de manutenção concluída com sucesso!');

    // Resumo final
    const result = await db.execute(sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name IN ('tipos_manutencao', 'atividades_manutencao', 'manutencoes', 'agendamentos_manutencao')
      ORDER BY table_name;
    `);
    console.log('\n📊 Tabelas criadas:');
    result.rows.forEach((row: any) => console.log(`  - ${row.table_name}`));
  } catch (error) {
    console.error('❌ Erro na migração:', error);
  } finally {
    await pool.end();
  }
}

migrate();