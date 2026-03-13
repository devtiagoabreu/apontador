// src/app/api/maquinas/[id]/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { maquinas } from '@/lib/db/schema/maquinas';
import { maquinaSetor } from '@/lib/db/schema/maquina-setor';
import { setores } from '@/lib/db/schema/setores';
import { eq } from 'drizzle-orm';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    console.log('🔍 Buscando máquina com ID:', params.id);

    // Buscar máquina
    const maquina = await db.query.maquinas.findFirst({
      where: eq(maquinas.id, params.id),
    });

    if (!maquina) {
      console.log('❌ Máquina não encontrada:', params.id);
      return NextResponse.json(
        { error: 'Máquina não encontrada' },
        { status: 404 }
      );
    }

    console.log('✅ Máquina encontrada:', maquina);

    // Buscar setores da máquina
    const setoresDaMaquina = await db
      .select({
        setorId: maquinaSetor.setorId,
        setorNome: setores.nome,
      })
      .from(maquinaSetor)
      .leftJoin(setores, eq(maquinaSetor.setorId, setores.id))
      .where(eq(maquinaSetor.maquinaId, maquina.id));

    console.log('📋 Setores da máquina:', setoresDaMaquina);

    // Retornar máquina com setores
    return NextResponse.json({
      ...maquina,
      setores: setoresDaMaquina.map(s => s.setorId),
      setoresNomes: setoresDaMaquina.map(s => s.setorNome).join(', '),
    });

  } catch (error) {
    console.error('❌ Erro ao buscar máquina:', error);
    return NextResponse.json(
      { error: 'Erro interno ao buscar máquina' },
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
    const { setores, ...maquinaData } = body;

    console.log('📦 Atualizando máquina:', params.id);
    console.log('📦 Dados:', maquinaData);
    console.log('📦 Setores:', setores);

    // Verificar se máquina existe
    const existing = await db.query.maquinas.findFirst({
      where: eq(maquinas.id, params.id),
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Máquina não encontrada' },
        { status: 404 }
      );
    }

    // Atualizar máquina
    const [updated] = await db
      .update(maquinas)
      .set({
        ...maquinaData,
        updatedAt: new Date(),
      })
      .where(eq(maquinas.id, params.id))
      .returning();

    // Atualizar vínculos com setores
    if (setores) {
      // Remover vínculos antigos
      await db.delete(maquinaSetor).where(eq(maquinaSetor.maquinaId, params.id));

      // Inserir novos vínculos
      if (setores.length > 0) {
        await db.insert(maquinaSetor).values(
          setores.map((setorId: string) => ({
            maquinaId: params.id,
            setorId,
          }))
        );
      }
    }

    console.log('✅ Máquina atualizada:', updated);

    return NextResponse.json(updated);

  } catch (error) {
    console.error('❌ Erro ao atualizar máquina:', error);
    return NextResponse.json(
      { error: 'Erro interno ao atualizar máquina' },
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

    console.log('🗑️ Excluindo máquina:', params.id);

    // Verificar se máquina existe
    const existing = await db.query.maquinas.findFirst({
      where: eq(maquinas.id, params.id),
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Máquina não encontrada' },
        { status: 404 }
      );
    }

    // Remover vínculos primeiro
    await db.delete(maquinaSetor).where(eq(maquinaSetor.maquinaId, params.id));
    
    // Remover máquina
    await db.delete(maquinas).where(eq(maquinas.id, params.id));

    console.log('✅ Máquina excluída');

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('❌ Erro ao excluir máquina:', error);
    return NextResponse.json(
      { error: 'Erro interno ao excluir máquina' },
      { status: 500 }
    );
  }
}