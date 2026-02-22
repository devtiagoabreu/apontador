import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { apontamentos } from '@/lib/db/schema/apontamentos';
import { ops } from '@/lib/db/schema/ops';
import { maquinas } from '@/lib/db/schema/maquinas';
import { usuarios } from '@/lib/db/schema/usuarios';
import { motivosParada } from '@/lib/db/schema/motivos-parada';
import { eq } from 'drizzle-orm';
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

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const apontamento = await db
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
      .where(eq(apontamentos.id, params.id))
      .then(rows => rows[0]);

    if (!apontamento) {
      return NextResponse.json(
        { error: 'Apontamento não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(apontamento);
  } catch (error) {
    console.error('Erro ao buscar apontamento:', error);
    return NextResponse.json(
      { error: 'Erro interno ao buscar apontamento' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const validated = apontamentoSchema.parse(body);

    const [updated] = await db
      .update(apontamentos)
      .set({
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
        updatedAt: new Date(),
      })
      .where(eq(apontamentos.id, params.id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Erro ao atualizar apontamento:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', detalhes: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erro interno ao atualizar apontamento' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    await db.delete(apontamentos).where(eq(apontamentos.id, params.id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir apontamento:', error);
    return NextResponse.json(
      { error: 'Erro interno ao excluir apontamento' },
      { status: 500 }
    );
  }
}