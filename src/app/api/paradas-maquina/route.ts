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

// POST - Criar nova parada
export async function POST(request: Request) {
  console.log('📦 POST /api/paradas-maquina - Iniciando');
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      console.log('❌ Não autorizado');
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    console.log('📦 Body recebido:', JSON.stringify(body, null, 2));

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