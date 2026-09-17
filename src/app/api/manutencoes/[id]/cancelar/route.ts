// src/app/api/manutencoes/[id]/cancelar/route.ts
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { db } from '@/lib/db';
import { manutencoes } from '@/lib/db/schema/manutencoes';
import { maquinas } from '@/lib/db/schema/maquinas';
import { agendamentosManutencao } from '@/lib/db/schema/agendamentos-manutencao';
import { eq } from 'drizzle-orm';

// POST: cancelar manutenção ativa
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth({ allowedNiveis: ['MANUTENCAO', 'ADM'] });
    if (auth.error) return auth.error;

    const result = await db.transaction(async (tx) => {
      const [manutencao] = await tx
        .select()
        .from(manutencoes)
        .where(eq(manutencoes.id, params.id))
        .limit(1);

      if (!manutencao) {
        throw new Error('Manutenção não encontrada');
      }
      if (manutencao.status !== 'EM_ANDAMENTO') {
        throw new Error('Apenas manutenções em andamento podem ser canceladas');
      }

      // Cancelar manutenção
      const [cancelada] = await tx
        .update(manutencoes)
        .set({
          status: 'CANCELADA',
          dataFim: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(manutencoes.id, params.id))
        .returning();

      // Máquina volta para DISPONIVEL
      await tx
        .update(maquinas)
        .set({ status: 'DISPONIVEL', updatedAt: new Date() })
        .where(eq(maquinas.id, manutencao.maquinaId));

      // Se veio de agendamento, voltar agendamento para AGENDADO (pode reagendar)
      if (manutencao.agendamentoId) {
        await tx
          .update(agendamentosManutencao)
          .set({ status: 'AGENDADO', updatedAt: new Date() })
          .where(eq(agendamentosManutencao.id, manutencao.agendamentoId));
      }

      return cancelada;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Erro ao cancelar manutenção:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno ao cancelar manutenção' },
      { status: 400 }
    );
  }
}