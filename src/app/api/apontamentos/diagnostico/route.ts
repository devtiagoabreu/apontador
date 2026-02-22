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
    diagnostico.steps.push({ step: 'Autenticação', status: !!session ? 'ok' : 'erro' });

    if (!session) {
      diagnostico.error = 'Não autenticado';
      return NextResponse.json(diagnostico);
    }

    // Passo 2: Verificar conexão com banco
    try {
      const testQuery = await db.execute(sql`SELECT 1 as test`);
      diagnostico.steps.push({ step: 'Conexão com banco', status: 'ok' });
    } catch (dbError) {
      diagnostico.steps.push({ 
        step: 'Conexão com banco', 
        status: 'erro', 
        error: String(dbError) 
      });
      throw dbError;
    }

    // Passo 3: Verificar se tabela apontamentos existe
    try {
      const tableCheck = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'apontamentos'
        );
      `);
      diagnostico.steps.push({ 
        step: 'Tabela apontamentos', 
        status: tableCheck.rows[0].exists ? 'ok' : 'inexistente' 
      });

      if (!tableCheck.rows[0].exists) {
        throw new Error('Tabela apontamentos não existe');
      }
    } catch (tableError) {
      diagnostico.steps.push({ 
        step: 'Tabela apontamentos', 
        status: 'erro', 
        error: String(tableError) 
      });
      throw tableError;
    }

    // Passo 4: Verificar estrutura da tabela
    try {
      const columns = await db.execute(sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'apontamentos'
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

    // Passo 5: Tentar uma consulta simples
    try {
      const simpleQuery = await db.execute(sql`
        SELECT COUNT(*) as total FROM apontamentos
      `);
      diagnostico.steps.push({ 
        step: 'Consulta simples', 
        status: 'ok',
        total: simpleQuery.rows[0]?.total || 0
      });
    } catch (queryError) {
      diagnostico.steps.push({ 
        step: 'Consulta simples', 
        status: 'erro', 
        error: String(queryError) 
      });
    }

    // Passo 6: Tentar consulta com joins (igual à original)
    try {
      const joinQuery = await db.execute(sql`
        SELECT 
          a.*,
          o.op as op_numero,
          o.produto as op_produto,
          m.nome as maquina_nome,
          m.codigo as maquina_codigo,
          ui.nome as operador_inicio_nome,
          uf.nome as operador_fim_nome,
          mp.descricao as motivo_descricao
        FROM apontamentos a
        LEFT JOIN ops o ON a.op_id = o.op
        LEFT JOIN maquinas m ON a.maquina_id = m.id
        LEFT JOIN usuarios ui ON a.operador_inicio_id = ui.id
        LEFT JOIN usuarios uf ON a.operador_fim_id = uf.id
        LEFT JOIN motivos_parada mp ON a.motivo_parada_id = mp.id
        LIMIT 5
      `);
      diagnostico.steps.push({ 
        step: 'Consulta com joins', 
        status: 'ok',
        amostra: joinQuery.rows 
      });
    } catch (joinError) {
      diagnostico.steps.push({ 
        step: 'Consulta com joins', 
        status: 'erro', 
        error: String(joinError) 
      });
    }

  } catch (error) {
    diagnostico.error = error instanceof Error ? error.message : String(error);
  }

  return NextResponse.json(diagnostico);
}