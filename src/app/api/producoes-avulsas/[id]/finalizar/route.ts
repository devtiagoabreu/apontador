// src/app/api/producoes-avulsas/[id]/finalizar/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { producoesAvulsas } from '@/lib/db/schema/producoes-avulsas';
import { maquinas } from '@/lib/db/schema/maquinas';
import { eq } from 'drizzle-orm';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { metragem, observacoes } = await request.json();

    await db.transaction(async (tx) => {
      // 1. Buscar o registro para saber qual máquina liberar
      const registro = await tx.query.producoesAvulsas.findFirst({
        where: eq(producoesAvulsas.id, params.id),
      });

      if (!registro) throw new Error('Registro não encontrado');

      // 2. Finalizar o registro avulso
      await tx.update(producoesAvulsas)
        .set({
          dataFim: new Date(),
          metragem: metragem.toString(),
          operadorFimId: session.user.id, // Quem terminou
          status: 'CONCLUIDO',
          observacoes,
          updatedAt: new Date(),
        })
        .where(eq(producoesAvulsas.id, params.id));

      // 3. Liberar a máquina
      await tx.update(maquinas)
        .set({ status: 'DISPONIVEL', updatedAt: new Date() })
        .where(eq(maquinas.id, registro.maquinaId));
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao finalizar produção avulsa' }, { status: 500 });
  }
}