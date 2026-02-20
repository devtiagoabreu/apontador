import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { maquinaSetor } from '@/lib/db/schema/maquina-setor';
import { eq } from 'drizzle-orm';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const setores = await db
      .select()
      .from(maquinaSetor)
      .where(eq(maquinaSetor.maquinaId, params.id));
    
    return NextResponse.json(setores);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}