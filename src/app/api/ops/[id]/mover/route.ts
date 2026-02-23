import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { ops } from '@/lib/db/schema/ops';
import { apontamentos } from '@/lib/db/schema/apontamentos';
import { maquinas } from '@/lib/db/schema/maquinas';
import { estagios } from '@/lib/db/schema/estagios';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const moverSchema = z.object({
  estagioId: z.string(),
  maquinaId: z.string(),
  isReprocesso: z.boolean().default(false),
  metragemFinalizada: z.number().optional(),
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
    const validated = moverSchema.parse(body);
    const opId = parseInt(params.id);

    // Buscar OP
    const op = await db.query.ops.findFirst({
      where: eq(ops.op, opId),
    });

    if (!op) {
      return NextResponse.json(
        { error: 'OP não encontrada' },
        { status: 404 }
      );
    }

    // Buscar estágio destino
    const estagioDestino = await db.query.estagios.findFirst({
      where: eq(estagios.id, validated.estagioId),
    });

    if (!estagioDestino) {
      return NextResponse.json(
        { error: 'Estágio não encontrado' },
        { status: 404 }
      );
    }

    // Buscar máquina
    const maquina = await db.query.maquinas.findFirst({
      where: eq(maquinas.id, validated.maquinaId),
    });

    if (!maquina) {
      return NextResponse.json(
        { error: 'Máquina não encontrada' },
        { status: 404 }
      );
    }

    if (maquina.status !== 'DISPONIVEL') {
      return NextResponse.json(
        { error: 'Máquina não está disponível' },
        { status: 400 }
      );
    }

    // Iniciar transação
    await db.transaction(async (tx) => {
      const agora = new Date();

      // Buscar apontamento atual em andamento
      const apontamentoAtual = await tx.query.apontamentos.findFirst({
        where: and(
          eq(apontamentos.opId, opId),
          eq(apontamentos.status, 'EM_ANDAMENTO')
        ),
      });

      if (apontamentoAtual) {
        // Finalizar apontamento atual
        await tx
          .update(apontamentos)
          .set({
            dataFim: agora,
            metragemProcessada: validated.metragemFinalizada?.toString(),
            status: 'CONCLUIDO',
            updatedAt: agora,
          })
          .where(eq(apontamentos.id, apontamentoAtual.id));

        // Liberar máquina anterior
        if (op.codMaquinaAtual && op.codMaquinaAtual !== '00') {
          await tx
            .update(maquinas)
            .set({
              status: 'DISPONIVEL',
              updatedAt: agora,
            })
            .where(eq(maquinas.codigo, op.codMaquinaAtual));
        }
      }

      // Criar novo apontamento
      await tx.insert(apontamentos).values({
        tipo: 'PRODUCAO',
        opId,
        maquinaId: maquina.id,
        estagioId: estagioDestino.id,
        operadorInicioId: session.user.id,
        dataInicio: agora,
        dataFim: agora,
        status: 'EM_ANDAMENTO',
        isReprocesso: validated.isReprocesso,
        createdAt: agora,
        updatedAt: agora,
      });

      // Ocupar nova máquina
      await tx
        .update(maquinas)
        .set({
          status: 'EM_PROCESSO',
          updatedAt: agora,
        })
        .where(eq(maquinas.id, maquina.id));

      // Atualizar OP
      await tx
        .update(ops)
        .set({
          codEstagioAtual: estagioDestino.codigo,
          estagioAtual: estagioDestino.nome,
          codMaquinaAtual: maquina.codigo,
          maquinaAtual: maquina.nome,
          dataUltimoApontamento: agora,
        })
        .where(eq(ops.op, opId));
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Erro ao mover OP:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', detalhes: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erro interno ao mover OP' },
      { status: 500 }
    );
  }
}