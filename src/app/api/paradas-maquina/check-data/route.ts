export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Buscar máquinas
    const maquinas = await db.execute(sql`
      SELECT id, nome, codigo, status FROM maquinas LIMIT 5
    `);

    // Buscar operadores
    const operadores = await db.execute(sql`
      SELECT id, nome, matricula FROM usuarios WHERE nivel = 'OPERADOR' LIMIT 5
    `);

    // Buscar motivos de parada
    const motivos = await db.execute(sql`
      SELECT id, codigo, descricao FROM motivos_parada WHERE ativo = true LIMIT 5
    `);

    return NextResponse.json({
      maquinas: maquinas.rows,
      operadores: operadores.rows,
      motivos: motivos.rows,
      counts: {
        maquinas: maquinas.rows.length,
        operadores: operadores.rows.length,
        motivos: motivos.rows.length
      }
    });

  } catch (error) {
    console.error('Erro:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}