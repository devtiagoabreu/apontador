// src/app/api/agendamentos-manutencao/[id]/iniciar/route.ts
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { db } from '@/lib/db';
import { manutencoes } from '@/lib/db/schema/manutencoes';
import { maquinas } from '@/lib/db/schema/maquinas';
import { agendamentosManutencao } from '@/lib/db/schema/agendamentos-manutencao';
import { eq } from 'drizzle-orm';
import {
  conflitoParaIniciarAgendamento,
  conflitoParaIniciarManutencao,
} from '@/lib/manutencao';

// POST: iniciar manutenção a partir de agendamento (pré-preenchido)
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth({ allowedNiveis: ['MANUTENCAO', 'ADM'] });
    if (auth.error) return auth.error;

    const result = await db.transaction(async (tx) => {
      // 1. Verificar agendamento existe e está AGENDADO
      const [agendamento] = await tx
        .select()
        .from(agendamentosManutencao)
        .where(eq(agendamentosManutencao.id, params.id))
        .limit(1);

      if (!agendamento) {
        throw new Error('Agendamento não encontrado');
      }
      const conflitoAgendamento = conflitoParaIniciarAgendamento(agendamento.status);
      if (conflitoAgendamento) throw new Error(conflitoAgendamento);

      // 2. Verificar máquina existe e está ativa (RF9)
      const [maquina] = await tx
        .select()
        .from(maquinas)
        .where(eq(maquinas.id, agendamento.maquinaId))
        .limit(1);

      if (!maquina) {
        throw new Error('Máquina não encontrada');
      }
      const conflito = conflitoParaIniciarManutencao(maquina);
      if (conflito) throw new Error(conflito);

      // 3. Criar manutenção vinculada ao agendamento
      const [novaManutencao] = await tx
        .insert(manutencoes)
        .values({
          maquinaId: agendamento.maquinaId,
          operadorInicioId: auth.session.user.id,
          tipoManutencaoId: agendamento.tipoManutencaoId,
          atividadeManutencaoId: agendamento.atividadeManutencaoId,
          periodicidade: agendamento.periodicidade,
          status: 'EM_ANDAMENTO',
          agendamentoId: params.id,
          dataInicio: new Date(),
        })
        .returning();

      // 4. Atualizar agendamento para EM_ANDAMENTO
      await tx
        .update(agendamentosManutencao)
        .set({ status: 'EM_ANDAMENTO', updatedAt: new Date() })
        .where(eq(agendamentosManutencao.id, params.id));

      // 5. Atualizar máquina para EM_MANUTENCAO
      await tx
        .update(maquinas)
        .set({ status: 'EM_MANUTENCAO', updatedAt: new Date() })
        .where(eq(maquinas.id, agendamento.maquinaId));

      return novaManutencao;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Erro ao iniciar manutenção por agendamento:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno' },
      { status: 400 }
    );
  }
}