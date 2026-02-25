import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { producoesTable } from '@/lib/db/schema/producoes';
import { maquinas } from '@/lib/db/schema/maquinas';
import { ops } from '@/lib/db/schema/ops';
import { estagios } from '@/lib/db/schema/estagios';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';

const finalizarSchema = z.object({
  metragemProcessada: z.number().positive('Metragem deve ser positiva'),
  operadorFimId: z.string().uuid('Operador inválido').optional(),
  observacoes: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log('='.repeat(50));
  console.log('📦 POST /api/producoes/[id]/finalizar - FINALIZAR PRODUÇÃO');
  console.log('='.repeat(50));
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      console.log('❌ Não autorizado');
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    console.log('🔍 ID da produção:', params.id);

    const body = await request.json();
    console.log('📦 Body recebido:', body);

    const validated = finalizarSchema.parse(body);
    console.log('✅ Dados validados:', validated);

    // Buscar produção
    const producao = await db.query.producoesTable.findFirst({
      where: eq(producoesTable.id, params.id),
    });

    if (!producao) {
      console.log('❌ Produção não encontrada');
      return NextResponse.json(
        { error: 'Produção não encontrada' },
        { status: 404 }
      );
    }

    console.log('✅ Produção encontrada:', producao);

    // Verificar se já está finalizada
    if (producao.dataFim) {
      console.log('❌ Produção já finalizada em:', producao.dataFim);
      return NextResponse.json(
        { error: 'Produção já foi finalizada' },
        { status: 400 }
      );
    }

    const agora = new Date();

    await db.transaction(async (tx) => {
      // 1. Finalizar produção
      await tx
        .update(producoesTable)
        .set({
          dataFim: agora,
          metragemProcessada: validated.metragemProcessada.toString(),
          operadorFimId: validated.operadorFimId || session.user.id,
          observacoes: validated.observacoes,
          updatedAt: agora,
        })
        .where(eq(producoesTable.id, params.id));

      console.log('✅ Produção finalizada');

      // 2. Buscar OP
      const op = await tx.query.ops.findFirst({
        where: eq(ops.op, producao.opId),
      });

      if (!op) {
        throw new Error('OP não encontrada');
      }

      // 3. Buscar estágio atual
      const estagioAtual = await tx.query.estagios.findFirst({
        where: eq(estagios.id, producao.estagioId),
      });

      if (!estagioAtual) {
        throw new Error('Estágio não encontrado');
      }

      // 4. Verificar se é o último estágio
      const ultimoEstagio = await tx.query.estagios.findFirst({
        orderBy: (estagios, { desc }) => [desc(estagios.ordem)],
      });

      const isUltimoEstagio = estagioAtual.codigo === ultimoEstagio?.codigo;

      if (isUltimoEstagio) {
        // É o último estágio - finalizar OP
        console.log('🏁 Último estágio - finalizando OP');
        await tx
          .update(ops)
          .set({
            qtdeProduzida: validated.metragemProcessada.toString(),
            status: 'FINALIZADA',
            codEstagioAtual: '99',
            estagioAtual: 'FINALIZADA',
            dataUltimoApontamento: agora,
          })
          .where(eq(ops.op, producao.opId));
      } else {
        // Não é o último - avançar para o próximo estágio
        console.log('➡️ Avançando para próximo estágio');
        
        const proximoEstagio = await tx.query.estagios.findFirst({
          where: sql`${estagios.ordem} > ${estagioAtual.ordem}`,
          orderBy: (estagios, { asc }) => [asc(estagios.ordem)],
        });

        if (proximoEstagio) {
          await tx
            .update(ops)
            .set({
              codEstagioAtual: proximoEstagio.codigo,
              estagioAtual: proximoEstagio.nome,
              dataUltimoApontamento: agora,
            })
            .where(eq(ops.op, producao.opId));
        }
      }

      // 5. Liberar máquina
      await tx
        .update(maquinas)
        .set({
          status: 'DISPONIVEL',
          updatedAt: agora,
        })
        .where(eq(maquinas.id, producao.maquinaId));

      console.log('✅ Máquina liberada');
    });

    console.log('🎉 Produção finalizada com sucesso!');

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('❌ ERRO:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', detalhes: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erro interno ao finalizar produção' },
      { status: 500 }
    );
  }
}