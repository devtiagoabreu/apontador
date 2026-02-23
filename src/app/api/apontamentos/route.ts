import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { apontamentos } from '@/lib/db/schema/apontamentos';
import { ops } from '@/lib/db/schema/ops';
import { maquinas } from '@/lib/db/schema/maquinas';
import { usuarios } from '@/lib/db/schema/usuarios';
import { motivosParada } from '@/lib/db/schema/motivos-parada';
import { estagios } from '@/lib/db/schema/estagios';
import { sql } from 'drizzle-orm';
import { z } from 'zod';

// Schema mais flexível para debug
const apontamentoSchema = z.object({
  tipo: z.enum(['PRODUCAO', 'PARADA']),
  maquinaId: z.string().uuid(),
  operadorInicioId: z.string().uuid(),
  operadorFimId: z.string().uuid().optional(),
  dataInicio: z.string().datetime(),
  dataFim: z.string().datetime(),
  status: z.enum(['EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO']),
  observacoes: z.string().optional(),
  opId: z.number().int().positive().optional(),
  estagioId: z.string().uuid().optional(),
  metragemProcessada: z.number().optional(),
  isReprocesso: z.boolean().optional(),
  motivoParadaId: z.string().uuid().optional(),
});

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

    console.log(`📊 Buscando apontamentos - página ${page}, limite ${limit}`);

    const result = await db.execute(sql`
      SELECT 
        a.*,
        o.op as op_numero,
        o.produto as op_produto,
        m.nome as maquina_nome,
        m.codigo as maquina_codigo,
        ui.nome as operador_inicio_nome,
        ui.matricula as operador_inicio_matricula,
        uf.nome as operador_fim_nome,
        uf.matricula as operador_fim_matricula,
        mp.descricao as motivo_descricao,
        e.nome as estagio_nome,
        e.codigo as estagio_codigo,
        e.cor as estagio_cor
      FROM apontamentos a
      LEFT JOIN ops o ON a.op_id = o.op
      LEFT JOIN maquinas m ON a.maquina_id = m.id
      LEFT JOIN usuarios ui ON a.operador_inicio_id = ui.id
      LEFT JOIN usuarios uf ON a.operador_fim_id = uf.id
      LEFT JOIN motivos_parada mp ON a.motivo_parada_id = mp.id
      LEFT JOIN estagios e ON a.estagio_id = e.id
      ORDER BY a.data_inicio DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    const totalResult = await db.execute(sql`
      SELECT COUNT(*) as total FROM apontamentos
    `);

    const total = Number(totalResult.rows[0]?.total || 0);

    const data = result.rows.map((row: any) => ({
      id: row.id,
      tipo: row.tipo,
      opId: row.op_id,
      maquinaId: row.maquina_id,
      operadorInicioId: row.operador_inicio_id,
      operadorFimId: row.operador_fim_id,
      metragemProcessada: row.metragem_processada ? parseFloat(row.metragem_processada) : null,
      dataInicio: row.data_inicio,
      dataFim: row.data_fim,
      status: row.status,
      motivoParadaId: row.motivo_parada_id,
      observacoes: row.observacoes,
      estagioId: row.estagio_id,
      isReprocesso: row.is_reprocesso || false,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      op: row.op_numero ? {
        op: row.op_numero,
        produto: row.op_produto
      } : null,
      maquina: row.maquina_nome ? {
        nome: row.maquina_nome,
        codigo: row.maquina_codigo
      } : null,
      operadorInicio: row.operador_inicio_nome ? {
        nome: row.operador_inicio_nome,
        matricula: row.operador_inicio_matricula
      } : null,
      operadorFim: row.operador_fim_nome ? {
        nome: row.operador_fim_nome,
        matricula: row.operador_fim_matricula
      } : null,
      motivoParada: row.motivo_descricao ? {
        descricao: row.motivo_descricao
      } : null,
      estagio: row.estagio_nome ? {
        nome: row.estagio_nome,
        codigo: row.estagio_codigo,
        cor: row.estagio_cor
      } : null
    }));

    console.log(`✅ Retornando ${data.length} apontamentos`);

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('❌ Erro ao buscar apontamentos:', error);
    return NextResponse.json(
      { error: 'Erro interno ao buscar apontamentos' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  console.log('📦 POST /api/apontamentos - Recebendo requisição');
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      console.log('❌ Não autorizado - sessão inválida');
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    console.log('👤 Usuário autenticado:', session.user.id);

    const body = await request.json();
    console.log('📦 Dados recebidos:', JSON.stringify(body, null, 2));

    // Validar dados
    const validated = apontamentoSchema.parse(body);
    console.log('✅ Dados validados com sucesso');

    const agora = new Date();

    // Preparar dados para inserção
    const dadosInserir: any = {
      tipo: validated.tipo,
      maquinaId: validated.maquinaId,
      operadorInicioId: validated.operadorInicioId,
      dataInicio: new Date(validated.dataInicio),
      dataFim: new Date(validated.dataFim),
      status: validated.status,
      observacoes: validated.observacoes || null,
      createdAt: agora,
      updatedAt: agora,
    };

    console.log('📝 Dados base preparados');

    // Adicionar campos opcionais apenas se existirem
    if (validated.operadorFimId) {
      dadosInserir.operadorFimId = validated.operadorFimId;
      console.log('➕ operadorFimId:', validated.operadorFimId);
    }

    if (validated.opId) {
      dadosInserir.opId = validated.opId;
      console.log('➕ opId:', validated.opId);
    }

    if (validated.estagioId) {
      dadosInserir.estagioId = validated.estagioId;
      console.log('➕ estagioId:', validated.estagioId);
    }

    if (validated.metragemProcessada !== undefined) {
      dadosInserir.metragemProcessada = validated.metragemProcessada.toString();
      console.log('➕ metragemProcessada:', validated.metragemProcessada);
    }

    if (validated.isReprocesso !== undefined) {
      dadosInserir.isReprocesso = validated.isReprocesso;
      console.log('➕ isReprocesso:', validated.isReprocesso);
    }

    if (validated.motivoParadaId) {
      dadosInserir.motivoParadaId = validated.motivoParadaId;
      console.log('➕ motivoParadaId:', validated.motivoParadaId);
    }

    console.log('💾 Inserindo no banco:', JSON.stringify(dadosInserir, null, 2));

    const [novoApontamento] = await db
      .insert(apontamentos)
      .values(dadosInserir)
      .returning();

    console.log('✅ Apontamento criado com sucesso:', novoApontamento.id);

    return NextResponse.json(novoApontamento, { status: 201 });

  } catch (error) {
    console.error('❌ Erro detalhado:', error);
    
    if (error instanceof z.ZodError) {
      console.error('❌ Erro de validação Zod:', error.errors);
      return NextResponse.json(
        { error: 'Dados inválidos', detalhes: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erro interno ao criar apontamento', details: String(error) },
      { status: 500 }
    );
  }
}