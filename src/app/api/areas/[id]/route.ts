import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { areas } from '@/lib/db/schema/areas';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { requireAuth } from '@/lib/api-auth';

const updateAreaSchema = z.object({
  nome: z.string().min(1).optional(),
  descricao: z.string().optional().nullable(),
  ativo: z.boolean().optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const body = await request.json();
    const validated = updateAreaSchema.parse(body);
    const [updated] = await db
      .update(areas)
      .set({ ...validated, updatedAt: new Date() })
      .where(eq(areas.id, params.id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos', detalhes: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Erro interno ao atualizar área' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth({ requiredLevel: 'ADM' });
    if (auth.error) return auth.error;

    await db.delete(areas).where(eq(areas.id, params.id));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Erro interno ao excluir área' }, { status: 500 });
  }
}