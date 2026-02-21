import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { ops } from '@/lib/db/schema/ops';
import { apontamentos } from '@/lib/db/schema/apontamentos';
import { estagios } from '@/lib/db/schema/estagios';
import { maquinas } from '@/lib/db/schema/maquinas';
import { eq, and, desc } from 'drizzle-orm';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

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

    // Verificar se OP está em estágio que pode ser desfeito
    if (!op.codEstagioAtual || op.codEstagioAtual === '00') {
      return NextResponse.json(
        { error: 'Não é possível desfazer - OP no estágio inicial' },
        { status: 400 }
      );
    }

    // Buscar último apontamento concluído
    const ultimoApontamento = await db.query.apontamentos.findFirst({
      where: and(
        eq(apontamentos.opId, opId),
        eq(apontamentos.status, 'CONCLUIDO')
      ),
      orderBy: desc(apontamentos.dataFim),
    });

    if (!ultimoApontamento) {
      return NextResponse.json(
        { error: 'Não há processo anterior para desfazer' },
        { status: 400 }
      );
    }

    // Calcular código do estágio anterior
    const codigoAtual = parseInt(op.codEstagioAtual);
    const codigoAnterior = (codigoAtual - 1).toString().padStart(2, '0');
    
    // Buscar estágio anterior
    const estagioAnterior = await db.query.estagios.findFirst({
      where: eq(estagios.codigo, codigoAnterior),
    });

    if (!estagioAnterior) {
      return NextResponse.json(
        { error: 'Não é possível desfazer - estágio anterior não encontrado' },
        { status: 400 }
      );
    }

    // Buscar máquina do apontamento anterior
    const maquinaAnterior = await db.query.maquinas.findFirst({
      where: eq(maquinas.id, ultimoApontamento.maquinaId),
    });

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

        // Liberar máquina atual
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

      // Criar novo apontamento no estágio anterior
      if (maquinaAnterior) {
        await tx.insert(apontamentos).values({
          opId,
          maquinaId: maquinaAnterior.id,
          operadorInicioId: session.user.id,
          dataInicio: agora,
          dataFim: agora,
          status: 'EM_ANDAMENTO',
        });

        // Ocupar máquina anterior
        await tx
          .update(maquinas)
          .set({
            status: 'EM_PROCESSO',
            updatedAt: agora,
          })
          .where(eq(maquinas.id, maquinaAnterior.id));
      }

      // Atualizar OP
      await tx
        .update(ops)
        .set({
          codEstagioAtual: estagioAnterior.codigo,
          estagioAtual: estagioAnterior.nome,
          codMaquinaAtual: maquinaAnterior?.codigo || '00',
          maquinaAtual: maquinaAnterior?.nome || 'NENHUMA',
          dataUltimoApontamento: agora,
        })
        .where(eq(ops.op, opId));
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Erro ao desfazer processo:', error);
    return NextResponse.json(
      { error: 'Erro interno ao desfazer processo' },
      { status: 500 }
    );
  }
}