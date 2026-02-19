// E:\dev\apontador\src\lib\db\reset.ts
import { db } from './index';
import { sql } from 'drizzle-orm';

async function reset() {
  console.log('⚠️  ATENÇÃO: Isso vai apagar TODOS os dados do banco!');
  console.log('Pressione Ctrl+C para cancelar ou aguarde 5 segundos...');
  
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  console.log('🔄 Resetando banco de dados...');
  
  try {
    // Desabilitar triggers temporariamente
    await db.execute(sql`SET session_replication_role = 'replica';`);
    
    // Truncar todas as tabelas
    await db.execute(sql`TRUNCATE TABLE apontamentos CASCADE`);
    await db.execute(sql`TRUNCATE TABLE maquina_setor CASCADE`);
    await db.execute(sql`TRUNCATE TABLE ops CASCADE`);
    await db.execute(sql`TRUNCATE TABLE maquinas CASCADE`);
    await db.execute(sql`TRUNCATE TABLE setores CASCADE`);
    await db.execute(sql`TRUNCATE TABLE areas CASCADE`);
    await db.execute(sql`TRUNCATE TABLE usuarios CASCADE`);
    await db.execute(sql`TRUNCATE TABLE estagios CASCADE`);
    await db.execute(sql`TRUNCATE TABLE motivos_parada CASCADE`);
    await db.execute(sql`TRUNCATE TABLE motivos_cancelamento CASCADE`);
    await db.execute(sql`TRUNCATE TABLE produtos CASCADE`);
    
    // Reabilitar triggers
    await db.execute(sql`SET session_replication_role = 'origin';`);
    
    console.log('✅ Banco resetado com sucesso!');
    
    // Rodar seed
    console.log('🌱 Rodando seed...');
    await import('./seed');
    
  } catch (error) {
    console.error('❌ Erro ao resetar banco:', error);
    process.exit(1);
  }
}

reset();