import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { estagios } from '@/lib/db/schema/estagios';
import { eq, desc, and } from 'drizzle-orm';
import { z } from 'zod';

const estagioSchema = z.object({
  codigo: z.string().length(2, 'Código deve ter 2 caracteres'),
  nome: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres').max(50),
  ordem: z.coerce.number().int().positive('Ordem deve ser um número positivo'),
  descricao: z.string().optional(),
  cor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve estar no formato HEX').default('#3b82f6'),
  mostrarNoKanban: z.boolean().default(true),
  ativo: z.boolean().default(true),
});

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const apenasKanban = searchParams.get('kanban') === 'true';
    const ativos = searchParams.get('ativos') === 'true';

    // Construir a query de forma diferente para evitar problemas de tipo
    let conditions = [];
    
    if (ativos) {
      conditions.push(eq(estagios.ativo, true));
    }

    if (apenasKanban) {
      conditions.push(eq(estagios.mostrarNoKanban, true));
      conditions.push(eq(estagios.ativo, true));
    }

    let query = db.select().from(estagios);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const allEstagios = await query.orderBy(estagios.ordem);
    return NextResponse.json(allEstagios);
  } catch (error) {
    console.error('Erro ao buscar estágios:', error);
    return NextResponse.json(
      { error: 'Erro interno ao buscar estágios' },
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
    const validated = estagioSchema.parse(body);

    // Verificar se código já existe
    const existing = await db.query.estagios.findFirst({
      where: eq(estagios.codigo, validated.codigo),
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Código já cadastrado' },
        { status: 400 }
      );
    }

    const [newEstagio] = await db
      .insert(estagios)
      .values({
        ...validated,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json(newEstagio, { status: 201 });

  } catch (error) {
    console.error('Erro ao criar estágio:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', detalhes: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erro interno ao criar estágio' },
      { status: 500 }
    );
  }
}