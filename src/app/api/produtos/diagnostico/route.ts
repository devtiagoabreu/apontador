import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { produtos } from '@/lib/db/schema/produtos';
import { sql } from 'drizzle-orm';

export async function GET() {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    steps: [],
    error: null,
    data: null
  };

  try {
    // Passo 1: Verificar autenticação
    const session = await getServerSession(authOptions);
    diagnostics.steps.push({
      step: 'Autenticação',
      status: session ? 'ok' : 'erro',
      user: session?.user?.email
    });

    if (!session) {
      throw new Error('Não autenticado');
    }

    // Passo 2: Verificar conexão com banco
    try {
      const testQuery = await db.execute(sql`SELECT 1 as test`);
      diagnostics.steps.push({
        step: 'Conexão com banco',
        status: 'ok'
      });
    } catch (dbError) {
      diagnostics.steps.push({
        step: 'Conexão com banco',
        status: 'erro',
        error: String(dbError)
      });
      throw dbError;
    }

    // Passo 3: Verificar se tabela produtos existe
    try {
      const tableCheck = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'produtos'
        );
      `);
      diagnostics.steps.push({
        step: 'Tabela produtos',
        status: tableCheck.rows[0].exists ? 'ok' : 'inexistente'
      });

      if (!tableCheck.rows[0].exists) {
        throw new Error('Tabela produtos não existe');
      }
    } catch (tableError) {
      diagnostics.steps.push({
        step: 'Tabela produtos',
        status: 'erro',
        error: String(tableError)
      });
      throw tableError;
    }

    // Passo 4: Tentar consultar produtos
    try {
      const allProdutos = await db.select().from(produtos).limit(5);
      diagnostics.steps.push({
        step: 'Consulta produtos',
        status: 'ok',
        count: allProdutos.length
      });
      diagnostics.data = allProdutos;
    } catch (queryError) {
      diagnostics.steps.push({
        step: 'Consulta produtos',
        status: 'erro',
        error: String(queryError)
      });
      throw queryError;
    }

  } catch (error) {
    diagnostics.error = error instanceof Error ? error.message : String(error);
  }

  return NextResponse.json(diagnostics);
}