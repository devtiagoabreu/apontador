// src/app/api/produtos/route.ts (manter essa linha de comentário)
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { produtos } from '@/lib/db/schema/produtos';
import { eq, desc, sql } from 'drizzle-orm';
import { z } from 'zod';

// Schema de validação
const productoSchema = z.object({
  codigo: z.string().min(1, 'Código é obrigatório'),
  nome: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  um: z.string().min(1, 'Unidade de medida é obrigatória'),
  nivel: z.string().optional().nullable(),
  grupo: z.string().optional().nullable(),
  sub: z.string().optional().nullable(),
  item: z.string().optional().nullable(),
  composicao: z.any().default({}),
  largura: z.number().default(0),
  gramaturaLinear: z.number().default(0),
  gramaturaM2: z.number().default(0),
  tipoTecido: z.enum(['PLANO', 'MALHA', 'NAO_TECIDO']).default('PLANO'),
  ligamento: z.string().default('TELA'),
  fiosUrdume: z.number().default(0),
  fiosTrama: z.number().default(0),
  classificacaoPeso: z.enum(['LEVE', 'MEDIO', 'PESADO']).default('MEDIO'),
  parametrosEficiencia: z.any().default({}),
  metaDiaria: z.number().optional().nullable(),
  metaMensal: z.number().optional().nullable(),
  ativo: z.boolean().default(true),
});

export async function GET(request: Request) {
  console.log('📦 GET /api/produtos - Iniciando');
  
  try {
    const session = await getServerSession(authOptions);
    console.log('👤 Sessão:', session?.user?.email);
    
    if (!session) {
      console.log('❌ Não autorizado');
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;
    const search = searchParams.get('search');

    console.log(`📊 Buscando produtos - página ${page}, limite ${limit}, busca: ${search}`);

    let query = db.select().from(produtos);

    // Aplicar busca se fornecida
    if (search) {
      query = query.where(
        sql`${produtos.codigo} ILIKE ${'%' + search + '%'} OR ${produtos.nome} ILIKE ${'%' + search + '%'}`
      ) as any;
    }

    const allProdutos = await query
      .orderBy(desc(produtos.createdAt))
      .limit(limit)
      .offset(offset);

    // Contar total
    let countQuery = sql`SELECT COUNT(*) as count FROM produtos`;
    if (search) {
      countQuery = sql`SELECT COUNT(*) as count FROM produtos WHERE codigo ILIKE ${'%' + search + '%'} OR nome ILIKE ${'%' + search + '%'}`;
    }

    const totalResult = await db.execute(countQuery);
    const total = parseInt(String(totalResult.rows[0]?.count || '0'));

    console.log(`✅ Retornando ${allProdutos.length} produtos de ${total} total`);

    return NextResponse.json({
      data: allProdutos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('❌ Erro detalhado:', error);
    return NextResponse.json(
      { 
        error: 'Erro interno ao buscar produtos',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  console.log('='.repeat(50));
  console.log('📦 POST /api/produtos - CRIAR PRODUTO');
  console.log('='.repeat(50));
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    console.log('📦 Body recebido:', JSON.stringify(body, null, 2));
    
    // Validar dados
    const validated = productoSchema.parse(body);
    console.log('✅ Dados validados:', validated);

    // Verificar se código já existe
    const existing = await db.query.produtos.findFirst({
      where: eq(produtos.codigo, validated.codigo),
    });

    if (existing) {
      console.log('❌ Código já existe:', validated.codigo);
      return NextResponse.json(
        { error: 'Código já cadastrado' },
        { status: 400 }
      );
    }

    // Inserir produto
    const [newProduto] = await db
      .insert(produtos)
      .values({
        codigo: validated.codigo,
        nome: validated.nome,
        um: validated.um,
        nivel: validated.nivel,
        grupo: validated.grupo,
        sub: validated.sub,
        item: validated.item,
        tipoTecido: validated.tipoTecido,
        ligamento: validated.ligamento,
        classificacaoPeso: validated.classificacaoPeso,
        composicao: validated.composicao,
        parametrosEficiencia: validated.parametrosEficiencia,
        largura: validated.largura?.toString(),
        gramaturaLinear: validated.gramaturaLinear?.toString(),
        gramaturaM2: validated.gramaturaM2?.toString(),
        metaDiaria: validated.metaDiaria?.toString(),
        metaMensal: validated.metaMensal?.toString(),
        fiosUrdume: validated.fiosUrdume,
        fiosTrama: validated.fiosTrama,
        ativo: validated.ativo,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    console.log('✅ Produto criado com sucesso:', newProduto.id);

    return NextResponse.json(newProduto, { status: 201 });

  } catch (error) {
    console.error('❌ Erro ao criar produto:', error);
    
    if (error instanceof z.ZodError) {
      console.error('❌ Erros de validação:', error.errors);
      return NextResponse.json(
        { error: 'Dados inválidos', detalhes: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erro interno ao criar produto' },
      { status: 500 }
    );
  }
}