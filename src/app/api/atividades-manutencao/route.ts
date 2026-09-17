// src/app/api/atividades-manutencao/route.ts
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { db } from '@/lib/db';
import { atividadesManutencao } from '@/lib/db/schema/atividades-manutencao';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const atividadeSchema = z.object({
  codigo: z.string().min(1, 'Código é obrigatório').max(20),
  nome: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres').max(100),
  ativo: z.boolean().default(true),
});

// GET: catálogo é lido pelo dashboard (ADM) e pelo mobile de manutenção (MANUTENCAO)
export async function GET() {
  try {
    const auth = await requireAuth({ allowedNiveis: ['ADM', 'MANUTENCAO'] });
    if (auth.error) return auth.error;

    const atividades = await db
      .select()
      .from(atividadesManutencao)
      .orderBy(atividadesManutencao.codigo);

    return NextResponse.json(atividades);
  } catch (error) {
    console.error('Erro ao buscar atividades de manutenção:', error);
    return NextResponse.json(
      { error: 'Erro interno ao buscar atividades de manutenção' },
      { status: 500 }
    );
  }
}

// POST: criação exclusiva do dashboard (ADM)
export async function POST(request: Request) {
  try {
    const auth = await requireAuth({ requiredLevel: 'ADM' });
    if (auth.error) return auth.error;

    const body = await request.json();

    // Validar dados
    const validated = atividadeSchema.parse(body);

    // Verificar se código já existe
    const existing = await db.query.atividadesManutencao.findFirst({
      where: eq(atividadesManutencao.codigo, validated.codigo),
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Código já cadastrado' },
        { status: 400 }
      );
    }

    // Inserir atividade
    const [newAtividade] = await db
      .insert(atividadesManutencao)
      .values({
        codigo: validated.codigo,
        nome: validated.nome,
        ativo: validated.ativo,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json(newAtividade, { status: 201 });

  } catch (error) {
    console.error('Erro ao criar atividade de manutenção:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', detalhes: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erro interno ao criar atividade de manutenção' },
      { status: 500 }
    );
  }
}