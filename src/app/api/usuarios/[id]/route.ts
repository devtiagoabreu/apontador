import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { usuarios } from '@/lib/db/schema/usuarios';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { requireAuth } from '@/lib/api-auth';

const updateUserSchema = z.object({
  nome: z.string().min(1).optional(),
  matricula: z.string().min(1).optional(),
  nivel: z.enum(['OPERADOR', 'ADM', 'MANUTENCAO']).optional(),
  ativo: z.boolean().optional(),
  senha: z.string().min(4).optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth({ requiredLevel: 'ADM' });
    if (auth.error) return auth.error;

    const body = await request.json();
    const validated = updateUserSchema.parse(body);

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (validated.nome !== undefined) updateData.nome = validated.nome;
    if (validated.matricula !== undefined) updateData.matricula = validated.matricula;
    if (validated.nivel !== undefined) updateData.nivel = validated.nivel;
    if (validated.ativo !== undefined) updateData.ativo = validated.ativo;
    if (validated.senha) updateData.senha = await bcrypt.hash(validated.senha, 10);

    const [updated] = await db
      .update(usuarios)
      .set(updateData)
      .where(eq(usuarios.id, params.id))
      .returning({
        id: usuarios.id,
        nome: usuarios.nome,
        matricula: usuarios.matricula,
        nivel: usuarios.nivel,
        ativo: usuarios.ativo,
      });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', detalhes: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Erro interno ao atualizar usuário' },
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

    const sessionUser = auth.session as unknown as { user: { id: string } };
    if (sessionUser.user.id === params.id) {
      return NextResponse.json(
        { error: 'Não é possível excluir seu próprio usuário' },
        { status: 400 }
      );
    }

    await db.delete(usuarios).where(eq(usuarios.id, params.id));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Erro interno ao excluir usuário' },
      { status: 500 }
    );
  }
}