import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { paradasMaquina } from '@/lib/db/schema/paradas-maquina';
import { maquinas } from '@/lib/db/schema/maquinas';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const finalizarSchema = z.object({
  dataFim: z.string().datetime().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log('📦 POST /api/paradas-maquina/[id]/finalizar - Iniciando');
  console.log('🔍 ID da parada:', params.id);
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      console.log('❌ Não autorizado');
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    console.log('👤 Usuário:', session.user.id);

    const body = await request.json();
    console.log('📦 Body recebido:', body);

    const validated = finalizarSchema.parse(body);
    console.log('✅ Dados validados:', validated);

    const agora = new Date();

    // Buscar parada
    console.log('🔍 Buscando parada com ID:', params.id);
    const parada = await db.query.paradasMaquina.findFirst({
      where: eq(paradasMaquina.id, params.id),
    });

    if (!parada) {
      console.log('❌ Parada não encontrada');
      return NextResponse.json(
        { error: 'Parada não encontrada' },
        { status: 404 }
      );
    }

    console.log('✅ Parada encontrada:', parada);

    // Finalizar parada
    console.log('💾 Atualizando parada...');
    await db
      .update(paradasMaquina)
      .set({
        dataFim: validated.dataFim ? new Date(validated.dataFim) : agora,
        updatedAt: agora,
      })
      .where(eq(paradasMaquina.id, params.id));

    console.log('✅ Parada finalizada');

    // Decidir novo status da máquina
    console.log('🔍 Verificando OP vinculada:', parada.opId);
    
    if (parada.opId) {
      // Tinha OP - volta para EM_PROCESSO
      console.log('🔄 Voltando máquina para EM_PROCESSO (tinha OP)');
      await db
        .update(maquinas)
        .set({
          status: 'EM_PROCESSO',
          updatedAt: agora,
        })
        .where(eq(maquinas.id, parada.maquinaId));
    } else {
      // Não tinha OP - volta para DISPONIVEL
      console.log('🔄 Voltando máquina para DISPONIVEL (sem OP)');
      await db
        .update(maquinas)
        .set({
          status: 'DISPONIVEL',
          updatedAt: agora,
        })
        .where(eq(maquinas.id, parada.maquinaId));
    }

    console.log('✅ Processo concluído com sucesso');
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('❌ Erro detalhado:', error);
    
    if (error instanceof z.ZodError) {
      console.error('❌ Erro de validação:', error.errors);
      return NextResponse.json(
        { error: 'Dados inválidos', detalhes: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erro interno ao finalizar parada' },
      { status: 500 }
    );
  }
}