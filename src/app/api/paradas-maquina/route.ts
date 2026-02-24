import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { paradasMaquina } from '@/lib/db/schema/paradas-maquina';
import { maquinas } from '@/lib/db/schema/maquinas';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';

const paradaSchema = z.object({
  maquinaId: z.string().uuid('Máquina inválida'),
  operadorId: z.string().uuid('Operador inválido'),
  motivoParadaId: z.string().uuid('Motivo inválido'),
  dataInicio: z.string().datetime('Data início inválida'),
  observacoes: z.string().optional(),
  opId: z.number().int().positive().optional(),
});

export async function POST(request: Request) {
  console.log('📦 POST /api/paradas-maquina - Iniciando');
  
  try {
    const session = await getServerSession(authOptions);
    console.log('👤 Sessão:', session?.user?.id);
    
    if (!session) {
      console.log('❌ Não autorizado');
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    console.log('📦 Body recebido:', JSON.stringify(body, null, 2));

    // Validar dados
    const validated = paradaSchema.parse(body);
    console.log('✅ Dados validados:', validated);

    // Verificar se máquina existe
    const maquina = await db.query.maquinas.findFirst({
      where: eq(maquinas.id, validated.maquinaId),
    });

    if (!maquina) {
      console.log('❌ Máquina não encontrada:', validated.maquinaId);
      return NextResponse.json(
        { error: 'Máquina não encontrada' },
        { status: 404 }
      );
    }

    const dadosInserir = {
      maquinaId: validated.maquinaId,
      operadorId: validated.operadorId,
      motivoParadaId: validated.motivoParadaId,
      dataInicio: new Date(validated.dataInicio),
      observacoes: validated.observacoes || null,
      opId: validated.opId || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log('💾 Inserindo:', dadosInserir);

    const [novaParada] = await db
      .insert(paradasMaquina)
      .values(dadosInserir)
      .returning();

    console.log('✅ Parada criada:', novaParada.id);

    // Atualizar status da máquina
    await db
      .update(maquinas)
      .set({ 
        status: 'PARADA',
        updatedAt: new Date() 
      })
      .where(eq(maquinas.id, validated.maquinaId));

    return NextResponse.json(novaParada, { status: 201 });

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
      { error: 'Erro interno ao criar parada' },
      { status: 500 }
    );
  }
}