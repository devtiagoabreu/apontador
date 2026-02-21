import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { motivosParada } from '@/lib/db/schema/motivos-parada';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const motivoSchema = z.object({
  codigo: z.string().min(1, 'Código é obrigatório'),
  descricao: z.string().min(3, 'Descrição deve ter no mínimo 3 caracteres'),
  ativo: z.boolean().default(true),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const motivos = await db
      .select()
      .from(motivosParada)
      .orderBy(motivosParada.codigo);

    return NextResponse.json(motivos);
  } catch (error) {
    console.error('Erro ao buscar motivos:', error);
    return NextResponse.json(
      { error: 'Erro interno ao buscar motivos' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    
    // Validar dados
    const validated = motivoSchema.parse(body);

    // Verificar se código já existe
    const existing = await db.query.motivosParada.findFirst({
      where: eq(motivosParada.codigo, validated.codigo),
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Código já cadastrado' },
        { status: 400 }
      );
    }

    // Inserir motivo
    const [newMotivo] = await db
      .insert(motivosParada)
      .values({
        codigo: validated.codigo,
        descricao: validated.descricao,
        ativo: validated.ativo,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json(newMotivo, { status: 201 });

  } catch (error) {
    console.error('Erro ao criar motivo:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', detalhes: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erro interno ao criar motivo' },
      { status: 500 }
    );
  }
}