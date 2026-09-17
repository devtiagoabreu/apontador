// src/app/api/manutencoes/route.ts
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { db } from '@/lib/db';
import { manutencoes } from '@/lib/db/schema/manutencoes';
import { maquinas } from '@/lib/db/schema/maquinas';
import { usuarios } from '@/lib/db/schema/usuarios';
import { tiposManutencao } from '@/lib/db/schema/tipos-manutencao';
import { atividadesManutencao } from '@/lib/db/schema/atividades-manutencao';
import { agendamentosManutencao } from '@/lib/db/schema/agendamentos-manutencao';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';
import { conflitoParaIniciarManutencao } from '@/lib/manutencao';

const iniciarManutencaoSchema = z.object({
  maquinaId: z.string().uuid('Máquina inválida'),
  tipoManutencaoId: z.string().uuid('Tipo inválido'),
  atividadeManutencaoId: z.string().uuid('Atividade inválida'),
  periodicidade: z.enum(['EVENTUAL', 'PERIODICA']),
  agendamentoId: z.string().uuid('Agendamento inválido').optional(),
  prioridade: z.number().int().min(0, 'Prioridade mínima 0').max(3, 'Prioridade máxima 3').optional(),
});

// GET: lista manutenções (filtros: maquinaId, status, operador) com joins para nomes
export async function GET(request: Request) {
  try {
    const auth = await requireAuth({ allowedNiveis: ['MANUTENCAO', 'ADM'] });
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const maquinaId = searchParams.get('maquinaId');
    const status = searchParams.get('status');
    const operadorId = searchParams.get('operadorId');
    const limit = parseInt(searchParams.get('limit') || '50');

    const conditions = [];
    if (maquinaId) conditions.push(eq(manutencoes.maquinaId, maquinaId));
    if (status) conditions.push(eq(manutencoes.status, status));
    if (operadorId) conditions.push(eq(manutencoes.operadorInicioId, operadorId));

    const result = await db
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
        prioridade: manutencoes.prioridade,
        dataInicio: manutencoes.dataInicio,
        dataFim: manutencoes.dataFim,
        observacoes: manutencoes.observacoes,
        status: manutencoes.status,
        operadorInicioId: manutencoes.operadorInicioId,
        operadorInicioNome: usuarios.nome,
        agendamentoId: manutencoes.agendamentoId,
        createdAt: manutencoes.createdAt,
      })
      .from(manutencoes)
      .leftJoin(maquinas, eq(manutencoes.maquinaId, maquinas.id))
      .leftJoin(usuarios, eq(manutencoes.operadorInicioId, usuarios.id))
      .leftJoin(tiposManutencao, eq(manutencoes.tipoManutencaoId, tiposManutencao.id))
      .leftJoin(atividadesManutencao, eq(manutencoes.atividadeManutencaoId, atividadesManutencao.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(manutencoes.dataInicio))
      .limit(limit);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Erro ao buscar manutenções:', error);
    return NextResponse.json(
      { error: 'Erro interno ao buscar manutenções' },
      { status: 500 }
    );
  }
}

// POST: iniciar manutenção (transação: valida máquina → insere → atualiza máquina)
export async function POST(request: Request) {
  try {
    const auth = await requireAuth({ allowedNiveis: ['MANUTENCAO', 'ADM'] });
    if (auth.error) return auth.error;

    const body = await request.json();
    const validated = iniciarManutencaoSchema.parse(body);

    // Usar transação do Drizzle
    const result = await db.transaction(async (tx) => {
      // 1. Verificar máquina existe e está ativa
      const [maquina] = await tx
        .select()
        .from(maquinas)
        .where(eq(maquinas.id, validated.maquinaId))
        .limit(1);

      if (!maquina) {
        throw new Error('Máquina não encontrada');
      }

      // 2. Verificar conflito RF9 (produção ativa / manutenção ativa / inativa)
      const conflito = conflitoParaIniciarManutencao(maquina);
      if (conflito) throw new Error(conflito);

      // 3. Inserir manutenção EM_ANDAMENTO
      const [novaManutencao] = await tx
        .insert(manutencoes)
        .values({
          maquinaId: validated.maquinaId,
          operadorInicioId: auth.session.user.id,
          tipoManutencaoId: validated.tipoManutencaoId,
          atividadeManutencaoId: validated.atividadeManutencaoId,
          periodicidade: validated.periodicidade,
          prioridade: validated.prioridade ?? 1,
          status: 'EM_ANDAMENTO',
          agendamentoId: validated.agendamentoId || null,
          dataInicio: new Date(),
        })
        .returning();

      // 4. Atualizar máquina para EM_MANUTENCAO
      await tx
        .update(maquinas)
        .set({ status: 'EM_MANUTENCAO', updatedAt: new Date() })
        .where(eq(maquinas.id, validated.maquinaId));

      // 5. Se tem agendamento, atualizar para EM_ANDAMENTO
      if (validated.agendamentoId) {
        await tx
          .update(agendamentosManutencao)
          .set({ status: 'EM_ANDAMENTO', updatedAt: new Date() })
          .where(eq(agendamentosManutencao.id, validated.agendamentoId));
      }

      return novaManutencao;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Erro ao iniciar manutenção:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', detalhes: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno ao iniciar manutenção' },
      { status: 400 }
    );
  }
}