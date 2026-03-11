import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { ops } from '@/lib/db/schema/ops';
import { eq } from 'drizzle-orm';
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

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log('='.repeat(50));
  console.log(`📦 PUT /api/ops/${params.id} - INICIANDO`);
  console.log('='.repeat(50));
  
  try {
    // PASSO 1: Verificar autenticação
    console.log('🔐 PASSO 1: Verificando autenticação...');
    const session = await getServerSession(authOptions);
    
    if (!session) {
      console.log('   ❌ Não autorizado - sessão ausente');
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    // PASSO 2: Validar parâmetros
    console.log('🔢 PASSO 2: Validando parâmetros...');
    const opId = parseInt(params.id);
    
    if (isNaN(opId)) {
      console.log('   ❌ ID inválido');
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      );
    }

    // PASSO 3: Receber body
    console.log('📦 PASSO 3: Recebendo body...');
    const body = await request.json();
    console.log('   ✅ Body recebido:', JSON.stringify(body, null, 2));

    // PASSO 4: Verificar se OP existe
    console.log('🔍 PASSO 4: Verificando se OP existe...');
    const existing = await db.query.ops.findFirst({
      where: eq(ops.op, opId),
    });

    if (!existing) {
      console.log('   ❌ OP não encontrada:', opId);
      return NextResponse.json(
        { error: 'OP não encontrada' },
        { status: 404 }
      );
    }

    // PASSO 5: Validar dados com schema
    console.log('🔧 PASSO 5: Validando dados com schema...');
    const validated = opSchema.parse(body);
    console.log('   ✅ Dados validados:', JSON.stringify(validated, null, 2));

    // 🔴 PASSO 6: Preparar dados para atualizar - USANDO CAMELCASE
    console.log('📝 PASSO 6: Preparando dados para atualizar...');
    const dadosParaAtualizar: any = {};

    if (validated.produto !== undefined) {
      console.log('   ✅ produto:', validated.produto);
      dadosParaAtualizar.produto = validated.produto;
    }
    
    if (validated.qtdeProgramado !== undefined) {
      console.log('   ✅ qtdeProgramado:', validated.qtdeProgramado);
      dadosParaAtualizar.qtdeProgramado = validated.qtdeProgramado?.toString();
    }
    
    if (validated.qtdeCarregado !== undefined) {
      console.log('   ✅ qtdeCarregado:', validated.qtdeCarregado);
      dadosParaAtualizar.qtdeCarregado = validated.qtdeCarregado?.toString();
    }
    
    if (validated.qtdeProduzida !== undefined) {
      console.log('   ✅ qtdeProduzida:', validated.qtdeProduzida);
      dadosParaAtualizar.qtdeProduzida = validated.qtdeProduzida?.toString();
    }
    
    if (validated.um !== undefined) {
      console.log('   ✅ um:', validated.um);
      dadosParaAtualizar.um = validated.um;
    }
    
    if (validated.narrativa !== undefined) {
      console.log('   ✅ narrativa:', validated.narrativa);
      dadosParaAtualizar.narrativa = validated.narrativa;
    }
    
    if (validated.obs !== undefined) {
      console.log('   ✅ obs:', validated.obs);
      dadosParaAtualizar.obs = validated.obs;
    }
    
    if (validated.status !== undefined) {
      console.log('   ✅ status:', validated.status);
      dadosParaAtualizar.status = validated.status;
    }
    
    // 🔴 CAMPOS DE ESTÁGIO - usar camelCase
    if (validated.codEstagioAtual !== undefined) {
      console.log('   ✅ codEstagioAtual (camelCase):', validated.codEstagioAtual);
      dadosParaAtualizar.codEstagioAtual = validated.codEstagioAtual;
    }
    
    if (validated.estagioAtual !== undefined) {
      console.log('   ✅ estagioAtual (camelCase):', validated.estagioAtual);
      dadosParaAtualizar.estagioAtual = validated.estagioAtual;
    }
    
    // 🔴 CAMPOS DE MÁQUINA - usar camelCase
    if (validated.codMaquinaAtual !== undefined) {
      console.log('   ✅ codMaquinaAtual (camelCase):', validated.codMaquinaAtual);
      dadosParaAtualizar.codMaquinaAtual = validated.codMaquinaAtual;
    }
    
    if (validated.maquinaAtual !== undefined) {
      console.log('   ✅ maquinaAtual (camelCase):', validated.maquinaAtual);
      dadosParaAtualizar.maquinaAtual = validated.maquinaAtual;
    }

    // Campos adicionais
    if (validated.depositoFinal !== undefined) {
      console.log('   ✅ depositoFinal:', validated.depositoFinal);
      dadosParaAtualizar.depositoFinal = validated.depositoFinal;
    }
    
    if (validated.pecasVinculadas !== undefined) {
      console.log('   ✅ pecasVinculadas:', validated.pecasVinculadas);
      dadosParaAtualizar.pecasVinculadas = validated.pecasVinculadas;
    }
    
    if (validated.calculoQuebra !== undefined) {
      console.log('   ✅ calculoQuebra:', validated.calculoQuebra);
      dadosParaAtualizar.calculoQuebra = validated.calculoQuebra?.toString();
    }
    
    if (validated.nivel !== undefined) {
      console.log('   ✅ nivel:', validated.nivel);
      dadosParaAtualizar.nivel = validated.nivel;
    }
    
    if (validated.grupo !== undefined) {
      console.log('   ✅ grupo:', validated.grupo);
      dadosParaAtualizar.grupo = validated.grupo;
    }
    
    if (validated.sub !== undefined) {
      console.log('   ✅ sub:', validated.sub);
      dadosParaAtualizar.sub = validated.sub;
    }
    
    if (validated.item !== undefined) {
      console.log('   ✅ item:', validated.item);
      dadosParaAtualizar.item = validated.item;
    }

    // 🔴 updatedAt em camelCase
    dadosParaAtualizar.updatedAt = new Date();
    console.log('   ✅ updatedAt:', dadosParaAtualizar.updatedAt);

    console.log('   💾 Dados finais (camelCase):', JSON.stringify(dadosParaAtualizar, null, 2));

    // PASSO 7: Executar update
    console.log('⚡ PASSO 7: Executando update no banco...');
    const [updated] = await db
      .update(ops)
      .set(dadosParaAtualizar)
      .where(eq(ops.op, opId))
      .returning();

    console.log('   ✅ Update executado com sucesso');
    console.log('   📄 Dados atualizados:', {
      op: updated.op,
      status: updated.status,
      produto: updated.produto,
    });

    // PASSO 8: Retornar resposta
    console.log('📤 PASSO 8: Retornando resposta...');
    console.log('✅ PUT concluído com sucesso!');
    
    return NextResponse.json(updated);

  } catch (error) {
    console.error('❌❌❌ ERRO CAPTURADO NO PUT ❌❌❌');
    
    if (error instanceof z.ZodError) {
      console.error('   📋 Erros de validação:', JSON.stringify(error.errors, null, 2));
      return NextResponse.json(
        { error: 'Dados inválidos', detalhes: error.errors },
        { status: 400 }
      );
    }

    console.error('   Mensagem:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno' },
      { status: 500 }
    );
  }
}