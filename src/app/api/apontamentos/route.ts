import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { apontamentos } from '@/lib/db/schema/apontamentos';
import { ops } from '@/lib/db/schema/ops';
import { maquinas } from '@/lib/db/schema/maquinas';
import { usuarios } from '@/lib/db/schema/usuarios';
import { motivosParada } from '@/lib/db/schema/motivos-parada';
import { eq, desc, and, sql } from 'drizzle-orm';
import { z } from 'zod';

const apontamentoSchema = z.object({
  opId: z.number().int().positive(),
  maquinaId: z.string().uuid(),
  operadorInicioId: z.string().uuid(),
  operadorFimId: z.string().uuid().optional(),
  metragemProcessada: z.number().optional(),
  dataInicio: z.string().datetime(),
  dataFim: z.string().datetime(),
  status: z.enum(['EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO']),
  motivoParadaId: z.string().uuid().optional(),
  inicioParada: z.string().datetime().optional(),
  fimParada: z.string().datetime().optional(),
  observacoes: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Filtros
    const opId = searchParams.get('opId');
    const maquinaId = searchParams.get('maquinaId');
    const operadorId = searchParams.get('operadorId');
    const dataInicio = searchParams.get('dataInicio');
    const dataFim = searchParams.get('dataFim');
    const status = searchParams.get('status');

    let conditions = [];

    if (opId) {
      conditions.push(eq(apontamentos.opId, parseInt(opId)));
    }
    if (maquinaId) {
      conditions.push(eq(apontamentos.maquinaId, maquinaId));
    }
    if (operadorId) {
      conditions.push(
        sql`${apontamentos.operadorInicioId} = ${operadorId} OR ${apontamentos.operadorFimId} = ${operadorId}`
      );
    }
    if (dataInicio) {
      conditions.push(sql`DATE(${apontamentos.dataInicio}) >= DATE(${dataInicio})`);
    }
    if (dataFim) {
      conditions.push(sql`DATE(${apontamentos.dataFim}) <= DATE(${dataFim})`);
    }
    if (status) {
      conditions.push(eq(apontamentos.status, status));
    }

    // Buscar apontamentos com joins
    const allApontamentos = await db
      .select({
        id: apontamentos.id,
        opId: apontamentos.opId,
        maquinaId: apontamentos.maquinaId,
        operadorInicioId: apontamentos.operadorInicioId,
        operadorFimId: apontamentos.operadorFimId,
        metragemProcessada: apontamentos.metragemProcessada,
        dataInicio: apontamentos.dataInicio,
        dataFim: apontamentos.dataFim,
        status: apontamentos.status,
        motivoParadaId: apontamentos.motivoParadaId,
        inicioParada: apontamentos.inicioParada,
        fimParada: apontamentos.fimParada,
        observacoes: apontamentos.observacoes,
        createdAt: apontamentos.createdAt,
        updatedAt: apontamentos.updatedAt,
        op: {
          op: ops.op,
          produto: ops.produto,
        },
        maquina: {
          nome: maquinas.nome,
          codigo: maquinas.codigo,
        },
        operadorInicio: {
          nome: usuarios.nome,
          matricula: usuarios.matricula,
        },
        operadorFim: {
          nome: usuarios.nome,
          matricula: usuarios.matricula,
        },
        motivoParada: {
          descricao: motivosParada.descricao,
        },
      })
      .from(apontamentos)
      .leftJoin(ops, eq(apontamentos.opId, ops.op))
      .leftJoin(maquinas, eq(apontamentos.maquinaId, maquinas.id))
      .leftJoin(usuarios, eq(apontamentos.operadorInicioId, usuarios.id))
      .leftJoin(usuarios, eq(apontamentos.operadorFimId, usuarios.id))
      .leftJoin(motivosParada, eq(apontamentos.motivoParadaId, motivosParada.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(apontamentos.dataInicio))
      .limit(limit)
      .offset(offset);

    // Contar total
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(apontamentos)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const total = Number(totalResult[0]?.count || 0);

    return NextResponse.json({
      data: allApontamentos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error('Erro ao buscar apontamentos:', error);
    return NextResponse.json(
      { error: 'Erro interno ao buscar apontamentos' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const validated = apontamentoSchema.parse(body);

    // Verificar se OP existe
    const op = await db.query.ops.findFirst({
      where: eq(ops.op, validated.opId),
    });

    if (!op) {
      return NextResponse.json(
        { error: 'OP não encontrada' },
        { status: 404 }
      );
    }

    // Verificar se máquina existe
    const maquina = await db.query.maquinas.findFirst({
      where: eq(maquinas.id, validated.maquinaId),
    });

    if (!maquina) {
      return NextResponse.json(
        { error: 'Máquina não encontrada' },
        { status: 404 }
      );
    }

    // Inserir apontamento
    const [newApontamento] = await db
      .insert(apontamentos)
      .values({
        opId: validated.opId,
        maquinaId: validated.maquinaId,
        operadorInicioId: validated.operadorInicioId,
        operadorFimId: validated.operadorFimId,
        metragemProcessada: validated.metragemProcessada?.toString(), // CONVERTER PARA STRING
        dataInicio: new Date(validated.dataInicio),
        dataFim: new Date(validated.dataFim),
        status: validated.status,
        motivoParadaId: validated.motivoParadaId,
        inicioParada: validated.inicioParada ? new Date(validated.inicioParada) : null,
        fimParada: validated.fimParada ? new Date(validated.fimParada) : null,
        observacoes: validated.observacoes,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    
    return NextResponse.json(newApontamento, { status: 201 });

  } catch (error) {
    console.error('Erro ao criar apontamento:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', detalhes: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erro interno ao criar apontamento' },
      { status: 500 }
    );
  }
}