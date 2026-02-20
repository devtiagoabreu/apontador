import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { motivosParada } from '@/lib/db/schema/motivos-parada';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const motivos = await db
      .select()
      .from(motivosParada)
      .where(eq(motivosParada.ativo, true))
      .orderBy(motivosParada.codigo);
    
    return NextResponse.json(motivos);
  } catch (error) {
    console.error('Erro ao buscar motivos de parada:', error);
    return NextResponse.json(
      { error: 'Erro interno ao buscar motivos' },
      { status: 500 }
    );
  }
}