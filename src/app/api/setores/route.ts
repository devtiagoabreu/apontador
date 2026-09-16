import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { setores } from '@/lib/db/schema/setores';
import { areas } from '@/lib/db/schema/areas';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { requireAuth } from '@/lib/api-auth';

const setorSchema = z.object({
  nome: z.string().min(1),
  areaId: z.string().uuid(),
  descricao: z.string().optional().nullable(),
  ativo: z.boolean().optional().default(true),
});

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

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
  } catch {
    return NextResponse.json({ error: 'Erro interno ao buscar setores' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const body = await request.json();
    const validated = setorSchema.parse(body);
    const [newSetor] = await db.insert(setores).values(validated).returning();
    return NextResponse.json(newSetor, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos', detalhes: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Erro interno ao criar setor' }, { status: 500 });
  }
}