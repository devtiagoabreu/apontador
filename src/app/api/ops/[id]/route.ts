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
    console.error('❌ Erro detalhado:', error);
    console.error('❌ Stack:', error instanceof Error ? error.stack : 'N/A');
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
    
    // Verificar se opId é válido
    if (isNaN(opId)) {
      console.log('❌ ID inválido:', params.id);
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      );
    }
    
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
      op: existing.op,
      produto: existing.produto,
      status: existing.status,
      codEstagioAtual: existing.codEstagioAtual,
      estagioAtual: existing.estagioAtual,
      codMaquinaAtual: existing.codMaquinaAtual,
      maquinaAtual: existing.maquinaAtual,
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
        console.error('❌ Erros específicos:', JSON.stringify(validationError.errors, null, 2));
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
      console.log('  - depositoFinal:', validated.depositoFinal);
      dadosParaAtualizar.deposito_final = validated.depositoFinal;
    }
    
    if (validated.pecasVinculadas !== undefined) {
      console.log('  - pecasVinculadas:', validated.pecasVinculadas);
      dadosParaAtualizar.pecas_vinculadas = validated.pecasVinculadas;
    }
    
    if (validated.calculoQuebra !== undefined) {
      console.log('  - calculoQuebra:', validated.calculoQuebra);
      dadosParaAtualizar.calculo_quebra = validated.calculoQuebra?.toString();
    }
    
    if (validated.nivel !== undefined) {
      console.log('  - nivel:', validated.nivel);
      dadosParaAtualizar.nivel = validated.nivel;
    }
    
    if (validated.grupo !== undefined) {
      console.log('  - grupo:', validated.grupo);
      dadosParaAtualizar.grupo = validated.grupo;
    }
    
    if (validated.sub !== undefined) {
      console.log('  - sub:', validated.sub);
      dadosParaAtualizar.sub = validated.sub;
    }
    
    if (validated.item !== undefined) {
      console.log('  - item:', validated.item);
      dadosParaAtualizar.item = validated.item;
    }

    // Sempre atualizar o updatedAt
    dadosParaAtualizar.updated_at = new Date();
    console.log('  - updated_at:', dadosParaAtualizar.updated_at);

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
      console.error('❌ Detalhes do erro:', JSON.stringify(dbError, null, 2));
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
    console.error('❌ ERRO CAPTURADO:', error);
    console.error('❌ Tipo do erro:', typeof error);
    console.error('❌ Constructor:', error instanceof Error ? error.constructor.name : 'N/A');
    
    if (error instanceof Error) {
      console.error('❌ Mensagem:', error.message);
      console.error('❌ Stack:', error.stack);
      console.error('❌ Name:', error.name);
    }
    
    if (error instanceof z.ZodError) {
      console.error('❌ Erros de validação:', JSON.stringify(error.errors, null, 2));
      return NextResponse.json(
        { error: 'Dados inválidos', detalhes: error.errors },
        { status: 400 }
      );
    }

    // Tentar extrair informações do erro
    let errorMessage = 'Erro interno ao atualizar OP';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null) {
      try {
        errorMessage = JSON.stringify(error);
      } catch {
        errorMessage = String(error);
      }
    } else {
      errorMessage = String(error);
    }

    return NextResponse.json(
      { error: errorMessage },
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