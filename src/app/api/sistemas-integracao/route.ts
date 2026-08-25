export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sistemasIntegracao } from '@/lib/db/schema/sistemas-integracao';
import { apisIntegracao } from '@/lib/db/schema/apis-integracao';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const sistemas = await db.select().from(sistemasIntegracao);
    const apis = await db.select().from(apisIntegracao);

    const result = sistemas.map((s) => ({
      ...s,
      apis: apis.filter((a) => a.sistemaId === s.id),
    }));

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { erro: error instanceof Error ? error.message : 'Erro ao buscar sistemas' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { nome, tokenUrl, clientId, clientSecret, ativa } = await request.json();

    if (!nome) {
      return NextResponse.json({ erro: 'Nome é obrigatório' }, { status: 400 });
    }

    const [novo] = await db
      .insert(sistemasIntegracao)
      .values({
        nome,
        tokenUrl: tokenUrl || null,
        clientId: clientId || null,
        clientSecret: clientSecret || null,
        ativa: ativa ?? true,
      })
      .returning();

    return NextResponse.json(novo, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { erro: error instanceof Error ? error.message : 'Erro ao criar sistema' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { id, nome, tokenUrl, clientId, clientSecret, ativa } = await request.json();

    if (!id) {
      return NextResponse.json({ erro: 'ID é obrigatório' }, { status: 400 });
    }

    const [atualizado] = await db
      .update(sistemasIntegracao)
      .set({ nome, tokenUrl, clientId, clientSecret, ativa })
      .where(eq(sistemasIntegracao.id, id))
      .returning();

    return NextResponse.json(atualizado);
  } catch (error) {
    return NextResponse.json(
      { erro: error instanceof Error ? error.message : 'Erro ao atualizar' },
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

    // Excluir APIs vinculadas primeiro
    await db.delete(apisIntegracao).where(eq(apisIntegracao.sistemaId, id));
    await db.delete(sistemasIntegracao).where(eq(sistemasIntegracao.id, id));

    return NextResponse.json({ sucesso: true });
  } catch (error) {
    return NextResponse.json(
      { erro: error instanceof Error ? error.message : 'Erro ao excluir' },
      { status: 500 }
    );
  }
}
