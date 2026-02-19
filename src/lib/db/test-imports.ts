import * as schema from './schema';
import { db, testConnection, listSchemas } from './index';

async function test() {
  console.log('📦 Testando importações...\n');
  
  // Verificar schemas
  console.log('📊 Schemas disponíveis:');
  const schemas = listSchemas();
  schemas.forEach(s => console.log(`  ✅ ${s}`));
  
  console.log('\n🔌 Testando conexão com banco...');
  const connected = await testConnection();
  
  if (connected) {
    console.log('✅ Tudo funcionando corretamente!');
  } else {
    console.log('❌ Falha na conexão com banco');
  }
}

test().catch(console.error);