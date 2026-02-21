import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { sql } from 'drizzle-orm';

// Carregar variáveis de ambiente
dotenv.config({ path: path.join(process.cwd(), '.env') });

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL não encontrada no arquivo .env');
  console.error('📁 Diretório atual:', process.cwd());
  console.error('📁 Arquivo .env esperado em:', path.join(process.cwd(), '.env'));
  process.exit(1);
}

// Configuração para desenvolvimento local
if (process.env.NODE_ENV === 'development') {
  neonConfig.wsProxy = (host) => `${host}:54330/v1`;
  neonConfig.useSecureWebSocket = false;
  neonConfig.pipelineTLS = false;
  neonConfig.pipelineConnect = false;
}

async function seedKanban() {
  console.log('🌱 Iniciando população do Kanban com dados de teste...');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  
  try {
    // Buscar um operador para usar nos apontamentos
    console.log('🔍 Buscando operador...');
    const operador = await db.execute(sql`
      SELECT id FROM usuarios WHERE nivel = 'OPERADOR' LIMIT 1
    `);

    let operadorId;
    if (operador.rows.length === 0) {
      console.log('⚠️ Nenhum operador encontrado. Criando operador de teste...');
      const newOperador = await db.execute(sql`
        INSERT INTO usuarios (id, nome, matricula, nivel, ativo, created_at, updated_at)
        VALUES (gen_random_uuid(), 'Operador Teste', 'OPTESTE', 'OPERADOR', true, NOW(), NOW())
        RETURNING id
      `);
      operadorId = newOperador.rows[0].id;
    } else {
      operadorId = operador.rows[0].id;
    }

    // Buscar máquinas disponíveis
    console.log('🔍 Buscando máquinas...');
    const maquinasList = await db.execute(sql`
      SELECT id, codigo FROM maquinas WHERE status = 'DISPONIVEL' LIMIT 3
    `);

    let maquina1, maquina2, maquina3;
    if (maquinasList.rows.length < 3) {
      console.log('⚠️ Poucas máquinas disponíveis. Criando máquinas de teste...');
      
      // Limpar máquinas de teste anteriores
      await db.execute(sql`
        DELETE FROM maquina_setor WHERE maquina_id IN (
          SELECT id FROM maquinas WHERE codigo LIKE 'TEST%'
        )
      `);
      await db.execute(sql`
        DELETE FROM maquinas WHERE codigo LIKE 'TEST%'
      `);

      // Criar novas máquinas
      const newMaquinas = await db.execute(sql`
        INSERT INTO maquinas (id, nome, codigo, status, ativo, created_at, updated_at)
        VALUES 
          (gen_random_uuid(), 'Máquina Teste 1', 'TEST01', 'DISPONIVEL', true, NOW(), NOW()),
          (gen_random_uuid(), 'Máquina Teste 2', 'TEST02', 'DISPONIVEL', true, NOW(), NOW()),
          (gen_random_uuid(), 'Máquina Teste 3', 'TEST03', 'DISPONIVEL', true, NOW(), NOW())
        RETURNING id, codigo
      `);
      
      maquina1 = newMaquinas.rows[0];
      maquina2 = newMaquinas.rows[1];
      maquina3 = newMaquinas.rows[2];
    } else {
      maquina1 = maquinasList.rows[0];
      maquina2 = maquinasList.rows[1];
      maquina3 = maquinasList.rows[2];
    }

    console.log('📊 Atualizando OPs para simular produção...');

    // 1. Avançar algumas OPs para PREPARAÇÃO (estágio 10)
    await db.execute(sql`
      UPDATE ops 
      SET 
        status = 'EM_ANDAMENTO',
        cod_estagio_atual = '10',
        estagio_atual = 'PREPARAÇÃO BENEFICIAMENTO',
        data_ultimo_apontamento = NOW()
      WHERE op IN (8185, 8209, 8095)
    `);
    console.log('✅ OPs em PREPARAÇÃO: 8185, 8209, 8095');

    // 2. Avançar algumas OPs para ALVEJAMENTO (estágio 15)
    await db.execute(sql`
      UPDATE ops 
      SET 
        status = 'EM_ANDAMENTO',
        cod_estagio_atual = '15',
        estagio_atual = 'ALVEJAMENTO',
        data_ultimo_apontamento = NOW()
      WHERE op IN (8050, 8090)
    `);
    console.log('✅ OPs em ALVEJAMENTO: 8050, 8090');

    // 3. Avançar algumas OPs para TINGIMENTO (estágio 18)
    await db.execute(sql`
      UPDATE ops 
      SET 
        status = 'EM_ANDAMENTO',
        cod_estagio_atual = '18',
        estagio_atual = 'TINGIMENTO',
        data_ultimo_apontamento = NOW()
      WHERE op IN (8219, 8206)
    `);
    console.log('✅ OPs em TINGIMENTO: 8219, 8206');

    // 4. Colocar uma OP em PARADA
    await db.execute(sql`
      UPDATE ops 
      SET 
        status = 'PARADA',
        cod_estagio_atual = '10',
        estagio_atual = 'PREPARAÇÃO BENEFICIAMENTO',
        data_ultimo_apontamento = NOW()
      WHERE op = 8218
    `);
    console.log('✅ OP em PARADA: 8218');

    // 5. Finalizar uma OP
    await db.execute(sql`
      UPDATE ops 
      SET 
        status = 'FINALIZADA',
        cod_estagio_atual = '99',
        estagio_atual = 'FINALIZADA',
        data_ultimo_apontamento = NOW()
      WHERE op = 8207
    `);
    console.log('✅ OP FINALIZADA: 8207');

    // 6. Criar alguns apontamentos simulados
    console.log('📝 Criando apontamentos simulados...');
    
    const agora = new Date();
    const duasHorasAtras = new Date(agora.getTime() - 2 * 60 * 60 * 1000);
    const umaHoraAtras = new Date(agora.getTime() - 1 * 60 * 60 * 1000);

    // Apontamento concluído
    await db.execute(sql`
      INSERT INTO apontamentos (id, op_id, maquina_id, operador_inicio_id, data_inicio, data_fim, status, metragem_processada, created_at, updated_at)
      VALUES (
        gen_random_uuid(),
        8185,
        ${maquina1.id},
        ${operadorId},
        ${duasHorasAtras.toISOString()},
        ${umaHoraAtras.toISOString()},
        'CONCLUIDO',
        '500',
        NOW(),
        NOW()
      )
    `);

    // Apontamento em andamento
    await db.execute(sql`
      INSERT INTO apontamentos (id, op_id, maquina_id, operador_inicio_id, data_inicio, data_fim, status, created_at, updated_at)
      VALUES (
        gen_random_uuid(),
        8209,
        ${maquina2.id},
        ${operadorId},
        ${umaHoraAtras.toISOString()},
        ${agora.toISOString()},
        'EM_ANDAMENTO',
        NOW(),
        NOW()
      )
    `);

    console.log('✅ Apontamentos criados');

    // Verificar resultado
    const resultado = await db.execute(sql`
      SELECT 
        status,
        COUNT(*) as total
      FROM ops
      WHERE op IN (8185, 8209, 8095, 8050, 8090, 8219, 8206, 8218, 8207)
      GROUP BY status
    `);

    console.log('\n📊 Resumo final:');
    resultado.rows.forEach(row => {
      console.log(`  ${row.status}: ${row.total}`);
    });

    console.log('\n✅ População do Kanban concluída com sucesso!');

  } catch (error) {
    console.error('❌ Erro ao popular Kanban:', error);
  } finally {
    await pool.end();
  }
}

seedKanban();