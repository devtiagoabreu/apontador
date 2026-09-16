import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { maquinas } from '@/lib/db/schema/maquinas';
import { maquinaSetor } from '@/lib/db/schema/maquina-setor';
import { setores } from '@/lib/db/schema/setores';
import { estagios } from '@/lib/db/schema/estagios';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { requireAuth } from '@/lib/api-auth';

export async function GET(request: Request) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const estagioId = searchParams.get('estagioId');

    if (!estagioId) {
      return NextResponse.json(
        { error: 'ID do estágio é obrigatório' },
        { status: 400 }
      );
    }

    const estagio = await db.query.estagios.findFirst({
      where: eq(estagios.id, estagioId),
    });

    if (!estagio) {
      return NextResponse.json(
        { error: 'Estágio não encontrado' },
        { status: 404 }
      );
    }

    const setoresDoEstagio = await db
      .select({ id: setores.id })
      .from(setores)
      .where(sql`LOWER(${setores.nome}) LIKE LOWER(${'%' + estagio.nome + '%'})`);

    if (setoresDoEstagio.length === 0) {
      return NextResponse.json([]);
    }

    const setorIds = setoresDoEstagio.map(s => s.id);

    const maquinasDisponiveis = await db
      .selectDistinct({
        id: maquinas.id,
        nome: maquinas.nome,
        codigo: maquinas.codigo,
        status: maquinas.status,
      })
      .from(maquinas)
      .innerJoin(maquinaSetor, eq(maquinas.id, maquinaSetor.maquinaId))
      .where(
        and(
          eq(maquinas.status, 'DISPONIVEL'),
          inArray(maquinaSetor.setorId, setorIds)
        )
      );

    return NextResponse.json(maquinasDisponiveis);
  } catch {
    return NextResponse.json(
      { error: 'Erro interno ao buscar máquinas' },
      { status: 500 }
    );
  }
}