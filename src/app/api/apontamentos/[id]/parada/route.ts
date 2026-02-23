import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { apontamentos } from '@/lib/db/schema/apontamentos';
import { maquinas } from '@/lib/db/schema/maquinas';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const paradaSchema = z.object({
  motivoParadaId: z.string(),
  observacoes: z.string().optional(),
  opId: z.number().int().positive().optional(), // Para vincular OP se houver
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const validated = paradaSchema.parse(body);
    const agora = new Date();

    // Buscar apontamento atual (deve ser do tipo PRODUCAO)
    const apontamento = await db.query.apontamentos.findFirst({
      where: eq(apontamentos.id, params.id),
    });

    if (!apontamento) {
      return NextResponse.json(
        { error: 'Apontamento não encontrado' },
        { status: 404 }
      );
    }

    if (apontamento.tipo !== 'PRODUCAO') {
      return NextResponse.json(
        { error: 'Este apontamento não é do tipo produção' },
        { status: 400 }
      );
    }

    if (apontamento.status !== 'EM_ANDAMENTO') {
      return NextResponse.json(
        { error: 'Apontamento não está em andamento' },
        { status: 400 }
      );
    }

    // Verificar se já existe uma parada ativa para esta máquina
    const paradaAtiva = await db.query.apontamentos.findFirst({
      where: eq(apontamentos.maquinaId, apontamento.maquinaId),
      // Não podemos ter outra parada ativa na mesma máquina
    });

    // Criar um NOVO apontamento do tipo PARADA
    const [novaParada] = await db
      .insert(apontamentos)
      .values({
        tipo: 'PARADA',
        maquinaId: apontamento.maquinaId,
        opId: validated.opId || apontamento.opId, // Mantém a OP se houver
        motivoParadaId: validated.motivoParadaId,
        observacoes: validated.observacoes,
        operadorInicioId: session.user.id,
        dataInicio: agora,
        dataFim: agora, // Começa e termina no mesmo momento (parada em andamento)
        status: 'EM_ANDAMENTO',
        createdAt: agora,
        updatedAt: agora,
      })
      .returning();

    // Atualizar status da máquina para PARADA
    await db
      .update(maquinas)
      .set({
        status: 'PARADA',
        updatedAt: agora,
      })
      .where(eq(maquinas.id, apontamento.maquinaId));

    return NextResponse.json({ 
      success: true, 
      message: 'Parada registrada com sucesso',
      parada: novaParada 
    });

  } catch (error) {
    console.error('Erro ao registrar parada:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', detalhes: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erro interno ao registrar parada' },
      { status: 500 }
    );
  }
}