import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { motivosCancelamento } from '@/lib/db/schema/motivos-cancelamento';
import { z } from 'zod';
import { requireAuth } from '@/lib/api-auth';

const motivoSchema = z.object({
  codigo: z.string().min(1).max(10),
  descricao: z.string().min(3),
  ativo: z.boolean().optional().default(true),
});

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const allMotivos = await db.select().from(motivosCancelamento);
    return NextResponse.json(allMotivos);
  } catch {
    return NextResponse.json({ error: 'Erro interno ao buscar motivos' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const body = await request.json();
    const validated = motivoSchema.parse(body);
    const [newMotivo] = await db.insert(motivosCancelamento).values(validated).returning();
    return NextResponse.json(newMotivo, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos', detalhes: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Erro interno ao criar motivo' }, { status: 500 });
  }
}