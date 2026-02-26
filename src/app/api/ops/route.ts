import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ops } from '@/lib/db/schema/ops';
import { eq, desc, sql } from 'drizzle-orm';
import { z } from 'zod';

const opSchema = z.object({
  op: z.number().int().positive(),
  produto: z.string().min(1),
  qtdeProgramado: z.number().optional().nullable(),
  qtdeCarregado: z.number().optional().nullable(),
  qtdeProduzida: z.number().optional().nullable(),
  um: z.string().optional().nullable(),
  narrativa: z.string().optional().nullable(),
  obs: z.string().optional().nullable(),
  status: z.enum(['ABERTA', 'EM_ANDAMENTO', 'FINALIZADA', 'CANCELADA']),
  codEstagioAtual: z.string().default('00'),
  estagioAtual: z.string().default('NENHUM'),
});

export async function GET(request: Request) {
  console.log('📦 GET /api/ops - Iniciando');
  
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    console.log(`📊 Buscando OPs - página ${page}, limite ${limit}`);

    const allOps = await db.select()
      .from(ops)
      .orderBy(desc(ops.dataImportacao))
      .limit(limit)
      .offset(offset);

    const totalResult = await db.execute(sql`SELECT COUNT(*) as count FROM ops`);
    const total = parseInt(String(totalResult.rows[0]?.count || '0'));

    console.log(`✅ Retornando ${allOps.length} OPs de ${total} total`);

    return NextResponse.json({
      data: allOps,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('❌ Erro ao buscar OPs:', error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  console.log('='.repeat(50));
  console.log('📦 POST /api/ops - CRIAR OP');
  console.log('='.repeat(50));
  
  try {
    const body = await request.json();
    console.log('📦 Body recebido:', JSON.stringify(body, null, 2));

    const validated = opSchema.parse(body);
    console.log('✅ Dados validados:', validated);

    // Verificar se OP já existe
    const existing = await db.query.ops.findFirst({
      where: eq(ops.op, validated.op),
    });

    if (existing) {
      console.log('❌ OP já existe:', validated.op);
      return NextResponse.json(
        { error: 'OP já existe' },
        { status: 400 }
      );
    }

    // 🔥 CONVERTER NÚMEROS PARA STRING ANTES DE INSERIR
    const dadosParaInserir = {
      op: validated.op,
      produto: validated.produto,
      qtdeProgramado: validated.qtdeProgramado?.toString(),
      qtdeCarregado: validated.qtdeCarregado?.toString(),
      qtdeProduzida: validated.qtdeProduzida?.toString(),
      um: validated.um,
      narrativa: validated.narrativa,
      obs: validated.obs,
      status: validated.status,
      codEstagioAtual: validated.codEstagioAtual,
      estagioAtual: validated.estagioAtual,
      dataImportacao: new Date(),
    };

    console.log('💾 Dados para inserir:', JSON.stringify(dadosParaInserir, null, 2));

    const [newOp] = await db
      .insert(ops)
      .values(dadosParaInserir)
      .returning();

    console.log('✅ OP criada com sucesso:', newOp.op);

    return NextResponse.json(newOp, { status: 201 });

  } catch (error) {
    console.error('❌ Erro:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', detalhes: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erro interno ao criar OP' },
      { status: 500 }
    );
  }
}