import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { sql } from 'drizzle-orm';

// Carregar variáveis de ambiente
dotenv.config({ path: path.join(process.cwd(), '.env') });

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL não encontrada');
  process.exit(1);
}

// Configuração para desenvolvimento local
if (process.env.NODE_ENV === 'development') {
  neonConfig.wsProxy = (host) => `${host}:54330/v1`;
  neonConfig.useSecureWebSocket = false;
  neonConfig.pipelineTLS = false;
  neonConfig.pipelineConnect = false;
}

async function runMigration() {
  console.log('🔄 Iniciando migração manual da tabela produtos...');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  
  try {
    // Verificar quais colunas já existem
    console.log('🔍 Verificando colunas existentes...');
    const existingColumns = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'produtos'
    `);
    
    const columns = existingColumns.rows.map(row => row.column_name);
    console.log('📊 Colunas existentes:', columns);

    // Adicionar colunas que não existem
    const migrations = [
      {
        name: 'composicao',
        sql: sql`ALTER TABLE produtos ADD COLUMN composicao jsonb DEFAULT '{"algodao":{"percentual":0,"fio":""},"poliester":{"percentual":0,"fio":""},"elastano":{"percentual":0,"fio":""},"linho":{"percentual":0,"fio":""},"viscoso":{"percentual":0,"fio":""},"acrilico":{"percentual":0,"fio":""}}'`
      },
      {
        name: 'largura',
        sql: sql`ALTER TABLE produtos ADD COLUMN largura decimal(10,2) DEFAULT 0`
      },
      {
        name: 'gramatura_linear',
        sql: sql`ALTER TABLE produtos ADD COLUMN gramatura_linear decimal(10,2) DEFAULT 0`
      },
      {
        name: 'gramatura_m2',
        sql: sql`ALTER TABLE produtos ADD COLUMN gramatura_m2 decimal(10,2) DEFAULT 0`
      },
      {
        name: 'tipo_tecido',
        sql: sql`ALTER TABLE produtos ADD COLUMN tipo_tecido varchar(20) DEFAULT 'PLANO'`
      },
      {
        name: 'ligamento',
        sql: sql`ALTER TABLE produtos ADD COLUMN ligamento varchar(50) DEFAULT 'TELA'`
      },
      {
        name: 'fios_urdume',
        sql: sql`ALTER TABLE produtos ADD COLUMN fios_urdume integer DEFAULT 0`
      },
      {
        name: 'fios_trama',
        sql: sql`ALTER TABLE produtos ADD COLUMN fios_trama integer DEFAULT 0`
      },
      {
        name: 'classificacao_peso',
        sql: sql`ALTER TABLE produtos ADD COLUMN classificacao_peso varchar(10) DEFAULT 'MEDIO'`
      },
      // NOVAS COLUNAS DE META
      {
        name: 'meta_diaria',
        sql: sql`ALTER TABLE produtos ADD COLUMN meta_diaria decimal(10,2)`
      },
      {
        name: 'meta_mensal',
        sql: sql`ALTER TABLE produtos ADD COLUMN meta_mensal decimal(10,2)`
      }
    ];

    for (const migration of migrations) {
      if (!columns.includes(migration.name)) {
        console.log(`➕ Adicionando coluna: ${migration.name}`);
        await db.execute(migration.sql);
      } else {
        console.log(`⏭️ Coluna já existe: ${migration.name}`);
      }
    }

    console.log('✅ Migração concluída com sucesso!');
    
    // Verificar resultado
    const result = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'produtos'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📊 Estrutura final da tabela:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name} (${row.data_type})`);
    });

  } catch (error) {
    console.error('❌ Erro na migração:', error);
  } finally {
    await pool.end();
  }
}

runMigration();