import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { apontamentos } from '@/lib/db/schema/apontamentos';
import { ops } from '@/lib/db/schema/ops';
import { maquinas } from '@/lib/db/schema/maquinas';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const iniciarSchema = z.object({
  opId: z.number(),
  maquinaId: z.string(),
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const validated = iniciarSchema.parse(body);

    // Verificar se máquina está disponível
    const maquina = await db.query.maquinas.findFirst({
      where: eq(maquinas.id, validated.maquinaId),
    });

    if (!maquina) {
      return NextResponse.json({ error: 'Máquina não encontrada' }, { status: 404 });
    }

    if (maquina.status !== 'DISPONIVEL') {
      return NextResponse.json(
        { error: 'Máquina não está disponível' },
        { status: 400 }
      );
    }

    // Verificar se OP está disponível
    const op = await db.query.ops.findFirst({
      where: eq(ops.op, validated.opId),
    });

    if (!op) {
      return NextResponse.json({ error: 'OP não encontrada' }, { status: 404 });
    }

    if (op.status !== 'ABERTA') {
      return NextResponse.json(
        { error: 'OP não está disponível para produção' },
        { status: 400 }
      );
    }

    // Verificar se já existe apontamento ativo para esta máquina
    const apontamentoAtivo = await db.query.apontamentos.findFirst({
      where: eq(apontamentos.maquinaId, validated.maquinaId),
    });

    if (apontamentoAtivo) {
      return NextResponse.json(
        { error: 'Já existe um apontamento ativo para esta máquina' },
        { status: 400 }
      );
    }

    // Iniciar transação
    const agora = new Date();

    // Criar apontamento
    const [novoApontamento] = await db
      .insert(apontamentos)
      .values({
        opId: validated.opId,
        maquinaId: validated.maquinaId,
        operadorInicioId: session.user.id,
        dataInicio: agora,
        dataFim: agora,
        status: 'EM_ANDAMENTO',
      })
      .returning();

    // Atualizar status da máquina
    await db
      .update(maquinas)
      .set({
        status: 'EM_PROCESSO',
        updatedAt: agora,
      })
      .where(eq(maquinas.id, validated.maquinaId));

    // Atualizar status da OP
    await db
      .update(ops)
      .set({
        status: 'EM_ANDAMENTO',
        codMaquinaAtual: maquina.codigo,
        maquinaAtual: maquina.nome,
        dataUltimoApontamento: agora,
      })
      .where(eq(ops.op, validated.opId));

    return NextResponse.json(novoApontamento, { status: 201 });

  } catch (error) {
    console.error('Erro ao criar apontamento:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', detalhes: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erro interno ao criar apontamento' },
      { status: 500 }
    );
  }
}