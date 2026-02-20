import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { setores } from '@/lib/db/schema/setores';
import { areas } from '@/lib/db/schema/areas';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const allSetores = await db
      .select({
        id: setores.id,
        nome: setores.nome,
        areaId: setores.areaId,
        areaNome: areas.nome,
        descricao: setores.descricao,
        ativo: setores.ativo,
        createdAt: setores.createdAt,
        updatedAt: setores.updatedAt,
      })
      .from(setores)
      .leftJoin(areas, eq(setores.areaId, areas.id))
      .orderBy(setores.nome);
    
    return NextResponse.json(allSetores);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const [newSetor] = await db.insert(setores).values(body).returning();
    return NextResponse.json(newSetor);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}