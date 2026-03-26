// src/app/api/producoes-avulsas/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { producoesAvulsas } from '@/lib/db/schema/producoes-avulsas';
import { maquinas } from '@/lib/db/schema/maquinas';
import { eq, sql, desc } from 'drizzle-orm';
import { z } from 'zod';

// Schema de validação para iniciar produção avulsa
const iniciarAvulsoSchema = z.object({
  maquinaId: z.string().uuid('Máquina inválida'),
  produtoId: z.string().uuid('Produto inválido'),
  estagioId: z.string().uuid('Estágio inválido'),
  observacoes: z.string().optional(),
});

/**
 * GET: Lista as produções avulsas (Portadas/Carrolões)
 * Utiliza SQL Raw com Joins para performance no Dashboard, seguindo o padrão das rotas de OPs.
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Busca enriquecida com JOINs para o Dashboard Administrativo [1-5]
    const result = await db.execute(sql`
      SELECT 
        pa.id,
        pa.status,
        pa.data_inicio,
        pa.data_fim,
        pa.metragem,
        p.codigo as produto_codigo,
        p.nome as produto_nome,
        m.nome as maquina_nome,
        m.codigo as maquina_codigo,
        ui.nome as operador_inicio_nome,
        uf.nome as operador_fim_nome,
        e.nome as estagio_nome
      FROM producoes_avulsas pa
      JOIN produtos p ON pa.produto_id = p.id
      JOIN maquinas m ON pa.maquina_id = m.id
      JOIN usuarios ui ON pa.operador_inicio_id = ui.id
      LEFT JOIN usuarios uf ON pa.operador_fim_id = uf.id
      JOIN estagios e ON pa.estagio_id = e.id
      ORDER BY pa.data_inicio DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    // Contagem total para paginação
    const totalRes = await db.execute(sql`SELECT COUNT(*) as count FROM producoes_avulsas`);

    // CORREÇÃO: Acessar o índice  e usar 'as any' para o TypeScript permitir o acesso ao campo 'count'
    const total = parseInt(String((totalRes.rows as any)?.count || '0'));

    return NextResponse.json({
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao buscar produções avulsas:', error);
    return NextResponse.json({ error: 'Erro interno ao buscar dados' }, { status: 500 });
  }
}

/**
 * POST: Inicia um novo registro de produção avulsa
 * Realiza operação transacional para garantir que a máquina mude de status.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const validated = iniciarAvulsoSchema.parse(body);
    const agora = new Date();

    // 1. Verificar se a máquina existe e está disponível [9, 10]
    const maquina = await db.query.maquinas.findFirst({
      where: eq(maquinas.id, validated.maquinaId),
    });

    if (!maquina) {
      return NextResponse.json({ error: 'Máquina não encontrada' }, { status: 404 });
    }

    // 2. Executar transação de início [11-13]
    const result = await db.transaction(async (tx) => {
      // Criar o registro na tabela isolada de produções avulsas
      const [novaProducao] = await tx.insert(producoesAvulsas).values({
        maquinaId: validated.maquinaId,
        produtoId: validated.produtoId,
        estagioId: validated.estagioId,
        operadorInicioId: session.user.id, // Crédito para quem iniciou
        status: 'EM_ANDAMENTO',
        observacoes: validated.observacoes || null,
        dataInicio: agora,
        createdAt: agora,
        updatedAt: agora,
      }).returning();

      // Atualizar status da máquina para EM_PROCESSO [10, 14, 15]
      await tx.update(maquinas)
        .set({ 
          status: 'EM_PROCESSO', 
          updatedAt: agora 
        })
        .where(eq(maquinas.id, validated.maquinaId));

      return novaProducao;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Erro ao iniciar produção avulsa:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos', detalhes: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Erro interno ao iniciar processo avulso' }, { status: 500 });
  }
}