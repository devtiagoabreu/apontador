import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { motivosCancelamento } from '@/lib/db/schema/motivos-cancelamento';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { requireAuth } from '@/lib/api-auth';

const updateMotivoSchema = z.object({
  codigo: z.string().min(1).max(10).optional(),
  descricao: z.string().min(3).optional(),
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
    const validated = updateMotivoSchema.parse(body);
    const [updated] = await db
      .update(motivosCancelamento)
      .set({ ...validated, updatedAt: new Date() })
      .where(eq(motivosCancelamento.id, params.id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos', detalhes: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Erro interno ao atualizar motivo' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth({ requiredLevel: 'ADM' });
    if (auth.error) return auth.error;

    await db.delete(motivosCancelamento).where(eq(motivosCancelamento.id, params.id));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Erro interno ao excluir motivo' }, { status: 500 });
  }
}