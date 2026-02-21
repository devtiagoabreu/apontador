import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { produtos } from '@/lib/db/schema/produtos';
import { ops } from '@/lib/db/schema/ops';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const productoSchema = z.object({
  codigo: z.string().min(1, 'Código é obrigatório'),
  nome: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  um: z.string().min(1, 'Unidade de medida é obrigatória'),
  nivel: z.string().optional().nullable(),
  grupo: z.string().optional().nullable(),
  sub: z.string().optional().nullable(),
  item: z.string().optional().nullable(),
  composicao: z.any(),
  largura: z.number(),
  gramaturaLinear: z.number(),
  gramaturaM2: z.number(),
  tipoTecido: z.enum(['PLANO', 'MALHA', 'NAO_TECIDO']),
  ligamento: z.string(),
  fiosUrdume: z.number(), // Este é number no banco
  fiosTrama: z.number(),   // Este é number no banco
  classificacaoPeso: z.enum(['LEVE', 'MEDIO', 'PESADO']),
  parametrosEficiencia: z.any(),
  metaDiaria: z.number().optional().nullable(),
  metaMensal: z.number().optional().nullable(),
  ativo: z.boolean(),
});

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const produto = await db.query.produtos.findFirst({
      where: eq(produtos.id, params.id),
    });

    if (!produto) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(produto);
  } catch (error) {
    console.error('Erro ao buscar produto:', error);
    return NextResponse.json(
      { error: 'Erro interno ao buscar produto' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    
    // Validar dados
    const validated = productoSchema.parse(body);

    // Verificar se produto existe
    const existing = await db.query.produtos.findFirst({
      where: eq(produtos.id, params.id),
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404 }
      );
    }

    // Se mudou o código, verificar se já existe
    if (validated.codigo !== existing.codigo) {
      const codigoExistente = await db.query.produtos.findFirst({
        where: eq(produtos.codigo, validated.codigo),
      });

      if (codigoExistente) {
        return NextResponse.json(
          { error: 'Código já cadastrado para outro produto' },
          { status: 400 }
        );
      }
    }

    // Atualizar produto - CORRIGIDO definindo os tipos corretos para cada campo
    const [updated] = await db
      .update(produtos)
      .set({
        // Campos string
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
        
        // Campos decimal (vão como string)
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
        
        // Timestamp
        updatedAt: new Date(),
      })
      .where(eq(produtos.id, params.id))
      .returning();

    return NextResponse.json(updated);

  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', detalhes: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erro interno ao atualizar produto' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Verificar se produto existe
    const existing = await db.query.produtos.findFirst({
      where: eq(produtos.id, params.id),
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se produto está sendo usado em OPs
    const opsComProduto = await db.query.ops.findFirst({
      where: eq(ops.produto, existing.codigo),
    });

    if (opsComProduto) {
      return NextResponse.json(
        { error: 'Não é possível excluir produto que está vinculado a OPs' },
        { status: 400 }
      );
    }

    // Excluir produto
    await db.delete(produtos).where(eq(produtos.id, params.id));

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Erro ao excluir produto:', error);
    return NextResponse.json(
      { error: 'Erro interno ao excluir produto' },
      { status: 500 }
    );
  }
}