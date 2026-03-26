// src/app/api/producoes-avulsas/[id]/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { producoesAvulsas } from '@/lib/db/schema/producoes-avulsas';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    // Busca detalhada com joins para exibir nome do produto e máquina
    const result = await db.execute(sql`
      SELECT 
        pa.*,
        p.codigo as produto_codigo,
        p.nome as produto_nome,
        p.um as produto_um,
        m.nome as maquina_nome,
        m.codigo as maquina_codigo,
        e.nome as estagio_nome
      FROM producoes_avulsas pa
      LEFT JOIN produtos p ON pa.produto_id = p.id
      LEFT JOIN maquinas m ON pa.maquina_id = m.id
      LEFT JOIN estagios e ON pa.estagio_id = e.id
      WHERE pa.id = ${params.id}
    `);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Registro não encontrado' }, { status: 404 });
    }

    return NextResponse.json(result.rows);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar produção avulsa' }, { status: 500 });
  }
}
