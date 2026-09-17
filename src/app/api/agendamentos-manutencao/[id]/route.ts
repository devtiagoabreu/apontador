// src/app/api/agendamentos-manutencao/[id]/route.ts
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { db } from '@/lib/db';
import { agendamentosManutencao } from '@/lib/db/schema/agendamentos-manutencao';
import { maquinas } from '@/lib/db/schema/maquinas';
import { tiposManutencao } from '@/lib/db/schema/tipos-manutencao';
import { atividadesManutencao } from '@/lib/db/schema/atividades-manutencao';
import { eq } from 'drizzle-orm';

// GET: detalhe de agendamento (com joins)
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth({ allowedNiveis: ['MANUTENCAO', 'ADM'] });
    if (auth.error) return auth.error;

    const [agendamento] = await db
      .select({
        id: agendamentosManutencao.id,
        maquinaId: agendamentosManutencao.maquinaId,
        maquinaNome: maquinas.nome,
        maquinaCodigo: maquinas.codigo,
        tipoManutencaoId: agendamentosManutencao.tipoManutencaoId,
        tipoNome: tiposManutencao.nome,
        atividadeManutencaoId: agendamentosManutencao.atividadeManutencaoId,
        atividadeNome: atividadesManutencao.nome,
        periodicidade: agendamentosManutencao.periodicidade,
        prioridade: agendamentosManutencao.prioridade,
        dataPrevista: agendamentosManutencao.dataPrevista,
        status: agendamentosManutencao.status,
        origemManutencaoId: agendamentosManutencao.origemManutencaoId,
        observacoes: agendamentosManutencao.observacoes,
        createdAt: agendamentosManutencao.createdAt,
      })
      .from(agendamentosManutencao)
      .leftJoin(maquinas, eq(agendamentosManutencao.maquinaId, maquinas.id))
      .leftJoin(tiposManutencao, eq(agendamentosManutencao.tipoManutencaoId, tiposManutencao.id))
      .leftJoin(atividadesManutencao, eq(agendamentosManutencao.atividadeManutencaoId, atividadesManutencao.id))
      .where(eq(agendamentosManutencao.id, params.id))
      .limit(1);

    if (!agendamento) {
      return NextResponse.json(
        { error: 'Agendamento não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(agendamento);
  } catch (error) {
    console.error('Erro ao buscar agendamento:', error);
    return NextResponse.json(
      { error: 'Erro interno ao buscar agendamento' },
      { status: 500 }
    );
  }
}