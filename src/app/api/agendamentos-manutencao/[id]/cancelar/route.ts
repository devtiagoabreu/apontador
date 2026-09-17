// src/app/api/agendamentos-manutencao/[id]/cancelar/route.ts
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { db } from '@/lib/db';
import { agendamentosManutencao } from '@/lib/db/schema/agendamentos-manutencao';
import { eq } from 'drizzle-orm';
import { conflitoParaCancelarAgendamento } from '@/lib/manutencao';

// POST: cancelar agendamento (somente AGENDADO)
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth({ allowedNiveis: ['MANUTENCAO', 'ADM'] });
    if (auth.error) return auth.error;

    const body = await request.json().catch(() => ({}));

    const [agendamento] = await db
      .select()
      .from(agendamentosManutencao)
      .where(eq(agendamentosManutencao.id, params.id))
      .limit(1);

    if (!agendamento) {
      return NextResponse.json(
        { error: 'Agendamento não encontrado' },
        { status: 404 }
      );
    }
    const conflito = conflitoParaCancelarAgendamento(agendamento.status);
    if (conflito) {
      return NextResponse.json(
        { error: conflito },
        { status: 400 }
      );
    }

    const [cancelado] = await db
      .update(agendamentosManutencao)
      .set({
        status: 'CANCELADO',
        observacoes: body.observacoes || null,
        updatedAt: new Date(),
      })
      .where(eq(agendamentosManutencao.id, params.id))
      .returning();

    return NextResponse.json(cancelado);
  } catch (error) {
    console.error('Erro ao cancelar agendamento:', error);
    return NextResponse.json(
      { error: 'Erro interno ao cancelar agendamento' },
      { status: 500 }
    );
  }
}