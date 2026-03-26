// src/app/api/producoes-avulsas/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { producoesAvulsas } from '@/lib/db/schema/producoes-avulsas';
import { maquinas } from '@/lib/db/schema/maquinas';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';

const iniciarAvulsoSchema = z.object({
  maquinaId: z.string().uuid(),
  produtoId: z.string().uuid(),
  estagioId: z.string().uuid(),
});

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    const result = await db.execute(sql`
      SELECT pa.id, pa.status, pa.data_inicio, pa.metragem, p.codigo as produto_codigo,
             m.nome as maquina_nome, ui.nome as operador_inicio_nome, e.nome as estagio_nome
      FROM producoes_avulsas pa
      JOIN produtos p ON pa.produto_id = p.id
      JOIN maquinas m ON pa.maquina_id = m.id
      JOIN usuarios ui ON pa.operador_inicio_id = ui.id
      JOIN estagios e ON pa.estagio_id = e.id
      ORDER BY pa.data_inicio DESC LIMIT ${limit} OFFSET ${offset}
    `);

    const totalRes = await db.execute(sql`SELECT COUNT(*) as count FROM producoes_avulsas`);
    // Correção TS(2339) para acesso ao índice do array
    const total = parseInt(String((totalRes.rows as any)?.count || '0'));

    return NextResponse.json({
      data: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao listar' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await request.json();
    const validated = iniciarAvulsoSchema.parse(body);

    const result = await db.transaction(async (tx) => {
      const [nova] = await tx.insert(producoesAvulsas).values({
        ...validated,
        operadorInicioId: session.user.id,
        status: 'EM_ANDAMENTO',
      }).returning();

      await tx.update(maquinas).set({ status: 'EM_PROCESSO' }).where(eq(maquinas.id, validated.maquinaId));
      return nova;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao iniciar' }, { status: 500 });
  }
}