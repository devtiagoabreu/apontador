// src/lib/db/index.ts
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { env } from '@/lib/env';
import * as schema from './schema';

// Configuração para desenvolvimento local
if (process.env.NODE_ENV === 'development') {
  // @ts-ignore - necessário para WebSockets em dev
  neonConfig.wsProxy = (host) => `${host}:54330/v1`;
  neonConfig.useSecureWebSocket = false;
  neonConfig.pipelineTLS = false;
  neonConfig.pipelineConnect = false;
}

const pool = new Pool({ connectionString: env.DATABASE_URL });

export const db = drizzle(pool, { schema });