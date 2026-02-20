import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { setores } from '@/lib/db/schema/setores';
import { eq } from 'drizzle-orm';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const [updated] = await db
      .update(setores)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(setores.id, params.id))
      .returning();
    
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await db.delete(setores).where(eq(setores.id, params.id));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}