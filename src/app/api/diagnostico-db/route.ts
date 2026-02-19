import { NextResponse } from 'next/server';
import { Pool } from '@neondatabase/serverless';

export async function GET() {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    databaseUrl: {
      configured: !!process.env.DATABASE_URL,
      masked: process.env.DATABASE_URL ? 
        process.env.DATABASE_URL.replace(/:([^:@]+)@/, ':***@').replace(/\/[^?]+/, '/***') : 
        'não configurada'
    },
    tests: [] as any[],
    errors: [] as string[]
  };

  // Teste 1: Verificar formato da URL
  try {
    const url = new URL(process.env.DATABASE_URL!);
    diagnostics.tests.push({
      name: 'Formato da URL',
      success: true,
      details: {
        protocol: url.protocol,
        host: url.hostname,
        port: url.port || 'padrão',
        database: url.pathname.slice(1),
        hasPassword: !!url.password,
        hasSSL: url.searchParams.get('sslmode') === 'require'
      }
    });
  } catch (error) {
    diagnostics.tests.push({
      name: 'Formato da URL',
      success: false,
      error: String(error)
    });
  }

  // Teste 2: Tentar conexão básica
  try {
    const pool = new Pool({ 
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 5000, // 5 segundos
    });
    
    const client = await pool.connect();
    diagnostics.tests.push({
      name: 'Conexão TCP',
      success: true,
      message: 'Conectado ao servidor'
    });
    
    // Teste 3: Consulta simples
    try {
      const result = await client.query('SELECT version()');
      diagnostics.tests.push({
        name: 'Consulta SQL',
        success: true,
        version: result.rows[0].version.split(' ')[0] + '...'
      });
    } catch (error) {
      diagnostics.tests.push({
        name: 'Consulta SQL',
        success: false,
        error: String(error)
      });
    }
    
    client.release();
    await pool.end();
    
  } catch (error: any) {
    diagnostics.tests.push({
      name: 'Conexão TCP',
      success: false,
      error: error.message,
      code: error.code
    });
    
    // Interpretar erros comuns
    if (error.code === 'ECONNREFUSED') {
      diagnostics.errors.push('❌ Servidor recusou conexão - Verifique se o host está correto');
    } else if (error.code === 'ETIMEDOUT') {
      diagnostics.errors.push('❌ Tempo limite excedido - Verifique firewall ou região');
    } else if (error.code === '28P01') {
      diagnostics.errors.push('❌ Autenticação falhou - Senha incorreta');
    } else if (error.code === '3D000') {
      diagnostics.errors.push('❌ Banco de dados não existe');
    } else if (error.message.includes('SSL')) {
      diagnostics.errors.push('❌ Erro de SSL - Tente adicionar ?sslmode=require na URL');
    }
  }

  // Teste 4: Verificar conectividade de rede
  try {
    const { hostname } = new URL(process.env.DATABASE_URL!);
    const dns = await fetch(`https://dns.google/resolve?name=${hostname}`);
    const dnsResult = await dns.json();
    diagnostics.tests.push({
      name: 'Resolução DNS',
      success: dnsResult.Status === 0,
      ip: dnsResult.Answer?.[0]?.data || 'não resolvido'
    });
  } catch (error) {
    diagnostics.tests.push({
      name: 'Resolução DNS',
      success: false,
      error: String(error)
    });
  }

  return NextResponse.json(diagnostics);
}