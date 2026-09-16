import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ops } from '@/lib/db/schema/ops';
import { eq, desc, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { requireAuth } from '@/lib/api-auth';

const opSchema = z.object({
  op: z.number().int().positive(),
  produto: z.string().min(1),
  qtdeProgramado: z.number().optional().nullable(),
  qtdeCarregado: z.number().optional().nullable(),
  qtdeProduzida: z.number().optional().nullable(),
  um: z.string().optional().nullable(),
  narrativa: z.string().optional().nullable(),
  obs: z.string().optional().nullable(),
  status: z.enum(['ABERTA', 'EM_ANDAMENTO', 'FINALIZADA', 'CANCELADA']),
  codEstagioAtual: z.string().default('00'),
  estagioAtual: z.string().default('NENHUM'),
  codMaquinaAtual: z.string().optional().default('00'),
  maquinaAtual: z.string().optional().default('NENHUMA'),
});

const validStatuses = ['ABERTA', 'EM_ANDAMENTO', 'FINALIZADA', 'CANCELADA'] as const;

export async function GET(request: Request) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50'), 1), 100);
    const offset = (page - 1) * limit;
    const statusParam = searchParams.get('status');

    let allOps;
    let totalCount;

    if (statusParam) {
      const statusList = statusParam.split(',').filter(s => 
        validStatuses.includes(s as typeof validStatuses[number])
      );

      if (statusList.length === 0) {
        return NextResponse.json({
          data: [],
          pagination: { page, limit, total: 0, totalPages: 0 }
        });
      }

      allOps = await db.select()
        .from(ops)
        .where(inArray(ops.status, statusList))
        .orderBy(desc(ops.dataImportacao))
        .limit(limit)
        .offset(offset);

      const [countResult] = await db.select({ count: sql<number>`count(*)::int` })
        .from(ops)
        .where(inArray(ops.status, statusList));
      totalCount = countResult.count;
    } else {
      allOps = await db.select()
        .from(ops)
        .orderBy(desc(ops.dataImportacao))
        .limit(limit)
        .offset(offset);

      const [countResult] = await db.select({ count: sql<number>`count(*)::int` }).from(ops);
      totalCount = countResult.count;
    }

    return NextResponse.json({
      data: allOps,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch {
    return NextResponse.json(
      { error: 'Erro interno ao buscar OPs' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const body = await request.json();
    const validated = opSchema.parse(body);

    const existing = await db.query.ops.findFirst({
      where: eq(ops.op, validated.op),
    });

    if (existing) {
      return NextResponse.json(
        { error: 'OP já existe' },
        { status: 400 }
      );
    }

    const dadosParaInserir = {
      op: validated.op,
      produto: validated.produto,
      qtdeProgramado: validated.qtdeProgramado?.toString(),
      qtdeCarregado: validated.qtdeCarregado?.toString(),
      qtdeProduzida: validated.qtdeProduzida?.toString(),
      um: validated.um,
      narrativa: validated.narrativa,
      obs: validated.obs,
      status: validated.status,
      codEstagioAtual: validated.codEstagioAtual,
      estagioAtual: validated.estagioAtual,
      codMaquinaAtual: validated.codMaquinaAtual,
      maquinaAtual: validated.maquinaAtual,
      dataImportacao: new Date(),
    };

    const [newOp] = await db
      .insert(ops)
      .values(dadosParaInserir)
      .returning();

    return NextResponse.json(newOp, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', detalhes: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erro interno ao criar OP' },
      { status: 500 }
    );
  }
}