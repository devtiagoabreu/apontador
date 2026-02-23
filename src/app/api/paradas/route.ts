import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { apontamentos } from '@/lib/db/schema/apontamentos';
import { maquinas } from '@/lib/db/schema/maquinas';
import { motivosParada } from '@/lib/db/schema/motivos-parada'; // IMPORT ADICIONADO
import { ops } from '@/lib/db/schema/ops'; // IMPORT ADICIONADO
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { sql } from 'drizzle-orm';

const paradaSchema = z.object({
  maquinaId: z.string().uuid('Máquina inválida'),
  motivoParadaId: z.string().uuid('Motivo é obrigatório'),
  opId: z.number().int().positive().optional(), // OPCIONAL! Pode vir da OP em produção
  observacoes: z.string().optional(),
  dataInicio: z.string().datetime(),
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const validated = paradaSchema.parse(body);
    const agora = new Date();

    // Verificar se máquina existe
    const maquina = await db.query.maquinas.findFirst({
      where: eq(maquinas.id, validated.maquinaId),
    });

    if (!maquina) {
      return NextResponse.json(
        { error: 'Máquina não encontrada' },
        { status: 404 }
      );
    }

    // Verificar se já existe parada em andamento para esta máquina
    const paradaAtiva = await db.query.apontamentos.findFirst({
      where: and(
        eq(apontamentos.maquinaId, validated.maquinaId),
        eq(apontamentos.tipo, 'PARADA'),
        eq(apontamentos.status, 'EM_ANDAMENTO')
      ),
    });

    if (paradaAtiva) {
      return NextResponse.json(
        { error: 'Máquina já está em parada' },
        { status: 400 }
      );
    }

    // Preparar dados para inserção
    const dadosParaInserir: any = {
      tipo: 'PARADA',
      maquinaId: validated.maquinaId,
      motivoParadaId: validated.motivoParadaId,
      operadorInicioId: session.user.id,
      dataInicio: new Date(validated.dataInicio),
      dataFim: new Date(validated.dataInicio),
      status: 'EM_ANDAMENTO',
      observacoes: validated.observacoes,
      createdAt: agora,
      updatedAt: agora,
    };

    // Só adiciona opId se foi informado (vem da OP em produção)
    if (validated.opId) {
      dadosParaInserir.opId = validated.opId;
    }

    // Criar registro de parada
    const [novaParada] = await db
      .insert(apontamentos)
      .values(dadosParaInserir)
      .returning();

    // Atualizar status da máquina
    await db
      .update(maquinas)
      .set({
        status: 'PARADA',
        updatedAt: agora,
      })
      .where(eq(maquinas.id, validated.maquinaId));

    return NextResponse.json(novaParada, { status: 201 });

  } catch (error) {
    console.error('❌ Erro ao registrar parada:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', detalhes: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erro interno ao registrar parada' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const ativas = searchParams.get('ativas') === 'true';

    // Buscar paradas usando SQL raw para evitar problemas de tipo
    const result = await db.execute(sql`
      SELECT 
        a.*,
        m.nome as maquina_nome,
        m.codigo as maquina_codigo,
        mp.descricao as motivo_descricao,
        mp.codigo as motivo_codigo,
        o.op as op_numero,
        o.produto as op_produto
      FROM apontamentos a
      LEFT JOIN maquinas m ON a.maquina_id = m.id
      LEFT JOIN motivos_parada mp ON a.motivo_parada_id = mp.id
      LEFT JOIN ops o ON a.op_id = o.op
      WHERE a.tipo = 'PARADA'
      ${ativas ? sql`AND a.status = 'EM_ANDAMENTO'` : sql``}
      ORDER BY a.data_inicio DESC
    `);

    // Formatar resultado
    const paradas = result.rows.map(row => ({
      id: row.id,
      maquinaId: row.maquina_id,
      opId: row.op_id,
      motivoParadaId: row.motivo_parada_id,
      observacoes: row.observacoes,
      dataInicio: row.data_inicio,
      dataFim: row.data_fim,
      status: row.status,
      maquina: {
        nome: row.maquina_nome,
        codigo: row.maquina_codigo,
      },
      motivo: row.motivo_descricao ? {
        descricao: row.motivo_descricao,
        codigo: row.motivo_codigo,
      } : null,
      op: row.op_numero ? {
        op: row.op_numero,
        produto: row.op_produto,
      } : null,
    }));

    return NextResponse.json(paradas);

  } catch (error) {
    console.error('Erro ao buscar paradas:', error);
    return NextResponse.json(
      { error: 'Erro interno ao buscar paradas' },
      { status: 500 }
    );
  }
}