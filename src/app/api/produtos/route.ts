import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { produtos } from '@/lib/db/schema/produtos';
import { eq, desc } from 'drizzle-orm';
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
  composicao: z.object({
    algodao: z.object({ percentual: z.number(), fio: z.string() }),
    poliester: z.object({ percentual: z.number(), fio: z.string() }),
    elastano: z.object({ percentual: z.number(), fio: z.string() }),
    linho: z.object({ percentual: z.number(), fio: z.string() }),
    viscoso: z.object({ percentual: z.number(), fio: z.string() }),
    acrilico: z.object({ percentual: z.number(), fio: z.string() }),
  }).default({
    algodao: { percentual: 0, fio: '' },
    poliester: { percentual: 0, fio: '' },
    elastano: { percentual: 0, fio: '' },
    linho: { percentual: 0, fio: '' },
    viscoso: { percentual: 0, fio: '' },
    acrilico: { percentual: 0, fio: '' }
  }),
  largura: z.number().default(0),
  gramaturaLinear: z.number().default(0),
  gramaturaM2: z.number().default(0),
  tipoTecido: z.enum(['PLANO', 'MALHA', 'NAO_TECIDO']).default('PLANO'),
  ligamento: z.string().default('TELA'),
  fiosUrdume: z.number().default(0),
  fiosTrama: z.number().default(0),
  classificacaoPeso: z.enum(['LEVE', 'MEDIO', 'PESADO']).default('MEDIO'),
  parametrosEficiencia: z.object({
    preparacao: z.object({ tempoPadrao: z.number(), rendimento: z.number(), velocidade: z.number() }),
    tingimento: z.object({ tempoPadrao: z.number(), rendimento: z.number(), velocidade: z.number() }),
    alvejamento: z.object({ tempoPadrao: z.number(), rendimento: z.number(), velocidade: z.number() }),
    secagem: z.object({ tempoPadrao: z.number(), rendimento: z.number(), velocidade: z.number() }),
    estamparia: z.object({ tempoPadrao: z.number(), rendimento: z.number(), velocidade: z.number() }),
    acabamento: z.object({ tempoPadrao: z.number(), rendimento: z.number(), velocidade: z.number() }),
    revisao: z.object({ tempoPadrao: z.number(), rendimento: z.number(), velocidade: z.number() }),
  }).default({
    preparacao: { tempoPadrao: 0, rendimento: 100, velocidade: 0 },
    tingimento: { tempoPadrao: 0, rendimento: 100, velocidade: 0 },
    alvejamento: { tempoPadrao: 0, rendimento: 100, velocidade: 0 },
    secagem: { tempoPadrao: 0, rendimento: 100, velocidade: 0 },
    estamparia: { tempoPadrao: 0, rendimento: 100, velocidade: 0 },
    acabamento: { tempoPadrao: 0, rendimento: 100, velocidade: 0 },
    revisao: { tempoPadrao: 0, rendimento: 100, velocidade: 0 }
  }),
  metaDiaria: z.number().optional().nullable(),
  metaMensal: z.number().optional().nullable(),
  ativo: z.boolean().default(true),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const allProdutos = await db
      .select()
      .from(produtos)
      .orderBy(desc(produtos.createdAt));

    return NextResponse.json(allProdutos);
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    return NextResponse.json(
      { error: 'Erro interno ao buscar produtos' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    
    // Validar dados
    const validated = productoSchema.parse(body);

    // Verificar se código já existe
    const existing = await db.query.produtos.findFirst({
      where: eq(produtos.codigo, validated.codigo),
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Código já cadastrado' },
        { status: 400 }
      );
    }

    // Inserir produto - CORRIGIDO com tipos corretos
    const [newProduto] = await db
      .insert(produtos)
      .values({
        // Campos string (varchar)
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
        
        // Campos JSON
        composicao: validated.composicao,
        parametrosEficiencia: validated.parametrosEficiencia,
        
        // Campos decimal (vão como string no banco)
        largura: validated.largura?.toString(),
        gramaturaLinear: validated.gramaturaLinear?.toString(),
        gramaturaM2: validated.gramaturaM2?.toString(),
        metaDiaria: validated.metaDiaria?.toString(),
        metaMensal: validated.metaMensal?.toString(),
        
        // Campos integer (vão como number)
        fiosUrdume: validated.fiosUrdume,
        fiosTrama: validated.fiosTrama,
        
        // Campos boolean
        ativo: validated.ativo,
        
        // Timestamps
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json(newProduto, { status: 201 });

  } catch (error) {
    console.error('Erro ao criar produto:', error);
    
    if (error instanceof z.ZodError) {
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