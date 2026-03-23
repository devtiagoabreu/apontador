import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { ops } from '@/lib/db/schema/ops';
import { sql, and, or, ilike } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    if (!query.trim()) {
      return NextResponse.json([]);
    }

    // ✅ Usando operadores do Drizzle
    const results = await db
      .select()
      .from(ops)
      .where(
        and(
          sql`${ops.status} NOT IN ('FINALIZADA', 'CANCELADA')`,
          or(
            sql`${ops.op}::text ILIKE ${`%${query}%`}`,
            sql`${ops.produto} ILIKE ${`%${query}%`}`
          )
        )
      )
      .limit(10);

    return NextResponse.json(results);
  } catch (error) {
    console.error('Erro ao buscar OPs:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar OPs' },
      { status: 500 }
    );
  }
}