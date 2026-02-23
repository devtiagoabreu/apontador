import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { apontamentos } from '@/lib/db/schema/apontamentos';
import { maquinas } from '@/lib/db/schema/maquinas';
import { ops } from '@/lib/db/schema/ops';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const finalizarSchema = z.object({
  dataFim: z.string().datetime().optional(),
  metragemProcessada: z.number().optional(),
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
    const validated = finalizarSchema.parse(body);
    const agora = new Date();

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

    // Se for uma PARADA, precisamos saber se tem OP vinculada
    if (apontamento.tipo === 'PARADA') {
      await db.transaction(async (tx) => {
        // Finalizar a parada
        await tx
          .update(apontamentos)
          .set({
            dataFim: validated.dataFim ? new Date(validated.dataFim) : agora,
            status: 'CONCLUIDO',
            observacoes: validated.observacoes || apontamento.observacoes,
            updatedAt: agora,
          })
          .where(eq(apontamentos.id, params.id));

        // Decidir novo status da máquina baseado se tem OP vinculada
        if (apontamento.opId) {
          // Tem OP vinculada - volta para EM_PROCESSO
          await tx
            .update(maquinas)
            .set({
              status: 'EM_PROCESSO',
              updatedAt: agora,
            })
            .where(eq(maquinas.id, apontamento.maquinaId));
        } else {
          // Não tem OP - volta para DISPONIVEL
          await tx
            .update(maquinas)
            .set({
              status: 'DISPONIVEL',
              updatedAt: agora,
            })
            .where(eq(maquinas.id, apontamento.maquinaId));
        }
      });

      return NextResponse.json({ success: true, tipo: 'PARADA' });
    }

    // Se for PRODUÇÃO
    if (apontamento.tipo === 'PRODUCAO') {
      await db.transaction(async (tx) => {
        // Finalizar apontamento de produção
        await tx
          .update(apontamentos)
          .set({
            dataFim: validated.dataFim ? new Date(validated.dataFim) : agora,
            metragemProcessada: validated.metragemProcessada?.toString(),
            status: 'CONCLUIDO',
            observacoes: validated.observacoes,
            updatedAt: agora,
          })
          .where(eq(apontamentos.id, params.id));

        // Atualizar a OP com a metragem produzida
        if (apontamento.opId) {
          await tx
            .update(ops)
            .set({
              qtdeProduzida: validated.metragemProcessada?.toString(),
              dataUltimoApontamento: agora,
            })
            .where(eq(ops.op, apontamento.opId));
        }

        // Liberar a máquina
        await tx
          .update(maquinas)
          .set({
            status: 'DISPONIVEL',
            updatedAt: agora,
          })
          .where(eq(maquinas.id, apontamento.maquinaId));
      });

      return NextResponse.json({ success: true, tipo: 'PRODUCAO' });
    }

    return NextResponse.json(
      { error: 'Tipo de apontamento inválido' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Erro ao finalizar apontamento:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', detalhes: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erro interno ao finalizar apontamento' },
      { status: 500 }
    );
  }
}