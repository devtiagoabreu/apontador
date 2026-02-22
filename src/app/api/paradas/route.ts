import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { apontamentos } from '@/lib/db/schema/apontamentos';
import { maquinas } from '@/lib/db/schema/maquinas';
import { motivosParada } from '@/lib/db/schema/motivos-parada';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { sql } from 'drizzle-orm';

const paradaSchema = z.object({
  maquinaId: z.string().uuid('Máquina inválida'),
  motivoParadaId: z.string().uuid('Motivo inválido'),
  observacoes: z.string().optional(),
  opId: z.number().int().positive().optional(),
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const validated = paradaSchema.parse(body);

    // Verificar se máquina existe
    const maquina = await db.query.maquinas.findFirst({
      where: eq(maquinas.id, validated.maquinaId),
    });

    if (!maquina) {
      return NextResponse.json(
        { error: 'Máquina não encontrada' },
        { status: 404 }
      );
    }

    // Verificar se já existe parada em andamento para esta máquina
    const paradaAtiva = await db.query.apontamentos.findFirst({
      where: and(
        eq(apontamentos.maquinaId, validated.maquinaId),
        eq(apontamentos.status, 'PARADA'),
        sql`${apontamentos.fimParada} IS NULL`
      ),
    });

    if (paradaAtiva) {
      return NextResponse.json(
        { error: 'Máquina já está em parada' },
        { status: 400 }
      );
    }

    const agora = new Date();

    // Preparar dados para inserção
    const dadosParaInserir: any = {
      maquinaId: validated.maquinaId,
      motivoParadaId: validated.motivoParadaId,
      operadorInicioId: session.user.id,
      dataInicio: agora,
      dataFim: agora,
      inicioParada: agora,
      status: 'PARADA',
      createdAt: agora,
      updatedAt: agora,
    };

    // Adicionar opId apenas se foi fornecido
    if (validated.opId) {
      dadosParaInserir.opId = validated.opId;
    }

    // Adicionar observações se foi fornecido
    if (validated.observacoes) {
      dadosParaInserir.observacoes = validated.observacoes;
    }

    // Criar registro de parada
    const [novaParada] = await db
      .insert(apontamentos)
      .values(dadosParaInserir)
      .returning();

    // Atualizar status da máquina
    await db
      .update(maquinas)
      .set({
        status: 'PARADA',
        updatedAt: agora,
      })
      .where(eq(maquinas.id, validated.maquinaId));

    return NextResponse.json(novaParada, { status: 201 });

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