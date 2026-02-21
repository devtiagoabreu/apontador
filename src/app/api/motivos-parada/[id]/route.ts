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
  ativo: z.boolean(),
});

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const motivo = await db.query.motivosParada.findFirst({
      where: eq(motivosParada.id, params.id),
    });

    if (!motivo) {
      return NextResponse.json(
        { error: 'Motivo não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(motivo);
  } catch (error) {
    console.error('Erro ao buscar motivo:', error);
    return NextResponse.json(
      { error: 'Erro interno ao buscar motivo' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    
    // Validar dados
    const validated = motivoSchema.parse(body);

    // Verificar se motivo existe
    const existing = await db.query.motivosParada.findFirst({
      where: eq(motivosParada.id, params.id),
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Motivo não encontrado' },
        { status: 404 }
      );
    }

    // Se mudou o código, verificar se já existe
    if (validated.codigo !== existing.codigo) {
      const codigoExistente = await db.query.motivosParada.findFirst({
        where: eq(motivosParada.codigo, validated.codigo),
      });

      if (codigoExistente) {
        return NextResponse.json(
          { error: 'Código já cadastrado para outro motivo' },
          { status: 400 }
        );
      }
    }

    // Atualizar motivo
    const [updated] = await db
      .update(motivosParada)
      .set({
        codigo: validated.codigo,
        descricao: validated.descricao,
        ativo: validated.ativo,
        updatedAt: new Date(),
      })
      .where(eq(motivosParada.id, params.id))
      .returning();

    return NextResponse.json(updated);

  } catch (error) {
    console.error('Erro ao atualizar motivo:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', detalhes: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erro interno ao atualizar motivo' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Verificar se motivo existe
    const existing = await db.query.motivosParada.findFirst({
      where: eq(motivosParada.id, params.id),
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Motivo não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se motivo está sendo usado em apontamentos
    const apontamentosComMotivo = await db.query.apontamentos.findFirst({
      where: eq(motivosParada.id, params.id),
    });

    if (apontamentosComMotivo) {
      return NextResponse.json(
        { error: 'Não é possível excluir motivo que já foi utilizado em paradas' },
        { status: 400 }
      );
    }

    // Excluir motivo
    await db.delete(motivosParada).where(eq(motivosParada.id, params.id));

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Erro ao excluir motivo:', error);
    return NextResponse.json(
      { error: 'Erro interno ao excluir motivo' },
      { status: 500 }
    );
  }
}