import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { apontamentos } from '@/lib/db/schema/apontamentos';
import { ops } from '@/lib/db/schema/ops';
import { maquinas } from '@/lib/db/schema/maquinas';
import { estagios } from '@/lib/db/schema/estagios';
import { eq, and, sql } from 'drizzle-orm';
import { z } from 'zod';

const finalizarSchema = z.object({
  metragem: z.number().positive('Metragem deve ser positiva'),
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

    // Buscar OP
    const op = await db.query.ops.findFirst({
      where: eq(ops.op, apontamento.opId),
    });

    if (!op) {
      return NextResponse.json({ error: 'OP não encontrada' }, { status: 404 });
    }

    // Buscar máquina
    const maquina = await db.query.maquinas.findFirst({
      where: eq(maquinas.id, apontamento.maquinaId),
    });

    if (!maquina) {
      return NextResponse.json({ error: 'Máquina não encontrada' }, { status: 404 });
    }

    const agora = new Date();

    // Iniciar transação
    await db.transaction(async (tx) => {
      // Atualizar apontamento
      await tx
        .update(apontamentos)
        .set({
          dataFim: agora,
          metragemProcessada: validated.metragem.toString(),
          operadorFimId: session.user.id,
          status: 'CONCLUIDO',
          updatedAt: agora,
        })
        .where(eq(apontamentos.id, params.id));

      // Verificar se é o último estágio (Revisão)
      const ultimoEstagio = await tx.query.estagios.findFirst({
        where: eq(estagios.nome, 'REVISÃO'),
      });

      if (op.codEstagioAtual === ultimoEstagio?.codigo) {
        // É o último estágio - finalizar OP
        await tx
          .update(ops)
          .set({
            qtdeProduzida: validated.metragem.toString(),
            status: 'FINALIZADA',
            codMaquinaAtual: '00',
            maquinaAtual: 'NENHUMA',
            codEstagioAtual: '99',
            estagioAtual: 'FINALIZADA',
            dataUltimoApontamento: agora,
          })
          .where(eq(ops.op, apontamento.opId));
      } else {
        // Não é o último estágio - avançar para o próximo
        const proximoEstagio = await tx.query.estagios.findFirst({
          where: sql`${estagios.ordem} > ${op.codEstagioAtual}`,
          orderBy: (estagios, { asc }) => [asc(estagios.ordem)],
        });

        await tx
          .update(ops)
          .set({
            codMaquinaAtual: '00',
            maquinaAtual: 'NENHUMA',
            codEstagioAtual: proximoEstagio?.codigo || '00',
            estagioAtual: proximoEstagio?.nome || 'NENHUM',
            dataUltimoApontamento: agora,
          })
          .where(eq(ops.op, apontamento.opId));
      }

      // Liberar máquina
      await tx
        .update(maquinas)
        .set({
          status: 'DISPONIVEL',
          updatedAt: agora,
        })
        .where(eq(maquinas.id, apontamento.maquinaId));
    });

    return NextResponse.json({ success: true });

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