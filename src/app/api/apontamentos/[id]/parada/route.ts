import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { apontamentos } from '@/lib/db/schema/apontamentos';
import { maquinas } from '@/lib/db/schema/maquinas';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const paradaSchema = z.object({
  motivoId: z.string(),
  observacoes: z.string().optional(),
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
    const validated = paradaSchema.parse(body);

    // Buscar apontamento
    const apontamento = await db.query.apontamentos.findFirst({
      where: eq(apontamentos.id, params.id),
    });

    if (!apontamento) {
      return NextResponse.json(
        { error: 'Apontamento não encontrado' },
        { status: 404 }
      );
    }

    if (apontamento.status !== 'EM_ANDAMENTO') {
      return NextResponse.json(
        { error: 'Apontamento não está em andamento' },
        { status: 400 }
      );
    }

    const agora = new Date();

    // Se já tem uma parada em andamento, finalizar
    if (apontamento.inicioParada && !apontamento.fimParada) {
      // Finalizar parada
      await db
        .update(apontamentos)
        .set({
          fimParada: agora,
          updatedAt: agora,
        })
        .where(eq(apontamentos.id, params.id));

      // Voltar máquina para EM_PROCESSO
      await db
        .update(maquinas)
        .set({
          status: 'EM_PROCESSO',
          updatedAt: agora,
        })
        .where(eq(maquinas.id, apontamento.maquinaId));

      return NextResponse.json({ 
        success: true, 
        message: 'Parada finalizada com sucesso' 
      });
    } 
    // Iniciar nova parada
    else {
      await db
        .update(apontamentos)
        .set({
          motivoParadaId: validated.motivoId,
          inicioParada: agora,
          observacoes: validated.observacoes,
          updatedAt: agora,
        })
        .where(eq(apontamentos.id, params.id));

      // Colocar máquina em PARADA
      await db
        .update(maquinas)
        .set({
          status: 'PARADA',
          updatedAt: agora,
        })
        .where(eq(maquinas.id, apontamento.maquinaId));

      return NextResponse.json({ 
        success: true, 
        message: 'Parada registrada com sucesso' 
      });
    }

  } catch (error) {
    console.error('Erro ao registrar parada:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', detalhes: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erro interno ao registrar parada' },
      { status: 500 }
    );
  }
}