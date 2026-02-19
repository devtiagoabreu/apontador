import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';
import * as schema from './schema'; // Esta linha agora deve funcionar

// Verificar se DATABASE_URL existe
if (!process.env.DATABASE_URL) {
  throw new Error('❌ DATABASE_URL não encontrada no arquivo .env');
}

// Configuração para desenvolvimento local
if (process.env.NODE_ENV === 'development') {
  neonConfig.wsProxy = (host) => `${host}:54330/v1`;
  neonConfig.useSecureWebSocket = false;
  neonConfig.pipelineTLS = false;
  neonConfig.pipelineConnect = false;
}

// Criar pool de conexão
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL 
});

// Instanciar o Drizzle com o schema
export const db = drizzle(pool, { schema });

// Função para testar conexão
export async function testConnection() {
  try {
    const result = await db.execute(sql`SELECT 1 as test`);
    console.log('✅ Conexão com banco de dados estabelecida!');
    return true;
  } catch (error) {
    console.error('❌ Erro na conexão com banco:', error);
    return false;
  }
}

// Função para listar todos os schemas disponíveis (útil para debug)
export function listSchemas() {
  return Object.keys(schema);
}