// src/app/api/atividades-manutencao/[id]/route.ts
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { db } from '@/lib/db';
import { atividadesManutencao } from '@/lib/db/schema/atividades-manutencao';
import { manutencoes } from '@/lib/db/schema/manutencoes';
import { agendamentosManutencao } from '@/lib/db/schema/agendamentos-manutencao';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const atividadeSchema = z.object({
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

    const atividade = await db.query.atividadesManutencao.findFirst({
      where: eq(atividadesManutencao.id, params.id),
    });

    if (!atividade) {
      return NextResponse.json(
        { error: 'Atividade de manutenção não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(atividade);
  } catch (error) {
    console.error('Erro ao buscar atividade de manutenção:', error);
    return NextResponse.json(
      { error: 'Erro interno ao buscar atividade de manutenção' },
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
    const validated = atividadeSchema.parse(body);

    // Verificar se atividade existe
    const existing = await db.query.atividadesManutencao.findFirst({
      where: eq(atividadesManutencao.id, params.id),
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Atividade de manutenção não encontrada' },
        { status: 404 }
      );
    }

    // Se mudou o código, verificar se já existe
    if (validated.codigo !== existing.codigo) {
      const codigoExistente = await db.query.atividadesManutencao.findFirst({
        where: eq(atividadesManutencao.codigo, validated.codigo),
      });

      if (codigoExistente) {
        return NextResponse.json(
          { error: 'Código já cadastrado para outra atividade' },
          { status: 400 }
        );
      }
    }

    // Atualizar atividade
    const [updated] = await db
      .update(atividadesManutencao)
      .set({
        codigo: validated.codigo,
        nome: validated.nome,
        ativo: validated.ativo,
        updatedAt: new Date(),
      })
      .where(eq(atividadesManutencao.id, params.id))
      .returning();

    return NextResponse.json(updated);

  } catch (error) {
    console.error('Erro ao atualizar atividade de manutenção:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', detalhes: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erro interno ao atualizar atividade de manutenção' },
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

    // Verificar se atividade existe
    const existing = await db.query.atividadesManutencao.findFirst({
      where: eq(atividadesManutencao.id, params.id),
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Atividade de manutenção não encontrada' },
        { status: 404 }
      );
    }

    // Verificar se está em uso em manutenções ou agendamentos
    const manutencaoComAtividade = await db.query.manutencoes.findFirst({
      where: eq(manutencoes.atividadeManutencaoId, params.id),
    });

    if (manutencaoComAtividade) {
      return NextResponse.json(
        { error: 'Não é possível excluir atividade já utilizada em manutenções' },
        { status: 400 }
      );
    }

    const agendamentoComAtividade = await db.query.agendamentosManutencao.findFirst({
      where: eq(agendamentosManutencao.atividadeManutencaoId, params.id),
    });

    if (agendamentoComAtividade) {
      return NextResponse.json(
        { error: 'Não é possível excluir atividade já utilizada em agendamentos' },
        { status: 400 }
      );
    }

    // Excluir atividade
    await db.delete(atividadesManutencao).where(eq(atividadesManutencao.id, params.id));

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Erro ao excluir atividade de manutenção:', error);
    return NextResponse.json(
      { error: 'Erro interno ao excluir atividade de manutenção' },
      { status: 500 }
    );
  }
}