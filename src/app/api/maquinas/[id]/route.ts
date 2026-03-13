// src/app/api/maquinas/[id]/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { maquinas } from '@/lib/db/schema/maquinas';
import { maquinaSetor } from '@/lib/db/schema/maquina-setor';
import { setores } from '@/lib/db/schema/setores';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const maquinaSchema = z.object({
  nome: z.string().min(3).optional(),
  codigo: z.string().min(1).max(20).optional(),
  status: z.enum(['DISPONIVEL', 'EM_PROCESSO', 'PARADA']).optional(),
  ativo: z.boolean().optional(),
  velocidadePadrao: z.number().optional(),
  capacidadeKg: z.number().optional(),
  capacidadeLitros: z.number().optional(),
  tempoDiarioDisponivel: z.number().optional(),
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

    // Validar dados da máquina (ignorar setores)
    const validated = maquinaSchema.parse(maquinaData);
    console.log('✅ Dados validados:', validated);

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

    // Preparar dados para atualização
    const updateData: any = {
      ...validated,
      updatedAt: new Date(),
    };

    // Converter números decimais para string
    if (validated.velocidadePadrao !== undefined) {
      updateData.velocidadePadrao = validated.velocidadePadrao.toString();
    }
    if (validated.capacidadeKg !== undefined) {
      updateData.capacidadeKg = validated.capacidadeKg.toString();
    }
    if (validated.capacidadeLitros !== undefined) {
      updateData.capacidadeLitros = validated.capacidadeLitros.toString();
    }

    // Atualizar máquina
    const [updated] = await db
      .update(maquinas)
      .set(updateData)
      .where(eq(maquinas.id, params.id))
      .returning();

    // Atualizar vínculos com setores (se fornecido)
    if (setores !== undefined) {
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
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', detalhes: error.errors },
        { status: 400 }
      );
    }

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