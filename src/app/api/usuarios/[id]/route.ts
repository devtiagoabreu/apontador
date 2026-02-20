import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { usuarios } from '@/lib/db/schema/usuarios';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    
    // Se tiver senha, fazer hash
    if (body.senha) {
      body.senha = await bcrypt.hash(body.senha, 10);
    } else {
      delete body.senha; // Não atualizar senha se não foi fornecida
    }

    const [updated] = await db
      .update(usuarios)
      .set({ ...body, updatedAt: new Date() })
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
    console.error('Erro ao atualizar usuário:', error);
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
    await db.delete(usuarios).where(eq(usuarios.id, params.id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    return NextResponse.json(
      { error: 'Erro interno ao excluir usuário' },
      { status: 500 }
    );
  }
}