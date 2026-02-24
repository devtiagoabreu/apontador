export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export async function GET() {
  const diagnostico: any = {
    timestamp: new Date().toISOString(),
    autenticacao: false,
    steps: [],
    error: null,
    data: null
  };

  try {
    // Passo 1: Verificar autenticação
    const session = await getServerSession(authOptions);
    diagnostico.autenticacao = !!session;
    diagnostico.steps.push({ 
      step: 'Autenticação', 
      status: !!session ? 'ok' : 'erro',
      usuario: session?.user?.id
    });

    if (!session) {
      diagnostico.error = 'Não autenticado';
      return NextResponse.json(diagnostico);
    }

    // Passo 2: Verificar conexão com banco
    try {
      const testQuery = await db.execute(sql`SELECT 1 as test`);
      diagnostico.steps.push({ 
        step: 'Conexão com banco', 
        status: 'ok' 
      });
    } catch (dbError) {
      diagnostico.steps.push({ 
        step: 'Conexão com banco', 
        status: 'erro', 
        error: String(dbError) 
      });
      throw dbError;
    }

    // Passo 3: Verificar se tabela paradas_maquina existe
    try {
      const tableCheck = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'paradas_maquina'
        );
      `);
      
      diagnostico.steps.push({ 
        step: 'Tabela paradas_maquina', 
        status: tableCheck.rows[0].exists ? 'ok' : 'inexistente' 
      });

      if (!tableCheck.rows[0].exists) {
        diagnostico.error = 'Tabela paradas_maquina não existe';
        return NextResponse.json(diagnostico);
      }
    } catch (tableError) {
      diagnostico.steps.push({ 
        step: 'Tabela paradas_maquina', 
        status: 'erro', 
        error: String(tableError) 
      });
      throw tableError;
    }

    // Passo 4: Verificar estrutura da tabela
    try {
      const columns = await db.execute(sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'paradas_maquina'
        ORDER BY ordinal_position
      `);
      
      diagnostico.steps.push({ 
        step: 'Estrutura da tabela', 
        status: 'ok',
        columns: columns.rows 
      });
    } catch (columnsError) {
      diagnostico.steps.push({ 
        step: 'Estrutura da tabela', 
        status: 'erro', 
        error: String(columnsError) 
      });
    }

    // Passo 5: Contar registros
    try {
      const countResult = await db.execute(sql`
        SELECT COUNT(*) as total FROM paradas_maquina
      `);
      
      diagnostico.steps.push({ 
        step: 'Registros', 
        status: 'ok',
        total: countResult.rows[0]?.total || 0
      });
    } catch (countError) {
      diagnostico.steps.push({ 
        step: 'Registros', 
        status: 'erro', 
        error: String(countError) 
      });
    }

    // Passo 6: Testar inserção (opcional - comentado para não criar dados)
    /*
    try {
      const testInsert = await db.execute(sql`
        INSERT INTO paradas_maquina (
          maquina_id, operador_id, motivo_parada_id, data_inicio
        ) VALUES (
          'd7bcee03-4558-4274-8a13-d15f5a9f1e00',
          '5ee971b6-be6b-4b1e-9313-f0abf755ba94',
          (SELECT id FROM motivos_parada LIMIT 1),
          NOW()
        ) RETURNING id
      `);
      
      diagnostico.steps.push({ 
        step: 'Teste de inserção', 
        status: 'ok',
        id: testInsert.rows[0]?.id
      });
    } catch (insertError) {
      diagnostico.steps.push({ 
        step: 'Teste de inserção', 
        status: 'erro', 
        error: String(insertError) 
      });
    }
    */

  } catch (error) {
    diagnostico.error = error instanceof Error ? error.message : String(error);
  }

  return NextResponse.json(diagnostico);
}