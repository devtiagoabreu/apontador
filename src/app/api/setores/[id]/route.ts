import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { setores } from '@/lib/db/schema/setores';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { requireAuth } from '@/lib/api-auth';

const updateSetorSchema = z.object({
  nome: z.string().min(1).optional(),
  areaId: z.string().uuid().optional(),
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
    const validated = updateSetorSchema.parse(body);
    const [updated] = await db
      .update(setores)
      .set({ ...validated, updatedAt: new Date() })
      .where(eq(setores.id, params.id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos', detalhes: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Erro interno ao atualizar setor' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth({ requiredLevel: 'ADM' });
    if (auth.error) return auth.error;

    await db.delete(setores).where(eq(setores.id, params.id));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Erro interno ao excluir setor' }, { status: 500 });
  }
}