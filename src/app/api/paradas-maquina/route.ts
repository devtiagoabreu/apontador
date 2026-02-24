import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { paradasMaquina } from '@/lib/db/schema/paradas-maquina';
import { maquinas } from '@/lib/db/schema/maquinas';
import { usuarios } from '@/lib/db/schema/usuarios';
import { motivosParada } from '@/lib/db/schema/motivos-parada';
import { ops } from '@/lib/db/schema/ops';
import { eq, desc, sql } from 'drizzle-orm';
import { z } from 'zod';

const paradaSchema = z.object({
  maquinaId: z.string().uuid('Máquina inválida'),
  operadorId: z.string().uuid('Operador inválido'),
  motivoParadaId: z.string().uuid('Motivo inválido'),
  dataInicio: z.string().datetime('Data início inválida'),
  observacoes: z.string().optional(),
  opId: z.number().int().positive().optional(),
});

// GET - Listar paradas
export async function GET(request: Request) {
  console.log('📦 GET /api/paradas-maquina - Iniciando');
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      console.log('❌ Não autorizado');
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;
    const ativas = searchParams.get('ativas') === 'true';

    console.log(`📊 Buscando paradas - página ${page}, limite ${limit}, ativas: ${ativas}`);

    const result = await db.execute(sql`
      SELECT 
        p.*,
        m.nome as maquina_nome,
        m.codigo as maquina_codigo,
        u.nome as operador_nome,
        u.matricula as operador_matricula,
        mp.descricao as motivo_descricao,
        mp.codigo as motivo_codigo,
        o.op as op_numero,
        o.produto as op_produto
      FROM paradas_maquina p
      LEFT JOIN maquinas m ON p.maquina_id = m.id
      LEFT JOIN usuarios u ON p.operador_id = u.id
      LEFT JOIN motivos_parada mp ON p.motivo_parada_id = mp.id
      LEFT JOIN ops o ON p.op_id = o.op
      ${ativas ? sql`WHERE p.data_fim IS NULL` : sql``}
      ORDER BY p.data_inicio DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    const totalResult = await db.execute(sql`
      SELECT COUNT(*) as total 
      FROM paradas_maquina
      ${ativas ? sql`WHERE data_fim IS NULL` : sql``}
    `);

    const total = Number(totalResult.rows[0]?.total || 0);

    const data = result.rows.map((row: any) => ({
      id: row.id,
      maquinaId: row.maquina_id,
      operadorId: row.operador_id,
      motivoParadaId: row.motivo_parada_id,
      observacoes: row.observacoes,
      dataInicio: row.data_inicio,
      dataFim: row.data_fim,
      opId: row.op_id,
      maquina: {
        nome: row.maquina_nome,
        codigo: row.maquina_codigo,
      },
      operador: {
        nome: row.operador_nome,
        matricula: row.operador_matricula,
      },
      motivo: {
        descricao: row.motivo_descricao,
        codigo: row.motivo_codigo,
      },
      op: row.op_numero ? {
        op: row.op_numero,
        produto: row.op_produto,
      } : null,
    }));

    console.log(`✅ Retornando ${data.length} paradas`);

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error('❌ Erro ao buscar paradas:', error);
    return NextResponse.json(
      { error: 'Erro interno ao buscar paradas' },
      { status: 500 }
    );
  }
}

// POST - Criar nova parada (COM LOGS DETALHADOS)
export async function POST(request: Request) {
  console.log('='.repeat(50));
  console.log('📦 POST /api/paradas-maquina - INICIANDO');
  console.log('='.repeat(50));
  
  try {
    // 1. Verificar autenticação
    console.log('🔐 Verificando autenticação...');
    const session = await getServerSession(authOptions);
    console.log('👤 Sessão:', session ? {
      id: session.user?.id,
      nome: session.user?.nome,
      nivel: session.user?.nivel
    } : '❌ Nenhuma sessão encontrada');
    
    if (!session) {
      console.log('❌ Não autorizado - sessão ausente');
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // 2. Receber body
    console.log('📨 Recebendo body da requisição...');
    const body = await request.json();
    console.log('📦 Body recebido (RAW):', body);
    console.log('📦 Body recebido (JSON):', JSON.stringify(body, null, 2));

    // 3. Validar campos obrigatórios manualmente
    console.log('🔍 Validando campos obrigatórios...');
    
    const errors = [];
    
    if (!body.maquinaId) {
      errors.push('maquinaId é obrigatório');
      console.log('❌ maquinaId ausente');
    } else {
      console.log('✅ maquinaId presente:', body.maquinaId);
    }
    
    if (!body.motivoParadaId) {
      errors.push('motivoParadaId é obrigatório');
      console.log('❌ motivoParadaId ausente');
    } else {
      console.log('✅ motivoParadaId presente:', body.motivoParadaId);
    }
    
    if (!body.dataInicio) {
      errors.push('dataInicio é obrigatório');
      console.log('❌ dataInicio ausente');
    } else {
      console.log('✅ dataInicio presente:', body.dataInicio);
    }

    if (errors.length > 0) {
      console.log('❌ Erros de validação:', errors);
      return NextResponse.json(
        { error: 'Campos obrigatórios ausentes', detalhes: errors },
        { status: 400 }
      );
    }

    // 4. Validar UUIDs
    console.log('🔍 Validando UUIDs...');
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (!uuidRegex.test(body.maquinaId)) {
      console.log('❌ maquinaId não é UUID válido:', body.maquinaId);
      return NextResponse.json(
        { error: 'ID da máquina inválido' },
        { status: 400 }
      );
    }
    console.log('✅ maquinaId é UUID válido');

    if (!uuidRegex.test(body.motivoParadaId)) {
      console.log('❌ motivoParadaId não é UUID válido:', body.motivoParadaId);
      return NextResponse.json(
        { error: 'ID do motivo inválido' },
        { status: 400 }
      );
    }
    console.log('✅ motivoParadaId é UUID válido');

    // 5. Validar operadorId (se veio)
    if (body.operadorId) {
      if (!uuidRegex.test(body.operadorId)) {
        console.log('❌ operadorId não é UUID válido:', body.operadorId);
        return NextResponse.json(
          { error: 'ID do operador inválido' },
          { status: 400 }
        );
      }
      console.log('✅ operadorId é UUID válido');
    } else {
      console.log('⚠️ operadorId não informado, usando ID da sessão');
    }

    // 6. Validar data
    console.log('🔍 Validando data...');
    const dataInicio = new Date(body.dataInicio);
    if (isNaN(dataInicio.getTime())) {
      console.log('❌ dataInicio inválida:', body.dataInicio);
      return NextResponse.json(
        { error: 'Data início inválida' },
        { status: 400 }
      );
    }
    console.log('✅ dataInicio válida:', dataInicio.toISOString());

    // 7. Validar opId (se veio)
    if (body.opId) {
      const opIdNum = Number(body.opId);
      if (isNaN(opIdNum) || opIdNum <= 0) {
        console.log('❌ opId inválido:', body.opId);
        return NextResponse.json(
          { error: 'OP inválida' },
          { status: 400 }
        );
      }
      console.log('✅ opId válido:', opIdNum);
    }

    // 8. Verificar se máquina existe
    console.log('🔍 Verificando se máquina existe...');
    const maquina = await db.query.maquinas.findFirst({
      where: eq(maquinas.id, body.maquinaId),
    });

    if (!maquina) {
      console.log('❌ Máquina não encontrada:', body.maquinaId);
      return NextResponse.json(
        { error: 'Máquina não encontrada' },
        { status: 404 }
      );
    }
    console.log('✅ Máquina encontrada:', maquina.nome);

    // 9. Preparar dados para inserção
    const dadosInserir: any = {
      maquinaId: body.maquinaId,
      operadorId: body.operadorId || session.user.id,
      motivoParadaId: body.motivoParadaId,
      dataInicio: dataInicio,
      observacoes: body.observacoes || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (body.opId) {
      dadosInserir.opId = Number(body.opId);
    }

    console.log('💾 Dados preparados para inserção:', JSON.stringify(dadosInserir, null, 2));

    // 10. Inserir no banco
    console.log('📥 Inserindo no banco...');
    const [novaParada] = await db
      .insert(paradasMaquina)
      .values(dadosInserir)
      .returning();

    console.log('✅ Parada criada com sucesso! ID:', novaParada.id);

    // 11. Atualizar status da máquina
    console.log('🔄 Atualizando status da máquina para PARADA...');
    await db
      .update(maquinas)
      .set({ 
        status: 'PARADA',
        updatedAt: new Date() 
      })
      .where(eq(maquinas.id, body.maquinaId));
    
    console.log('✅ Status da máquina atualizado');

    console.log('='.repeat(50));
    console.log('🎉 PROCESSO CONCLUÍDO COM SUCESSO!');
    console.log('='.repeat(50));

    return NextResponse.json(novaParada, { status: 201 });

  } catch (error) {
    console.error('❌ ERRO NÃO TRATADO:', error);
    console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'N/A');
    
    if (error instanceof z.ZodError) {
      console.error('❌ Erro de validação Zod:', error.errors);
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