import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { paradasMaquina } from '@/lib/db/schema/paradas-maquina';
import { maquinas } from '@/lib/db/schema/maquinas';
import { motivosParada } from '@/lib/db/schema/motivos-parada';
import { usuarios } from '@/lib/db/schema/usuarios';
import { ops } from '@/lib/db/schema/ops';
import { eq } from 'drizzle-orm';

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

    // Buscar parada com joins
    const result = await db
      .select({
        id: paradasMaquina.id,
        maquinaId: paradasMaquina.maquinaId,
        operadorId: paradasMaquina.operadorId,
        motivoParadaId: paradasMaquina.motivoParadaId,
        observacoes: paradasMaquina.observacoes,
        dataInicio: paradasMaquina.dataInicio,
        dataFim: paradasMaquina.dataFim,
        opId: paradasMaquina.opId,
        maquina: {
          nome: maquinas.nome,
          codigo: maquinas.codigo,
        },
        operador: {
          nome: usuarios.nome,
          matricula: usuarios.matricula,
        },
        motivo: {
          descricao: motivosParada.descricao,
          codigo: motivosParada.codigo,
        },
        op: paradasMaquina.opId ? {
          op: ops.op,
          produto: ops.produto,
        } : null,
      })
      .from(paradasMaquina)
      .leftJoin(maquinas, eq(paradasMaquina.maquinaId, maquinas.id))
      .leftJoin(usuarios, eq(paradasMaquina.operadorId, usuarios.id))
      .leftJoin(motivosParada, eq(paradasMaquina.motivoParadaId, motivosParada.id))
      .leftJoin(ops, eq(paradasMaquina.opId, ops.op))
      .where(eq(paradasMaquina.id, params.id))
      .then(rows => rows[0]);

    if (!result) {
      console.log('❌ Parada não encontrada:', params.id);
      return NextResponse.json(
        { error: 'Parada não encontrada' },
        { status: 404 }
      );
    }

    console.log('✅ Parada encontrada:', result.id);

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Erro ao buscar parada:', error);
    return NextResponse.json(
      { error: 'Erro interno ao buscar parada' },
      { status: 500 }
    );
  }
}