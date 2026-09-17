// src/lib/db/seed-manutencao.ts
// Seed incremental e idempotente do módulo de manutenção.
// NÃO trunca tabelas — preserva os dados existentes (produções, OPs etc.).
import * as dotenv from 'dotenv';
import * as path from 'path';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';

dotenv.config({ path: path.join(process.cwd(), '.env') });

if (process.env.NODE_ENV === 'development') {
  neonConfig.wsProxy = (host) => `${host}:54330/v1`;
  neonConfig.useSecureWebSocket = false;
  neonConfig.pipelineTLS = false;
  neonConfig.pipelineConnect = false;
}

async function seedManutencao() {
  console.log('🌱 Iniciando seed incremental de manutenção...');

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  try {
    // 1. Tipos de manutenção (idempotente)
    console.log('Criando tipos de manutenção (se necessário)...');
    await db.execute(sql`
      INSERT INTO tipos_manutencao (codigo, nome, ativo)
      VALUES
        ('COR', 'Corretiva', TRUE),
        ('PRE', 'Preventiva', TRUE)
      ON CONFLICT (codigo) DO NOTHING;
    `);

    // 2. Atividades de manutenção (idempotente)
    console.log('Criando atividades de manutenção (se necessário)...');
    await db.execute(sql`
      INSERT INTO atividades_manutencao (codigo, nome, ativo)
      VALUES
        ('MEC', 'Mecânica', TRUE),
        ('ELE', 'Elétrica', TRUE),
        ('PRO', 'Programação', TRUE),
        ('LIM', 'Limpeza', TRUE),
        ('LUB', 'Lubrificação', TRUE)
      ON CONFLICT (codigo) DO NOTHING;
    `);

    // 3. Usuário de manutenção (idempotente — matricula única)
    console.log('Criando usuário de manutenção MNT001 (se necessário)...');
    await db.execute(sql`
      INSERT INTO usuarios (nome, matricula, nivel, ativo, created_at, updated_at)
      VALUES ('Carlos Mecânico', 'MNT001', 'MANUTENCAO', TRUE, NOW(), NOW())
      ON CONFLICT (matricula) DO NOTHING;
    `);

    // Resumo
    const r = await db.execute(sql`
      SELECT
        (SELECT count(*)::int FROM tipos_manutencao) AS tipos,
        (SELECT count(*)::int FROM atividades_manutencao) AS atividades,
        (SELECT count(*)::int FROM usuarios WHERE nivel = 'MANUTENCAO') AS usuarios_manutencao
    `);
    console.table(r.rows);

    console.log('✅ Seed incremental de manutenção concluído!');
  } catch (error) {
    console.error('❌ Erro no seed incremental:', error);
  } finally {
    await pool.end();
  }
}

seedManutencao();