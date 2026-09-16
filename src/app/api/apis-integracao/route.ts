export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apisIntegracao } from '@/lib/db/schema/apis-integracao';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/api-auth';

export async function GET(request: Request) {
  try {
    const auth = await requireAuth({ requiredLevel: 'ADM' });
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const sistemaId = searchParams.get('sistema_id');

    let apis;
    if (sistemaId) {
      apis = await db.select().from(apisIntegracao).where(eq(apisIntegracao.sistemaId, sistemaId));
    } else {
      apis = await db.select().from(apisIntegracao);
    }

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
    const auth = await requireAuth({ requiredLevel: 'ADM' });
    if (auth.error) return auth.error;

    const { sistemaId, nome, apiUrl, metodo, ativa } = await request.json();

    if (!sistemaId || !nome || !apiUrl) {
      return NextResponse.json({ erro: 'sistemaId, nome e apiUrl são obrigatórios' }, { status: 400 });
    }

    const [novo] = await db
      .insert(apisIntegracao)
      .values({
        sistemaId,
        nome,
        apiUrl,
        metodo: metodo || 'GET',
        ativa: ativa ?? true,
      })
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
    const auth = await requireAuth({ requiredLevel: 'ADM' });
    if (auth.error) return auth.error;

    const { id, nome, apiUrl, metodo, ativa } = await request.json();

    if (!id) {
      return NextResponse.json({ erro: 'ID é obrigatório' }, { status: 400 });
    }

    const [atualizado] = await db
      .update(apisIntegracao)
      .set({ nome, apiUrl, metodo, ativa })
      .where(eq(apisIntegracao.id, id))
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
    const auth = await requireAuth({ requiredLevel: 'ADM' });
    if (auth.error) return auth.error;

    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ erro: 'ID é obrigatório' }, { status: 400 });
    }

    await db.delete(apisIntegracao).where(eq(apisIntegracao.id, id));

    return NextResponse.json({ sucesso: true });
  } catch (error) {
    return NextResponse.json(
      { erro: error instanceof Error ? error.message : 'Erro ao excluir' },
      { status: 500 }
    );
  }
}
