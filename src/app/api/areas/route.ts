import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { areas } from '@/lib/db/schema/areas';
import { z } from 'zod';
import { requireAuth } from '@/lib/api-auth';

const areaSchema = z.object({
  nome: z.string().min(1),
  descricao: z.string().optional().nullable(),
  ativo: z.boolean().optional().default(true),
});

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const allAreas = await db.select().from(areas).orderBy(areas.nome);
    return NextResponse.json(allAreas);
  } catch {
    return NextResponse.json({ error: 'Erro interno ao buscar áreas' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const body = await request.json();
    const validated = areaSchema.parse(body);
    const [newArea] = await db.insert(areas).values(validated).returning();
    return NextResponse.json(newArea, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos', detalhes: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Erro interno ao criar área' }, { status: 500 });
  }
}