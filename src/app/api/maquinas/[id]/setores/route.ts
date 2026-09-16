// src/app/api/maquinas/[id]/setores/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { maquinaSetor } from '@/lib/db/schema/maquina-setor';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/api-auth';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const setores = await db
      .select()
      .from(maquinaSetor)
      .where(eq(maquinaSetor.maquinaId, params.id));
    
    return NextResponse.json(setores);
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno ao buscar setores' }, { status: 500 });
  }
}