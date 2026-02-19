import { NextResponse } from 'next/server';
import { db, testConnection } from '@/lib/db';  // Importar de @/lib/db, não de caminho relativo
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    console.log('🔄 Testando conexão...');
    
    // Testar conexão
    const connected = await testConnection();
    
    if (connected) {
      // Tentar uma consulta simples
      try {
        const result = await db.execute(sql`SELECT current_database() as db, current_user as user`);
        
        return NextResponse.json({ 
          success: true, 
          message: '✅ Conexão com banco OK',
          database: result.rows[0],
          env: {
            databaseUrl: process.env.DATABASE_URL ? '✅ Configurada' : '❌ Não configurada',
            nodeEnv: process.env.NODE_ENV
          }
        });
      } catch (queryError) {
        return NextResponse.json({ 
          success: true, 
          message: '✅ Conectado, mas consulta falhou',
          queryError: String(queryError),
          env: {
            databaseUrl: '✅ Configurada',
            nodeEnv: process.env.NODE_ENV
          }
        });
      }
    } else {
      return NextResponse.json({ 
        success: false, 
        message: '❌ Falha na conexão',
        env: {
          databaseUrl: process.env.DATABASE_URL ? '✅ Configurada' : '❌ Não configurada',
          nodeEnv: process.env.NODE_ENV
        }
      }, { status: 500 });
    }
  } catch (error) {
    console.error('❌ Erro detalhado:', error);
    return NextResponse.json({ 
      success: false, 
      error: String(error),
      env: {
        databaseUrl: process.env.DATABASE_URL ? '✅ Configurada' : '❌ Não configurada',
        nodeEnv: process.env.NODE_ENV
      }
    }, { status: 500 });
  }
}