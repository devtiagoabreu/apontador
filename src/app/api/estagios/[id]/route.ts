import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { estagios } from '@/lib/db/schema/estagios';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const estagioSchema = z.object({
  codigo: z.string().length(2),
  nome: z.string().min(3).max(50),
  ordem: z.number().int().positive(),
  descricao: z.string().optional(),
  cor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  mostrarNoKanban: z.boolean(),
  ativo: z.boolean(),
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

    const estagio = await db.query.estagios.findFirst({
      where: eq(estagios.id, params.id),
    });

    if (!estagio) {
      return NextResponse.json(
        { error: 'Estágio não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(estagio);
  } catch (error) {
    console.error('Erro ao buscar estágio:', error);
    return NextResponse.json(
      { error: 'Erro interno ao buscar estágio' },
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
    const validated = estagioSchema.parse(body);

    const [updated] = await db
      .update(estagios)
      .set({
        ...validated,
        updatedAt: new Date(),
      })
      .where(eq(estagios.id, params.id))
      .returning();

    return NextResponse.json(updated);

  } catch (error) {
    console.error('Erro ao atualizar estágio:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', detalhes: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erro interno ao atualizar estágio' },
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

    await db.delete(estagios).where(eq(estagios.id, params.id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir estágio:', error);
    return NextResponse.json(
      { error: 'Erro interno ao excluir estágio' },
      { status: 500 }
    );
  }
}