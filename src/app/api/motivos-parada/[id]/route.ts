import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { motivosParada } from '@/lib/db/schema/motivos-parada';
import { eq } from 'drizzle-orm';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const [updated] = await db
      .update(motivosParada)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(motivosParada.id, params.id))
      .returning();
    
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Erro ao atualizar motivo:', error);
    return NextResponse.json(
      { error: 'Erro interno ao atualizar motivo' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await db.delete(motivosParada).where(eq(motivosParada.id, params.id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir motivo:', error);
    return NextResponse.json(
      { error: 'Erro interno ao excluir motivo' },
      { status: 500 }
    );
  }
}