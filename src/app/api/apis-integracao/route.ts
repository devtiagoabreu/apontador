export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apisIntegracao } from '@/lib/db/schema/apis-integracao';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const apis = await db.select().from(apisIntegracao);
    return NextResponse.json(apis);
  } catch (error) {
    return NextResponse.json(
      { erro: error instanceof Error ? error.message : 'Erro ao buscar APIs' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { nome, apiUrl, ativa } = await request.json();

    if (!nome || !apiUrl) {
      return NextResponse.json(
        { erro: 'Nome e URL são obrigatórios' },
        { status: 400 }
      );
    }

    const [novo] = await db
      .insert(apisIntegracao)
      .values({ nome, apiUrl, ativa: ativa ?? true })
      .returning();

    return NextResponse.json(novo, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { erro: error instanceof Error ? error.message : 'Erro ao criar API' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { id, nome, apiUrl, ativa } = await request.json();

    if (!id) {
      return NextResponse.json({ erro: 'ID é obrigatório' }, { status: 400 });
    }

    const [atualizado] = await db
      .update(apisIntegracao)
      .set({ nome, apiUrl, ativa })
      .where(eq(apisIntegracao.id, id))
      .returning();

    return NextResponse.json(atualizado);
  } catch (error) {
    return NextResponse.json(
      { erro: error instanceof Error ? error.message : 'Erro ao atualizar API' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ erro: 'ID é obrigatório' }, { status: 400 });
    }

    await db.delete(apisIntegracao).where(eq(apisIntegracao.id, id));

    return NextResponse.json({ sucesso: true });
  } catch (error) {
    return NextResponse.json(
      { erro: error instanceof Error ? error.message : 'Erro ao excluir API' },
      { status: 500 }
    );
  }
}
