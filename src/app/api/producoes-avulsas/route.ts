// src/app/api/producoes-avulsas/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { producoesAvulsas } from '@/lib/db/schema/producoes-avulsas';
import { maquinas } from '@/lib/db/schema/maquinas';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const iniciarAvulsoSchema = z.object({
  maquinaId: z.string().uuid(),
  produtoId: z.string().uuid(),
  estagioId: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await request.json();
    const { maquinaId, produtoId, estagioId } = iniciarAvulsoSchema.parse(body);

    const result = await db.transaction(async (tx) => {
      // 1. Criar o registro avulso
      const [novaProducao] = await tx.insert(producoesAvulsas).values({
        maquinaId,
        produtoId,
        estagioId,
        operadorInicioId: session.user.id, // Crédito para quem começou
        status: 'EM_ANDAMENTO',
      }).returning();

      // 2. Atualizar status da máquina para EM_PROCESSO
      await tx.update(maquinas)
        .set({ status: 'EM_PROCESSO', updatedAt: new Date() })
        .where(eq(maquinas.id, maquinaId));

      return novaProducao;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao iniciar produção avulsa' }, { status: 500 });
  }
}