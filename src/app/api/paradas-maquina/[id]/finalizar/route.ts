import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { paradasMaquina } from '@/lib/db/schema/paradas-maquina';
import { maquinas } from '@/lib/db/schema/maquinas';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const finalizarSchema = z.object({
  dataFim: z.string().datetime().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const validated = finalizarSchema.parse(body);
    const agora = new Date();

    // Buscar parada - CORRIGIDO
    const parada = await db.query.paradasMaquina.findFirst({
      where: eq(paradasMaquina.id, params.id),
    });

    if (!parada) {
      return NextResponse.json(
        { error: 'Parada não encontrada' },
        { status: 404 }
      );
    }

    // Finalizar parada
    await db
      .update(paradasMaquina)
      .set({
        dataFim: validated.dataFim ? new Date(validated.dataFim) : agora,
        updatedAt: agora,
      })
      .where(eq(paradasMaquina.id, params.id));

    // Decidir novo status da máquina
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
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', detalhes: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erro interno ao finalizar parada' },
      { status: 500 }
    );
  }
}