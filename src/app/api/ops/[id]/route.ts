import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ops } from '@/lib/db/schema/ops';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';

// Schema completo para atualização
const opSchema = z.object({
  op: z.number().optional(),
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
  depositoFinal: z.string().optional().nullable(),
  pecasVinculadas: z.string().optional().nullable(),
  calculoQuebra: z.number().optional().nullable(),
  nivel: z.string().optional().nullable(),
  grupo: z.string().optional().nullable(),
  sub: z.string().optional().nullable(),
  item: z.string().optional().nullable(),
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
    console.log('🔍 OP ID:', opId);
    
    const body = await request.json();
    console.log('📦 Body recebido:', JSON.stringify(body, null, 2));

    // Verificar se OP existe
    console.log('🔍 Verificando se OP existe...');
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

    // Validar dados
    console.log('🔍 Validando dados com schema...');
    let validated;
    try {
      validated = opSchema.parse(body);
      console.log('✅ Dados validados:', JSON.stringify(validated, null, 2));
    } catch (validationError) {
      console.error('❌ Erro de validação:', validationError);
      if (validationError instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Dados inválidos', detalhes: validationError.errors },
          { status: 400 }
        );
      }
      throw validationError;
    }

    // Preparar dados para atualizar
    const dadosParaAtualizar: any = {};
    console.log('🔍 Preparando dados para atualizar...');

    if (validated.produto !== undefined) {
      console.log('  - produto:', validated.produto);
      dadosParaAtualizar.produto = validated.produto;
    }
    
    if (validated.qtdeProgramado !== undefined) {
      console.log('  - qtdeProgramado:', validated.qtdeProgramado);
      dadosParaAtualizar.qtdeProgramado = validated.qtdeProgramado?.toString();
    }
    
    if (validated.qtdeCarregado !== undefined) {
      console.log('  - qtdeCarregado:', validated.qtdeCarregado);
      dadosParaAtualizar.qtdeCarregado = validated.qtdeCarregado?.toString();
    }
    
    if (validated.qtdeProduzida !== undefined) {
      console.log('  - qtdeProduzida:', validated.qtdeProduzida);
      dadosParaAtualizar.qtdeProduzida = validated.qtdeProduzida?.toString();
    }
    
    if (validated.um !== undefined) {
      console.log('  - um:', validated.um);
      dadosParaAtualizar.um = validated.um;
    }
    
    if (validated.narrativa !== undefined) {
      console.log('  - narrativa:', validated.narrativa);
      dadosParaAtualizar.narrativa = validated.narrativa;
    }
    
    if (validated.obs !== undefined) {
      console.log('  - obs:', validated.obs);
      dadosParaAtualizar.obs = validated.obs;
    }
    
    if (validated.status !== undefined) {
      console.log('  - status:', validated.status);
      dadosParaAtualizar.status = validated.status;
    }
    
    // Campos de estágio
    if (validated.codEstagioAtual !== undefined) {
      console.log('  - codEstagioAtual:', validated.codEstagioAtual);
      dadosParaAtualizar.cod_estagio_atual = validated.codEstagioAtual;
    }
    
    if (validated.estagioAtual !== undefined) {
      console.log('  - estagioAtual:', validated.estagioAtual);
      dadosParaAtualizar.estagio_atual = validated.estagioAtual;
    }
    
    // Campos de máquina
    if (validated.codMaquinaAtual !== undefined) {
      console.log('  - codMaquinaAtual:', validated.codMaquinaAtual);
      dadosParaAtualizar.cod_maquina_atual = validated.codMaquinaAtual;
    }
    
    if (validated.maquinaAtual !== undefined) {
      console.log('  - maquinaAtual:', validated.maquinaAtual);
      dadosParaAtualizar.maquina_atual = validated.maquinaAtual;
    }

    // Campos adicionais
    if (validated.depositoFinal !== undefined) {
      dadosParaAtualizar.deposito_final = validated.depositoFinal;
    }
    
    if (validated.pecasVinculadas !== undefined) {
      dadosParaAtualizar.pecas_vinculadas = validated.pecasVinculadas;
    }
    
    if (validated.calculoQuebra !== undefined) {
      dadosParaAtualizar.calculo_quebra = validated.calculoQuebra?.toString();
    }
    
    if (validated.nivel !== undefined) {
      dadosParaAtualizar.nivel = validated.nivel;
    }
    
    if (validated.grupo !== undefined) {
      dadosParaAtualizar.grupo = validated.grupo;
    }
    
    if (validated.sub !== undefined) {
      dadosParaAtualizar.sub = validated.sub;
    }
    
    if (validated.item !== undefined) {
      dadosParaAtualizar.item = validated.item;
    }

    // Sempre atualizar o updatedAt
    dadosParaAtualizar.updated_at = new Date();

    console.log('💾 Dados finais para atualizar:', JSON.stringify(dadosParaAtualizar, null, 2));

    // Executar o update
    console.log('🔍 Executando update no banco...');
    let updated;
    try {
      [updated] = await db
        .update(ops)
        .set(dadosParaAtualizar)
        .where(eq(ops.op, opId))
        .returning();
      
      console.log('✅ Update executado com sucesso');
    } catch (dbError) {
      console.error('❌ Erro no banco de dados:', dbError);
      throw dbError;
    }

    console.log('✅ OP atualizada. Novos valores:', {
      op: updated.op,
      status: updated.status,
      codMaquinaAtual: updated.codMaquinaAtual,
      maquinaAtual: updated.maquinaAtual,
      codEstagioAtual: updated.codEstagioAtual,
      estagioAtual: updated.estagioAtual,
    });
    
    return NextResponse.json(updated);

  } catch (error) {
    console.error('❌ ERRO:', error);
    
    if (error instanceof z.ZodError) {
      console.error('❌ Erros de validação:', JSON.stringify(error.errors, null, 2));
      return NextResponse.json(
        { error: 'Dados inválidos', detalhes: error.errors },
        { status: 400 }
      );
    }

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