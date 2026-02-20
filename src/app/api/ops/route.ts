import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ops } from '@/lib/db/schema/ops';
import { desc, sql } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Buscar OPs com paginação
    const allOps = await db.select()
      .from(ops)
      .orderBy(desc(ops.dataImportacao))
      .limit(limit)
      .offset(offset);

    // Contar total de OPs - CORRIGIDO
    const totalResult = await db.execute(sql`SELECT COUNT(*) as count FROM ops`);
    
    // Forma 1: Cast seguro
    const total = parseInt(String(totalResult.rows[0]?.count || '0'));
    
    // Forma 2: Se preferir mais explícito
    // const row = totalResult.rows[0] as { count: string };
    // const total = parseInt(row.count);

    console.log(`API retornando ${allOps.length} OPs de ${total} total`);

    return NextResponse.json({
      data: allOps,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao buscar OPs:', error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}