// src/app/api/agendamentos-manutencao/route.ts
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { db } from '@/lib/db';
import { agendamentosManutencao } from '@/lib/db/schema/agendamentos-manutencao';
import { maquinas } from '@/lib/db/schema/maquinas';
import { tiposManutencao } from '@/lib/db/schema/tipos-manutencao';
import { atividadesManutencao } from '@/lib/db/schema/atividades-manutencao';
import { eq, and } from 'drizzle-orm';

// GET: lista agendamentos (padrão AGENDADO, filtros maquinaId/status) com joins
export async function GET(request: Request) {
  try {
    const auth = await requireAuth({ allowedNiveis: ['MANUTENCAO', 'ADM'] });
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const maquinaId = searchParams.get('maquinaId');
    const status = searchParams.get('status') || 'AGENDADO';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const conditions = [eq(agendamentosManutencao.status, status as any)];
    if (maquinaId) conditions.push(eq(agendamentosManutencao.maquinaId, maquinaId));

    const result = await db
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
      .where(and(...conditions))
      .orderBy(agendamentosManutencao.dataPrevista)
      .limit(limit)
      .offset(offset);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Erro ao buscar agendamentos:', error);
    return NextResponse.json(
      { error: 'Erro interno ao buscar agendamentos' },
      { status: 500 }
    );
  }
}