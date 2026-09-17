// src/app/api/tipos-manutencao/[id]/route.ts
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { db } from '@/lib/db';
import { tiposManutencao } from '@/lib/db/schema/tipos-manutencao';
import { manutencoes } from '@/lib/db/schema/manutencoes';
import { agendamentosManutencao } from '@/lib/db/schema/agendamentos-manutencao';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const tipoSchema = z.object({
  codigo: z.string().min(1, 'Código é obrigatório').max(20),
  nome: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres').max(100),
  ativo: z.boolean(),
});

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth({ allowedNiveis: ['ADM', 'MANUTENCAO'] });
    if (auth.error) return auth.error;

    const tipo = await db.query.tiposManutencao.findFirst({
      where: eq(tiposManutencao.id, params.id),
    });

    if (!tipo) {
      return NextResponse.json(
        { error: 'Tipo de manutenção não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(tipo);
  } catch (error) {
    console.error('Erro ao buscar tipo de manutenção:', error);
    return NextResponse.json(
      { error: 'Erro interno ao buscar tipo de manutenção' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth({ requiredLevel: 'ADM' });
    if (auth.error) return auth.error;

    const body = await request.json();

    // Validar dados
    const validated = tipoSchema.parse(body);

    // Verificar se tipo existe
    const existing = await db.query.tiposManutencao.findFirst({
      where: eq(tiposManutencao.id, params.id),
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Tipo de manutenção não encontrado' },
        { status: 404 }
      );
    }

    // Se mudou o código, verificar se já existe
    if (validated.codigo !== existing.codigo) {
      const codigoExistente = await db.query.tiposManutencao.findFirst({
        where: eq(tiposManutencao.codigo, validated.codigo),
      });

      if (codigoExistente) {
        return NextResponse.json(
          { error: 'Código já cadastrado para outro tipo' },
          { status: 400 }
        );
      }
    }

    // Atualizar tipo
    const [updated] = await db
      .update(tiposManutencao)
      .set({
        codigo: validated.codigo,
        nome: validated.nome,
        ativo: validated.ativo,
        updatedAt: new Date(),
      })
      .where(eq(tiposManutencao.id, params.id))
      .returning();

    return NextResponse.json(updated);

  } catch (error) {
    console.error('Erro ao atualizar tipo de manutenção:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', detalhes: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erro interno ao atualizar tipo de manutenção' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth({ requiredLevel: 'ADM' });
    if (auth.error) return auth.error;

    // Verificar se tipo existe
    const existing = await db.query.tiposManutencao.findFirst({
      where: eq(tiposManutencao.id, params.id),
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Tipo de manutenção não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se está em uso em manutenções ou agendamentos
    const manutencaoComTipo = await db.query.manutencoes.findFirst({
      where: eq(manutencoes.tipoManutencaoId, params.id),
    });

    if (manutencaoComTipo) {
      return NextResponse.json(
        { error: 'Não é possível excluir tipo já utilizado em manutenções' },
        { status: 400 }
      );
    }

    const agendamentoComTipo = await db.query.agendamentosManutencao.findFirst({
      where: eq(agendamentosManutencao.tipoManutencaoId, params.id),
    });

    if (agendamentoComTipo) {
      return NextResponse.json(
        { error: 'Não é possível excluir tipo já utilizado em agendamentos' },
        { status: 400 }
      );
    }

    // Excluir tipo
    await db.delete(tiposManutencao).where(eq(tiposManutencao.id, params.id));

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Erro ao excluir tipo de manutenção:', error);
    return NextResponse.json(
      { error: 'Erro interno ao excluir tipo de manutenção' },
      { status: 500 }
    );
  }
}