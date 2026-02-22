import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { apontamentos } from '@/lib/db/schema/apontamentos';
import { maquinas } from '@/lib/db/schema/maquinas';
import { eq } from 'drizzle-orm';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const agora = new Date();

    // Buscar parada
    const parada = await db.query.apontamentos.findFirst({
      where: eq(apontamentos.id, params.id),
    });

    if (!parada) {
      return NextResponse.json(
        { error: 'Parada não encontrada' },
        { status: 404 }
      );
    }

    // Finalizar parada
    await db
      .update(apontamentos)
      .set({
        fimParada: agora,
        dataFim: agora,
        updatedAt: agora,
      })
      .where(eq(apontamentos.id, params.id));

    // Verificar se tem OP vinculada para decidir status da máquina
    if (parada.opId) {
      // Tinha OP - volta para EM_PROCESSO
      await db
        .update(maquinas)
        .set({
          status: 'EM_PROCESSO',
          updatedAt: agora,
        })
        .where(eq(maquinas.id, parada.maquinaId));
    } else {
      // Não tinha OP - volta para DISPONIVEL
      await db
        .update(maquinas)
        .set({
          status: 'DISPONIVEL',
          updatedAt: agora,
        })
        .where(eq(maquinas.id, parada.maquinaId));
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Erro ao finalizar parada:', error);
    return NextResponse.json(
      { error: 'Erro interno ao finalizar parada' },
      { status: 500 }
    );
  }
}