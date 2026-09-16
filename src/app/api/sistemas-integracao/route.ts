export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sistemasIntegracao } from '@/lib/db/schema/sistemas-integracao';
import { apisIntegracao } from '@/lib/db/schema/apis-integracao';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/api-auth';

export async function GET() {
  try {
    const auth = await requireAuth({ requiredLevel: 'ADM' });
    if (auth.error) return auth.error;

    const sistemas = await db.select().from(sistemasIntegracao);
    const apis = await db.select().from(apisIntegracao);

    const result = sistemas.map((s) => {
      const { clientSecret, ...rest } = s;
      return {
        ...rest,
        hasSecret: !!clientSecret,
        clientSecret: clientSecret ? `••••${clientSecret.slice(-4)}` : null,
        apis: apis.filter((a) => a.sistemaId === s.id),
      };
    });

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { erro: 'Erro ao buscar sistemas' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth({ requiredLevel: 'ADM' });
    if (auth.error) return auth.error;

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
  } catch {
    return NextResponse.json(
      { erro: 'Erro ao criar sistema' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await requireAuth({ requiredLevel: 'ADM' });
    if (auth.error) return auth.error;

    const { id, nome, tokenUrl, clientId, clientSecret, ativa } = await request.json();

    if (!id) {
      return NextResponse.json({ erro: 'ID é obrigatório' }, { status: 400 });
    }

    const updateData: Partial<typeof sistemasIntegracao.$inferSelect> = { nome, tokenUrl, clientId, ativa };
    if (typeof clientSecret === 'string' && clientSecret.trim() !== '' && !clientSecret.startsWith('••••')) {
      updateData.clientSecret = clientSecret.trim();
    }

    const [atualizado] = await db
      .update(sistemasIntegracao)
      .set(updateData)
      .where(eq(sistemasIntegracao.id, id))
      .returning();

    return NextResponse.json(atualizado);
  } catch {
    return NextResponse.json(
      { erro: 'Erro ao atualizar' },
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

    // Excluir APIs vinculadas primeiro
    await db.delete(apisIntegracao).where(eq(apisIntegracao.sistemaId, id));
    await db.delete(sistemasIntegracao).where(eq(sistemasIntegracao.id, id));

    return NextResponse.json({ sucesso: true });
  } catch {
    return NextResponse.json(
      { erro: 'Erro ao excluir' },
      { status: 500 }
    );
  }
}
