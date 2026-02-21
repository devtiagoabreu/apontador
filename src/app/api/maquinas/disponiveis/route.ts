import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { maquinas } from '@/lib/db/schema/maquinas';
import { maquinaSetor } from '@/lib/db/schema/maquina-setor';
import { setores } from '@/lib/db/schema/setores';
import { estagios } from '@/lib/db/schema/estagios';
import { eq, and, sql } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const estagioId = searchParams.get('estagioId');

    if (!estagioId) {
      return NextResponse.json(
        { error: 'ID do estágio é obrigatório' },
        { status: 400 }
      );
    }

    // Buscar o estágio para saber qual setor
    const estagio = await db.query.estagios.findFirst({
      where: eq(estagios.id, estagioId),
    });

    if (!estagio) {
      return NextResponse.json(
        { error: 'Estágio não encontrado' },
        { status: 404 }
      );
    }

    // Buscar setores que correspondem a este estágio
    // (considerando que o nome do estágio pode estar relacionado ao setor)
    const setoresDoEstagio = await db
      .select({ id: setores.id })
      .from(setores)
      .where(sql`LOWER(${setores.nome}) LIKE LOWER(${`%${estagio.nome}%`})`);

    if (setoresDoEstagio.length === 0) {
      return NextResponse.json([]);
    }

    // Buscar máquinas disponíveis nestes setores
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
          sql`${maquinaSetor.setorId} IN (${setoresDoEstagio.map(s => s.id).join(',')})`
        )
      );

    return NextResponse.json(maquinasDisponiveis);
  } catch (error) {
    console.error('Erro ao buscar máquinas disponíveis:', error);
    return NextResponse.json(
      { error: 'Erro interno ao buscar máquinas' },
      { status: 500 }
    );
  }
}