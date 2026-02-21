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
  maquinaId: z.string().optional(),
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

    // Se estágio destino não é parada/finalizada, precisa de máquina
    if (validated.estagioId !== 'paradas' && 
        validated.estagioId !== 'finalizadas' && 
        !validated.maquinaId) {
      return NextResponse.json(
        { error: 'É necessário selecionar uma máquina' },
        { status: 400 }
      );
    }

    // Iniciar transação
    await db.transaction(async (tx) => {
      const agora = new Date();

      // Finalizar apontamento atual se existir
      const apontamentoAtual = await tx.query.apontamentos.findFirst({
        where: and(
          eq(apontamentos.opId, opId),
          eq(apontamentos.status, 'EM_ANDAMENTO')
        ),
      });

      if (apontamentoAtual) {
        await tx
          .update(apontamentos)
          .set({
            dataFim: agora,
            status: 'CONCLUIDO',
            updatedAt: agora,
          })
          .where(eq(apontamentos.id, apontamentoAtual.id));

        // Liberar máquina anterior
        if (op.codMaquinaAtual !== '00') {
          await tx
            .update(maquinas)
            .set({
              status: 'DISPONIVEL',
              updatedAt: agora,
            })
            .where(eq(maquinas.codigo, op.codMaquinaAtual));
        }
      }

      // Se for para estágio normal (com máquina)
      if (validated.maquinaId) {
        const maquina = await tx.query.maquinas.findFirst({
          where: eq(maquinas.id, validated.maquinaId),
        });

        if (maquina) {
          // Criar novo apontamento
          await tx.insert(apontamentos).values({
            opId,
            maquinaId: maquina.id,
            operadorInicioId: session.user.id,
            dataInicio: agora,
            dataFim: agora,
            status: 'EM_ANDAMENTO',
          });

          // Ocupar máquina
          await tx
            .update(maquinas)
            .set({
              status: 'EM_PROCESSO',
              updatedAt: agora,
            })
            .where(eq(maquinas.id, maquina.id));
        }
      }

      // Atualizar OP
      await tx
        .update(ops)
        .set({
          codEstagioAtual: estagioDestino.codigo,
          estagioAtual: estagioDestino.nome,
          codMaquinaAtual: validated.maquinaId ? 
            (await tx.query.maquinas.findFirst({ where: eq(maquinas.id, validated.maquinaId) }))?.codigo || '00' : 
            '00',
          maquinaAtual: validated.maquinaId ?
            (await tx.query.maquinas.findFirst({ where: eq(maquinas.id, validated.maquinaId) }))?.nome || 'NENHUMA' :
            'NENHUMA',
          dataUltimoApontamento: agora,
          status: validated.estagioId === 'finalizadas' ? 'FINALIZADA' : 'EM_ANDAMENTO',
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