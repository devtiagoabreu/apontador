// src/app/api/agendamentos-manutencao/route.ts
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { db } from '@/lib/db';
import { agendamentosManutencao } from '@/lib/db/schema/agendamentos-manutencao';
import { maquinas } from '@/lib/db/schema/maquinas';
import { tiposManutencao } from '@/lib/db/schema/tipos-manutencao';
import { atividadesManutencao } from '@/lib/db/schema/atividades-manutencao';
import { eq, and, desc, asc } from 'drizzle-orm';
import { z } from 'zod';
import {
  conflitoParaCriarAgendamento,
  validarDataPrevistaAgendamento,
  validarPrioridade,
} from '@/lib/manutencao';

// POST: criação manual de agendamento (dashboard — ADM). Backlog.
const criarAgendamentoSchema = z.object({
  maquinaId: z.string().uuid('Máquina inválida'),
  tipoManutencaoId: z.string().uuid('Tipo de manutenção inválido'),
  atividadeManutencaoId: z.string().uuid('Atividade de manutenção inválida'),
  periodicidade: z.enum(['EVENTUAL', 'PERIODICA'], {
    errorMap: () => ({ message: 'Periodicidade inválida' }),
  }),
  prioridade: z.number().int().min(0, 'Prioridade mínima 0').max(3, 'Prioridade máxima 3').optional(),
  dataPrevista: z.string().min(1, 'Data prevista é obrigatória'),
  observacoes: z.string().optional(),
});

// GET: lista agendamentos (sem status = todos; filtros maquinaId/status) com joins
export async function GET(request: Request) {
  try {
    const auth = await requireAuth({ allowedNiveis: ['MANUTENCAO', 'ADM'] });
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const maquinaId = searchParams.get('maquinaId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Sem parâmetro status = todos; com parâmetro = filtra (default AGENDADO no mobile)
    const conditions = [];
    if (status) conditions.push(eq(agendamentosManutencao.status, status as any));
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
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      // Backlog: ordena por prioridade (desc) e depois data prevista (asc)
      .orderBy(desc(agendamentosManutencao.prioridade), asc(agendamentosManutencao.dataPrevista))
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

// POST: criação manual de agendamento (exclusiva do dashboard — ADM)
export async function POST(request: Request) {
  try {
    const auth = await requireAuth({ requiredLevel: 'ADM' });
    if (auth.error) return auth.error;

    const body = await request.json();
    const validated = criarAgendamentoSchema.parse(body);

    // Prioridade default 1 (Normal)
    const prioridade = validated.prioridade ?? 1;
    const erroPrioridade = validarPrioridade(prioridade);
    if (erroPrioridade) {
      return NextResponse.json({ error: erroPrioridade }, { status: 400 });
    }

    // Data prevista não pode ser no passado
    const erroData = validarDataPrevistaAgendamento(validated.dataPrevista);
    if (erroData) {
      return NextResponse.json({ error: erroData }, { status: 400 });
    }

    const result = await db.transaction(async (tx) => {
      // 1. Máquina existe e está ativa
      const [maquina] = await tx
        .select()
        .from(maquinas)
        .where(eq(maquinas.id, validated.maquinaId))
        .limit(1);

      if (!maquina) throw new Error('Máquina não encontrada');
      const conflito = conflitoParaCriarAgendamento(maquina);
      if (conflito) throw new Error(conflito);

      // 2. Tipo e atividade existem e estão ativos
      const [tipo] = await tx
        .select()
        .from(tiposManutencao)
        .where(eq(tiposManutencao.id, validated.tipoManutencaoId))
        .limit(1);
      if (!tipo) throw new Error('Tipo de manutenção não encontrado');
      if (!tipo.ativo) throw new Error('Tipo de manutenção inativo');

      const [atividade] = await tx
        .select()
        .from(atividadesManutencao)
        .where(eq(atividadesManutencao.id, validated.atividadeManutencaoId))
        .limit(1);
      if (!atividade) throw new Error('Atividade de manutenção não encontrada');
      if (!atividade.ativo) throw new Error('Atividade de manutenção inativa');

      // 3. Criar agendamento AGENDADO
      const [novoAgendamento] = await tx
        .insert(agendamentosManutencao)
        .values({
          maquinaId: validated.maquinaId,
          tipoManutencaoId: validated.tipoManutencaoId,
          atividadeManutencaoId: validated.atividadeManutencaoId,
          periodicidade: validated.periodicidade,
          prioridade,
          dataPrevista: new Date(validated.dataPrevista),
          status: 'AGENDADO',
          observacoes: validated.observacoes || null,
        })
        .returning();

      return novoAgendamento;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar agendamento:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', detalhes: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno ao criar agendamento' },
      { status: 400 }
    );
  }
}