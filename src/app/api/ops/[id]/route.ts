import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth'; // ✅ ADICIONAR
import { authOptions } from '@/lib/auth'; // ✅ ADICIONAR
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
  console.log('='.repeat(50));
  console.log(`📦 GET /api/ops/${params.id} - INICIANDO`);
  console.log('='.repeat(50));
  
  try {
    console.log('1️⃣ Verificando autenticação...');
    const session = await getServerSession(authOptions);
    console.log('   👤 Sessão:', session ? 'Presente' : 'Ausente');
    if (session?.user) {
      console.log('   📋 Usuário:', session.user.email);
    }

    if (!session) {
      console.log('   ❌ Não autorizado - redirecionando');
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const opId = parseInt(params.id);
    console.log('2️⃣ OP ID:', opId, '| Tipo:', typeof opId);
    
    if (isNaN(opId)) {
      console.log('   ❌ ID inválido:', params.id);
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    console.log('3️⃣ Buscando OP no banco...');
    const op = await db.query.ops.findFirst({
      where: eq(ops.op, opId),
    });

    if (!op) {
      console.log('   ❌ OP não encontrada');
      return NextResponse.json(
        { error: 'OP não encontrada' },
        { status: 404 }
      );
    }

    console.log('4️⃣ OP encontrada:', op.op, op.produto);
    console.log('✅ GET concluído com sucesso');
    return NextResponse.json(op);
  } catch (error) {
    console.error('❌ ERRO NO GET:', error);
    console.error('   Tipo:', typeof error);
    console.error('   Mensagem:', error instanceof Error ? error.message : String(error));
    console.error('   Stack:', error instanceof Error ? error.stack : 'N/A');
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
  console.log(`📦 PUT /api/ops/${params.id} - INICIANDO`);
  console.log('='.repeat(50));
  
  try {
    // PASSO 1: Verificar autenticação
    console.log('🔐 PASSO 1: Verificando autenticação...');
    let session;
    try {
      session = await getServerSession(authOptions);
      console.log('   ✅ Sessão obtida:', session ? 'Sim' : 'Não');
      if (session?.user) {
        console.log('   👤 Usuário autenticado:', session.user.email);
        console.log('   🆔 ID:', session.user.id);
        console.log('   📛 Nome:', session.user.nome);
      } else {
        console.log('   ⚠️ Sessão existe mas user é undefined');
      }
    } catch (authError) {
      console.error('   ❌ Erro ao obter sessão:', authError);
      console.error('   Detalhes:', authError instanceof Error ? authError.message : String(authError));
      throw authError;
    }

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
    console.log('   📌 OP ID recebido:', params.id);
    console.log('   📌 OP ID convertido:', opId);
    console.log('   📌 Tipo:', typeof opId);
    
    if (isNaN(opId)) {
      console.log('   ❌ ID inválido');
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      );
    }

    // PASSO 3: Receber body
    console.log('📦 PASSO 3: Recebendo body...');
    let body;
    try {
      body = await request.json();
      console.log('   ✅ Body recebido:', JSON.stringify(body, null, 2));
    } catch (jsonError) {
      console.error('   ❌ Erro ao parsear JSON:', jsonError);
      return NextResponse.json(
        { error: 'Body inválido' },
        { status: 400 }
      );
    }

    // PASSO 4: Verificar se OP existe
    console.log('🔍 PASSO 4: Verificando se OP existe...');
    let existing;
    try {
      existing = await db.query.ops.findFirst({
        where: eq(ops.op, opId),
      });
      console.log('   ✅ Consulta executada');
    } catch (dbError) {
      console.error('   ❌ Erro na consulta ao banco:', dbError);
      throw dbError;
    }

    if (!existing) {
      console.log('   ❌ OP não encontrada:', opId);
      return NextResponse.json(
        { error: 'OP não encontrada' },
        { status: 404 }
      );
    }

    console.log('   ✅ OP encontrada. Valores atuais:', {
      op: existing.op,
      produto: existing.produto,
      status: existing.status,
      codEstagioAtual: existing.codEstagioAtual,
      estagioAtual: existing.estagioAtual,
    });

    // PASSO 5: Validar dados com schema
    console.log('🔧 PASSO 5: Validando dados com schema...');
    let validated;
    try {
      validated = opSchema.parse(body);
      console.log('   ✅ Dados validados:', JSON.stringify(validated, null, 2));
    } catch (validationError) {
      console.error('   ❌ Erro de validação:', validationError);
      if (validationError instanceof z.ZodError) {
        console.error('   📋 Erros específicos:', JSON.stringify(validationError.errors, null, 2));
        return NextResponse.json(
          { error: 'Dados inválidos', detalhes: validationError.errors },
          { status: 400 }
        );
      }
      throw validationError;
    }

    // PASSO 6: Preparar dados para atualizar
    console.log('📝 PASSO 6: Preparando dados para atualizar...');
    const dadosParaAtualizar: any = {};
    
    // Contar quantos campos serão atualizados
    let camposAtualizados = 0;

    if (validated.produto !== undefined) {
      console.log('   ✅ produto:', validated.produto);
      dadosParaAtualizar.produto = validated.produto;
      camposAtualizados++;
    }
    
    if (validated.qtdeProgramado !== undefined) {
      console.log('   ✅ qtdeProgramado:', validated.qtdeProgramado);
      dadosParaAtualizar.qtdeProgramado = validated.qtdeProgramado?.toString();
      camposAtualizados++;
    }
    
    if (validated.qtdeCarregado !== undefined) {
      console.log('   ✅ qtdeCarregado:', validated.qtdeCarregado);
      dadosParaAtualizar.qtdeCarregado = validated.qtdeCarregado?.toString();
      camposAtualizados++;
    }
    
    if (validated.qtdeProduzida !== undefined) {
      console.log('   ✅ qtdeProduzida:', validated.qtdeProduzida);
      dadosParaAtualizar.qtdeProduzida = validated.qtdeProduzida?.toString();
      camposAtualizados++;
    }
    
    if (validated.um !== undefined) {
      console.log('   ✅ um:', validated.um);
      dadosParaAtualizar.um = validated.um;
      camposAtualizados++;
    }
    
    if (validated.narrativa !== undefined) {
      console.log('   ✅ narrativa:', validated.narrativa);
      dadosParaAtualizar.narrativa = validated.narrativa;
      camposAtualizados++;
    }
    
    if (validated.obs !== undefined) {
      console.log('   ✅ obs:', validated.obs);
      dadosParaAtualizar.obs = validated.obs;
      camposAtualizados++;
    }
    
    if (validated.status !== undefined) {
      console.log('   ✅ status:', validated.status);
      dadosParaAtualizar.status = validated.status;
      camposAtualizados++;
    }
    
    // Campos de estágio
    if (validated.codEstagioAtual !== undefined) {
      console.log('   ✅ codEstagioAtual:', validated.codEstagioAtual);
      dadosParaAtualizar.cod_estagio_atual = validated.codEstagioAtual;
      camposAtualizados++;
    }
    
    if (validated.estagioAtual !== undefined) {
      console.log('   ✅ estagioAtual:', validated.estagioAtual);
      dadosParaAtualizar.estagio_atual = validated.estagioAtual;
      camposAtualizados++;
    }
    
    // Campos de máquina
    if (validated.codMaquinaAtual !== undefined) {
      console.log('   ✅ codMaquinaAtual:', validated.codMaquinaAtual);
      dadosParaAtualizar.cod_maquina_atual = validated.codMaquinaAtual;
      camposAtualizados++;
    }
    
    if (validated.maquinaAtual !== undefined) {
      console.log('   ✅ maquinaAtual:', validated.maquinaAtual);
      dadosParaAtualizar.maquina_atual = validated.maquinaAtual;
      camposAtualizados++;
    }

    // Campos adicionais
    if (validated.depositoFinal !== undefined) {
      console.log('   ✅ depositoFinal:', validated.depositoFinal);
      dadosParaAtualizar.deposito_final = validated.depositoFinal;
      camposAtualizados++;
    }
    
    if (validated.pecasVinculadas !== undefined) {
      console.log('   ✅ pecasVinculadas:', validated.pecasVinculadas);
      dadosParaAtualizar.pecas_vinculadas = validated.pecasVinculadas;
      camposAtualizados++;
    }
    
    if (validated.calculoQuebra !== undefined) {
      console.log('   ✅ calculoQuebra:', validated.calculoQuebra);
      dadosParaAtualizar.calculo_quebra = validated.calculoQuebra?.toString();
      camposAtualizados++;
    }
    
    if (validated.nivel !== undefined) {
      console.log('   ✅ nivel:', validated.nivel);
      dadosParaAtualizar.nivel = validated.nivel;
      camposAtualizados++;
    }
    
    if (validated.grupo !== undefined) {
      console.log('   ✅ grupo:', validated.grupo);
      dadosParaAtualizar.grupo = validated.grupo;
      camposAtualizados++;
    }
    
    if (validated.sub !== undefined) {
      console.log('   ✅ sub:', validated.sub);
      dadosParaAtualizar.sub = validated.sub;
      camposAtualizados++;
    }
    
    if (validated.item !== undefined) {
      console.log('   ✅ item:', validated.item);
      dadosParaAtualizar.item = validated.item;
      camposAtualizados++;
    }

    // Sempre atualizar o updatedAt
    dadosParaAtualizar.updated_at = new Date();
    console.log('   ✅ updated_at:', dadosParaAtualizar.updated_at);
    camposAtualizados++;

    console.log(`   📊 Total de campos a atualizar: ${camposAtualizados}`);

    if (camposAtualizados === 0) {
      console.log('   ⚠️ Nenhum campo para atualizar');
      return NextResponse.json(
        { error: 'Nenhum campo para atualizar' },
        { status: 400 }
      );
    }

    console.log('   💾 Dados finais preparados:', JSON.stringify(dadosParaAtualizar, null, 2));

    // PASSO 7: Executar update
    console.log('⚡ PASSO 7: Executando update no banco...');
    let updated;
    try {
      [updated] = await db
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
    } catch (dbError) {
      console.error('   ❌ Erro no banco de dados:', dbError);
      console.error('   📋 Detalhes do erro:', JSON.stringify(dbError, null, 2));
      console.error('   📋 Código do erro:', (dbError as any)?.code);
      console.error('   📋 Mensagem do erro:', (dbError as any)?.message);
      throw dbError;
    }

    // PASSO 8: Retornar resposta
    console.log('📤 PASSO 8: Retornando resposta...');
    console.log('✅ PUT concluído com sucesso!');
    
    return NextResponse.json(updated);

  } catch (error) {
    console.error('❌❌❌ ERRO CAPTURADO NO PUT ❌❌❌');
    console.error('   Tipo do erro:', typeof error);
    console.error('   Constructor:', error instanceof Error ? error.constructor.name : 'N/A');
    
    if (error instanceof Error) {
      console.error('   Mensagem:', error.message);
      console.error('   Stack:', error.stack);
      console.error('   Name:', error.name);
      
      // Verificar se é o erro específico de "name"
      if (error.message.includes('name')) {
        console.error('   ⚠️⚠️⚠️ ERRO DE NAME DETECTADO! ⚠️⚠️⚠️');
        console.error('   Isso pode ser um problema de autenticação ou middleware');
      }
    }
    
    if (error instanceof z.ZodError) {
      console.error('   📋 Erros de validação:', JSON.stringify(error.errors, null, 2));
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

    console.error('   📤 Enviando erro ao cliente:', errorMessage);
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
  console.log('='.repeat(50));
  console.log(`📦 DELETE /api/ops/${params.id} - INICIANDO`);
  console.log('='.repeat(50));
  
  try {
    console.log('1️⃣ Verificando autenticação...');
    const session = await getServerSession(authOptions);
    console.log('   👤 Sessão:', session ? 'Presente' : 'Ausente');

    if (!session) {
      console.log('   ❌ Não autorizado');
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const opId = parseInt(params.id);
    console.log('2️⃣ OP ID:', opId);

    console.log('3️⃣ Verificando se OP existe...');
    const existing = await db.query.ops.findFirst({
      where: eq(ops.op, opId),
    });

    if (!existing) {
      console.log('   ❌ OP não encontrada');
      return NextResponse.json(
        { error: 'OP não encontrada' },
        { status: 404 }
      );
    }

    console.log('4️⃣ Excluindo OP...');
    await db.delete(ops).where(eq(ops.op, opId));
    console.log('   ✅ OP excluída com sucesso');

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('❌ ERRO NO DELETE:', error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}