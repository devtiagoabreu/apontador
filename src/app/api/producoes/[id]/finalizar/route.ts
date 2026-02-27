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

// Interface para tipar os apontamentos
interface Apontamento {
  id: string;
  opId: number;
  maquinaId: string;
  estagioId: string;
  dataInicio: Date;
  dataFim: Date | null;
  metragemProcessada: string | null;
}

// Função auxiliar para determinar status da OP
async function determinarStatusOP(opId: number, tx: any): Promise<string> {
  console.log(`🔍 Determinando status para OP ${opId}...`);
  
  // Buscar todos os apontamentos de produção desta OP
  const apontamentos = await tx.query.producoesTable.findMany({
    where: eq(producoesTable.opId, opId),
  }) as Apontamento[];

  console.log(`📊 Encontrados ${apontamentos.length} apontamentos`);

  if (apontamentos.length === 0) {
    console.log('✅ Nenhum apontamento -> ABERTA');
    return 'ABERTA';
  }

  // Verificar se tem algum apontamento em andamento
  const temEmAndamento = apontamentos.some((a: Apontamento) => !a.dataFim);
  if (temEmAndamento) {
    console.log('✅ Tem apontamento em andamento -> EM_ANDAMENTO');
    return 'EM_ANDAMENTO';
  }

  // Verificar se todos estão finalizados
  const todosFinalizados = apontamentos.every((a: Apontamento) => a.dataFim);
  if (todosFinalizados) {
    console.log('✅ Todos apontamentos finalizados');
    
    // Buscar o último apontamento (mais recente)
    const ultimoApontamento = apontamentos.sort((a: Apontamento, b: Apontamento) => 
      new Date(b.dataFim!).getTime() - new Date(a.dataFim!).getTime()
    )[0];

    console.log('📅 Último apontamento:', ultimoApontamento.id);

    // Buscar estágio de revisão
    const estagioRevisao = await tx.query.estagios.findFirst({
      where: eq(estagios.nome, 'REVISÃO'),
    });

    if (!estagioRevisao) {
      console.log('⚠️ Estágio de revisão não encontrado');
      return 'EM_ANDAMENTO';
    }

    // Verificar se o último apontamento é de revisão
    if (ultimoApontamento.estagioId === estagioRevisao.id) {
      console.log('🏁 Último apontamento é REVISÃO -> FINALIZADA');
      return 'FINALIZADA';
    }
  }

  console.log('✅ Padrão -> EM_ANDAMENTO');
  return 'EM_ANDAMENTO';
}

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
      // 1. Finalizar produção (salvar metragem processada DESTE estágio)
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

      console.log('✅ Produção finalizada - metragem processada salva:', validated.metragemProcessada);

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

      // 4. Buscar próximo estágio (se houver)
      const proximoEstagio = await tx.query.estagios.findFirst({
        where: sql`${estagios.ordem} > ${estagioAtual.ordem}`,
        orderBy: (estagios, { asc }) => [asc(estagios.ordem)],
      });

      // 5. Verificar se é o último estágio (REVISÃO)
      const estagioRevisao = await tx.query.estagios.findFirst({
        where: eq(estagios.nome, 'REVISÃO'),
      });

      const isUltimoEstagio = estagioAtual.id === estagioRevisao?.id;

      if (isUltimoEstagio) {
        // É REVISÃO - finalizar OP
        console.log('🏁 REVISÃO - FINALIZANDO OP');
        await tx
          .update(ops)
          .set({
            qtdeProduzida: validated.metragemProcessada.toString(),
            status: 'FINALIZADA',
            codEstagioAtual: '99',
            estagioAtual: 'FINALIZADA',
            codMaquinaAtual: '00',
            maquinaAtual: 'NENHUMA',
            dataUltimoApontamento: agora,
          })
          .where(eq(ops.op, producao.opId));
        
        console.log('✅ OP FINALIZADA');
      } else if (proximoEstagio) {
        // NÃO É REVISÃO - apenas avança estágio
        console.log('➡️ Avançando para próximo estágio:', proximoEstagio.nome);
        await tx
          .update(ops)
          .set({
            status: 'EM_ANDAMENTO',
            codEstagioAtual: proximoEstagio.codigo,
            estagioAtual: proximoEstagio.nome,
            codMaquinaAtual: '00', // Máquina será definida no próximo início
            maquinaAtual: 'NENHUMA',
            dataUltimoApontamento: agora,
          })
          .where(eq(ops.op, producao.opId));
        
        console.log('✅ OP avançada para:', proximoEstagio.nome);
      }

      // 6. Determinar o status correto da OP baseado em TODOS os apontamentos
      const novoStatus = await determinarStatusOP(producao.opId, tx);
      
      // 7. Atualizar status da OP (reforço)
      await tx
        .update(ops)
        .set({
          status: novoStatus,
          dataUltimoApontamento: agora,
        })
        .where(eq(ops.op, producao.opId));

      console.log(`✅ Status da OP atualizado para: ${novoStatus}`);

      // 8. Liberar máquina
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
    console.log('='.repeat(50));

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