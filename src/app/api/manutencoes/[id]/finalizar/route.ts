// src/app/api/manutencoes/[id]/finalizar/route.ts
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { db } from '@/lib/db';
import { manutencoes } from '@/lib/db/schema/manutencoes';
import { maquinas } from '@/lib/db/schema/maquinas';
import { agendamentosManutencao } from '@/lib/db/schema/agendamentos-manutencao';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const finalizarSchema = z.object({
  observacoes: z.string().optional(),
  agendar: z.discriminatedUnion('sim', [
    z.object({ sim: z.literal(true), dataPrevista: z.string().min(1, 'Data é obrigatória') }),
    z.object({ sim: z.literal(false) }),
  ]),
});

// POST: finalizar manutenção + reagendamento opcional
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth({ allowedNiveis: ['MANUTENCAO', 'ADM'] });
    if (auth.error) return auth.error;

    const body = await request.json();
    const validated = finalizarSchema.parse(body);

    const result = await db.transaction(async (tx) => {
      // 1. Verificar manutenção existe e está EM_ANDAMENTO
      const [manutencao] = await tx
        .select()
        .from(manutencoes)
        .where(eq(manutencoes.id, params.id))
        .limit(1);

      if (!manutencao) {
        throw new Error('Manutenção não encontrada');
      }
      if (manutencao.status !== 'EM_ANDAMENTO') {
        throw new Error('Manutenção não está em andamento');
      }

      // 2. Finalizar manutenção
      const [finalizada] = await tx
        .update(manutencoes)
        .set({
          dataFim: new Date(),
          status: 'CONCLUIDA',
          operadorFimId: auth.session.user.id,
          observacoes: validated.observacoes || null,
          updatedAt: new Date(),
        })
        .where(eq(manutencoes.id, params.id))
        .returning();

      // 3. Máquina volta para DISPONIVEL
      await tx
        .update(maquinas)
        .set({ status: 'DISPONIVEL', updatedAt: new Date() })
        .where(eq(maquinas.id, manutencao.maquinaId));

      // 4. Se veio de agendamento, marcar agendamento como CONCLUIDO
      if (manutencao.agendamentoId) {
        await tx
          .update(agendamentosManutencao)
          .set({ status: 'CONCLUIDO', updatedAt: new Date() })
          .where(eq(agendamentosManutencao.id, manutencao.agendamentoId));
      }

      // 5. Se agendar, criar novo agendamento
      if (validated.agendar.sim) {
        const dataPrevista = new Date(validated.agendar.dataPrevista);
        if (dataPrevista < new Date()) {
          throw new Error('Data prevista não pode ser no passado');
        }

        await tx.insert(agendamentosManutencao).values({
          maquinaId: manutencao.maquinaId,
          tipoManutencaoId: manutencao.tipoManutencaoId,
          atividadeManutencaoId: manutencao.atividadeManutencaoId,
          periodicidade: manutencao.periodicidade,
          dataPrevista,
          status: 'AGENDADO',
          origemManutencaoId: params.id,
        });
      }

      return finalizada;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Erro ao finalizar manutenção:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', detalhes: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno ao finalizar manutenção' },
      { status: 400 }
    );
  }
}