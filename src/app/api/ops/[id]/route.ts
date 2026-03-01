import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ops } from '@/lib/db/schema/ops';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const opSchema = z.object({
  produto: z.string().min(1).optional(),
  qtdeProgramado: z.number().optional().nullable(),
  qtdeCarregado: z.number().optional().nullable(),
  qtdeProduzida: z.number().optional().nullable(),
  um: z.string().optional().nullable(),
  narrativa: z.string().optional().nullable(),
  obs: z.string().optional().nullable(),
  status: z.enum(['ABERTA', 'EM_ANDAMENTO', 'FINALIZADA', 'CANCELADA']).optional(),
  codEstagioAtual: z.string().optional(),
  estagioAtual: z.string().optional(),
  codMaquinaAtual: z.string().optional(),
  maquinaAtual: z.string().optional(),
});

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log(`📦 GET /api/ops/${params.id} - Buscando OP`);
  
  try {
    const opId = parseInt(params.id);
    
    const op = await db.query.ops.findFirst({
      where: eq(ops.op, opId),
    });

    if (!op) {
      console.log('❌ OP não encontrada:', opId);
      return NextResponse.json(
        { error: 'OP não encontrada' },
        { status: 404 }
      );
    }

    console.log('✅ OP encontrada:', op.op);
    return NextResponse.json(op);
  } catch (error) {
    console.error('❌ Erro:', error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log('='.repeat(50));
  console.log(`📦 PUT /api/ops/${params.id} - ATUALIZAR OP`);
  console.log('='.repeat(50));
  
  try {
    const opId = parseInt(params.id);
    const body = await request.json();
    console.log('📦 Body recebido:', JSON.stringify(body, null, 2));

    // Verificar se OP existe
    const existing = await db.query.ops.findFirst({
      where: eq(ops.op, opId),
    });

    if (!existing) {
      console.log('❌ OP não encontrada:', opId);
      return NextResponse.json(
        { error: 'OP não encontrada' },
        { status: 404 }
      );
    }

    console.log('✅ OP encontrada. Valores atuais:', {
      codMaquinaAtual: existing.codMaquinaAtual,
      maquinaAtual: existing.maquinaAtual,
      codEstagioAtual: existing.codEstagioAtual,
      estagioAtual: existing.estagioAtual,
    });

    // Validar apenas os campos que vieram no body
    const validated = opSchema.parse(body);
    console.log('✅ Dados validados:', validated);

    // 🔥 CONVERTER NÚMEROS PARA STRING ANTES DE ATUALIZAR
    const dadosParaAtualizar: any = {};

    if (validated.produto !== undefined) dadosParaAtualizar.produto = validated.produto;
    if (validated.qtdeProgramado !== undefined) {
      dadosParaAtualizar.qtdeProgramado = validated.qtdeProgramado?.toString();
    }
    if (validated.qtdeCarregado !== undefined) {
      dadosParaAtualizar.qtdeCarregado = validated.qtdeCarregado?.toString();
    }
    if (validated.qtdeProduzida !== undefined) {
      dadosParaAtualizar.qtdeProduzida = validated.qtdeProduzida?.toString();
    }
    if (validated.um !== undefined) dadosParaAtualizar.um = validated.um;
    if (validated.narrativa !== undefined) dadosParaAtualizar.narrativa = validated.narrativa;
    if (validated.obs !== undefined) dadosParaAtualizar.obs = validated.obs;
    if (validated.status !== undefined) dadosParaAtualizar.status = validated.status;
    
    // LOG ESPECÍFICO PARA CAMPOS DE MÁQUINA E ESTÁGIO
    console.log('🔍 Processando campos de máquina e estágio:');
    
    if (validated.codEstagioAtual !== undefined) {
      console.log('  - codEstagioAtual:', validated.codEstagioAtual);
      dadosParaAtualizar.cod_estagio_atual = validated.codEstagioAtual;
    }
    
    if (validated.estagioAtual !== undefined) {
      console.log('  - estagioAtual:', validated.estagioAtual);
      dadosParaAtualizar.estagio_atual = validated.estagioAtual;
    }
    
    if (validated.codMaquinaAtual !== undefined) {
      console.log('  - codMaquinaAtual:', validated.codMaquinaAtual);
      dadosParaAtualizar.cod_maquina_atual = validated.codMaquinaAtual;
    }
    
    if (validated.maquinaAtual !== undefined) {
      console.log('  - maquinaAtual:', validated.maquinaAtual);
      dadosParaAtualizar.maquina_atual = validated.maquinaAtual;
    }

    // Sempre atualizar o updatedAt
    dadosParaAtualizar.updated_at = new Date();

    console.log('💾 Dados para atualizar (com nomes das colunas):', JSON.stringify(dadosParaAtualizar, null, 2));

    const [updated] = await db
      .update(ops)
      .set(dadosParaAtualizar)
      .where(eq(ops.op, opId))
      .returning();

    console.log('✅ OP atualizada com sucesso. Novos valores:', {
      codMaquinaAtual: updated.codMaquinaAtual,
      maquinaAtual: updated.maquinaAtual,
      codEstagioAtual: updated.codEstagioAtual,
      estagioAtual: updated.estagioAtual,
    });
    
    return NextResponse.json(updated);

  } catch (error) {
    console.error('❌ Erro detalhado:', error);
    
    if (error instanceof z.ZodError) {
      console.error('❌ Erros de validação:', JSON.stringify(error.errors, null, 2));
      return NextResponse.json(
        { error: 'Dados inválidos', detalhes: error.errors },
        { status: 400 }
      );
    }

    // Log do erro completo
    console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno ao atualizar OP' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log(`📦 DELETE /api/ops/${params.id} - EXCLUIR OP`);
  
  try {
    const opId = parseInt(params.id);

    const existing = await db.query.ops.findFirst({
      where: eq(ops.op, opId),
    });

    if (!existing) {
      console.log('❌ OP não encontrada:', opId);
      return NextResponse.json(
        { error: 'OP não encontrada' },
        { status: 404 }
      );
    }

    await db.delete(ops).where(eq(ops.op, opId));
    console.log('✅ OP excluída com sucesso:', opId);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('❌ Erro:', error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}