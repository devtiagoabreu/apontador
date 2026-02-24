import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { paradasMaquina, insertParadaSchema } from '@/lib/db/schema/paradas-maquina';
import { maquinas } from '@/lib/db/schema/maquinas';
import { usuarios } from '@/lib/db/schema/usuarios';
import { motivosParada } from '@/lib/db/schema/motivos-parada';
import { ops } from '@/lib/db/schema/ops';
import { eq, desc, and, sql } from 'drizzle-orm';
import { z } from 'zod';

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
    const ativas = searchParams.get('ativas') === 'true';

    // Construir query com joins
    let query = db
      .select({
        id: paradasMaquina.id,
        maquinaId: paradasMaquina.maquinaId,
        operadorId: paradasMaquina.operadorId,
        motivoParadaId: paradasMaquina.motivoParadaId,
        observacoes: paradasMaquina.observacoes,
        dataInicio: paradasMaquina.dataInicio,
        dataFim: paradasMaquina.dataFim,
        opId: paradasMaquina.opId,
        createdAt: paradasMaquina.createdAt,
        updatedAt: paradasMaquina.updatedAt,
        
        maquina: {
          nome: maquinas.nome,
          codigo: maquinas.codigo,
        },
        operador: {
          nome: usuarios.nome,
          matricula: usuarios.matricula,
        },
        motivo: {
          descricao: motivosParada.descricao,
          codigo: motivosParada.codigo,
        },
        op: paradasMaquina.opId ? {
          op: ops.op,
          produto: ops.produto,
        } : null,
      })
      .from(paradasMaquina)
      .leftJoin(maquinas, eq(paradasMaquina.maquinaId, maquinas.id))
      .leftJoin(usuarios, eq(paradasMaquina.operadorId, usuarios.id))
      .leftJoin(motivosParada, eq(paradasMaquina.motivoParadaId, motivosParada.id))
      .leftJoin(ops, eq(paradasMaquina.opId, ops.op));

    // Filtrar apenas paradas ativas (dataFim IS NULL)
    if (ativas) {
      query = query.where(sql`${paradasMaquina.dataFim} IS NULL`);
    }

    const paradas = await query
      .orderBy(desc(paradasMaquina.dataInicio))
      .limit(limit)
      .offset(offset);

    // Contar total
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(paradasMaquina)
      .where(ativas ? sql`${paradasMaquina.dataFim} IS NULL` : undefined);

    const total = Number(totalResult[0]?.count || 0);

    return NextResponse.json({
      data: paradas,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error('Erro ao buscar paradas:', error);
    return NextResponse.json(
      { error: 'Erro interno ao buscar paradas' },
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
    
    // Validar dados
    const validated = insertParadaSchema.parse({
      ...body,
      dataInicio: new Date(body.dataInicio),
      dataFim: body.dataFim ? new Date(body.dataFim) : null,
    });

    // Inserir parada
    const [novaParada] = await db
      .insert(paradasMaquina)
      .values({
        ...validated,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Atualizar status da máquina para PARADA
    await db
      .update(maquinas)
      .set({ 
        status: 'PARADA',
        updatedAt: new Date() 
      })
      .where(eq(maquinas.id, validated.maquinaId));

    return NextResponse.json(novaParada, { status: 201 });

  } catch (error) {
    console.error('Erro ao criar parada:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', detalhes: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erro interno ao criar parada' },
      { status: 500 }
    );
  }
}