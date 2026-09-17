// src/app/api/manutencoes/[id]/route.ts
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { db } from '@/lib/db';
import { manutencoes } from '@/lib/db/schema/manutencoes';
import { maquinas } from '@/lib/db/schema/maquinas';
import { usuarios } from '@/lib/db/schema/usuarios';
import { tiposManutencao } from '@/lib/db/schema/tipos-manutencao';
import { atividadesManutencao } from '@/lib/db/schema/atividades-manutencao';
import { eq } from 'drizzle-orm';

// GET: detalhe de manutenção (com joins para nomes)
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth({ allowedNiveis: ['MANUTENCAO', 'ADM'] });
    if (auth.error) return auth.error;

    const [manutencao] = await db
      .select({
        id: manutencoes.id,
        maquinaId: manutencoes.maquinaId,
        maquinaNome: maquinas.nome,
        maquinaCodigo: maquinas.codigo,
        tipoManutencaoId: manutencoes.tipoManutencaoId,
        tipoNome: tiposManutencao.nome,
        atividadeManutencaoId: manutencoes.atividadeManutencaoId,
        atividadeNome: atividadesManutencao.nome,
        periodicidade: manutencoes.periodicidade,
        dataInicio: manutencoes.dataInicio,
        dataFim: manutencoes.dataFim,
        observacoes: manutencoes.observacoes,
        status: manutencoes.status,
        operadorInicioId: manutencoes.operadorInicioId,
        operadorInicioNome: usuarios.nome,
        operadorFimId: manutencoes.operadorFimId,
        agendamentoId: manutencoes.agendamentoId,
        createdAt: manutencoes.createdAt,
      })
      .from(manutencoes)
      .leftJoin(maquinas, eq(manutencoes.maquinaId, maquinas.id))
      .leftJoin(usuarios, eq(manutencoes.operadorInicioId, usuarios.id))
      .leftJoin(tiposManutencao, eq(manutencoes.tipoManutencaoId, tiposManutencao.id))
      .leftJoin(atividadesManutencao, eq(manutencoes.atividadeManutencaoId, atividadesManutencao.id))
      .where(eq(manutencoes.id, params.id))
      .limit(1);

    if (!manutencao) {
      return NextResponse.json(
        { error: 'Manutenção não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(manutencao);
  } catch (error) {
    console.error('Erro ao buscar manutenção:', error);
    return NextResponse.json(
      { error: 'Erro interno ao buscar manutenção' },
      { status: 500 }
    );
  }
}