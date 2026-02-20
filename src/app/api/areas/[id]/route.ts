import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { areas } from '@/lib/db/schema/areas';
import { eq } from 'drizzle-orm';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const [updated] = await db
      .update(areas)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(areas.id, params.id))
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
    await db.delete(areas).where(eq(areas.id, params.id));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}