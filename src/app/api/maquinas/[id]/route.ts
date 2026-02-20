import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { maquinas } from '@/lib/db/schema/maquinas';
import { maquinaSetor } from '@/lib/db/schema/maquina-setor';
import { eq } from 'drizzle-orm';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { setores, ...maquinaData } = body;

    // Atualizar máquina
    const [updated] = await db
      .update(maquinas)
      .set({ ...maquinaData, updatedAt: new Date() })
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

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Remover vínculos primeiro
    await db.delete(maquinaSetor).where(eq(maquinaSetor.maquinaId, params.id));
    
    // Remover máquina
    await db.delete(maquinas).where(eq(maquinas.id, params.id));
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}