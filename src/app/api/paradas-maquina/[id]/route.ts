import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    console.log('🔍 Buscando parada por ID:', params.id);

    // Usar SQL raw para evitar problemas de tipo
    const result = await db.execute(sql`
      SELECT 
        p.*,
        m.nome as maquina_nome,
        m.codigo as maquina_codigo,
        u.nome as operador_nome,
        u.matricula as operador_matricula,
        mp.descricao as motivo_descricao,
        mp.codigo as motivo_codigo,
        o.op as op_numero,
        o.produto as op_produto
      FROM paradas_maquina p
      LEFT JOIN maquinas m ON p.maquina_id = m.id
      LEFT JOIN usuarios u ON p.operador_id = u.id
      LEFT JOIN motivos_parada mp ON p.motivo_parada_id = mp.id
      LEFT JOIN ops o ON p.op_id = o.op
      WHERE p.id = ${params.id}
    `);

    if (result.rows.length === 0) {
      console.log('❌ Parada não encontrada:', params.id);
      return NextResponse.json(
        { error: 'Parada não encontrada' },
        { status: 404 }
      );
    }

    const row = result.rows[0];
    
    // Formatar resposta
    const parada = {
      id: row.id,
      maquinaId: row.maquina_id,
      operadorId: row.operador_id,
      motivoParadaId: row.motivo_parada_id,
      observacoes: row.observacoes,
      dataInicio: row.data_inicio,
      dataFim: row.data_fim,
      opId: row.op_id,
      maquina: {
        nome: row.maquina_nome,
        codigo: row.maquina_codigo,
      },
      operador: {
        nome: row.operador_nome,
        matricula: row.operador_matricula,
      },
      motivo: {
        descricao: row.motivo_descricao,
        codigo: row.motivo_codigo,
      },
      op: row.op_numero ? {
        op: row.op_numero,
        produto: row.op_produto,
      } : null,
    };

    console.log('✅ Parada encontrada:', parada.id);

    return NextResponse.json(parada);

  } catch (error) {
    console.error('❌ Erro ao buscar parada:', error);
    return NextResponse.json(
      { error: 'Erro interno ao buscar parada' },
      { status: 500 }
    );
  }
}