import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

interface ApontamentoRow {
  id: string;
  op_id: number;
  maquina_id: string;
  produto_id: string | null;
  estagio_id: string | null;
  operador_inicio_id: string;
  operador_fim_id: string | null;
  metragem_processada: string | null;
  data_inicio: string;
  data_fim: string;
  status: string;
  motivo_parada_id: string | null;
  inicio_parada: string | null;
  fim_parada: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  op_numero: number | null;
  op_produto: string | null;
  maquina_nome: string | null;
  maquina_codigo: string | null;
  operador_inicio_nome: string | null;
  operador_inicio_matricula: string | null;
  operador_fim_nome: string | null;
  operador_fim_matricula: string | null;
  motivo_descricao: string | null;
}

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

    // Buscar apontamentos
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
        mp.descricao as motivo_descricao
      FROM apontamentos a
      LEFT JOIN ops o ON a.op_id = o.op
      LEFT JOIN maquinas m ON a.maquina_id = m.id
      LEFT JOIN usuarios ui ON a.operador_inicio_id = ui.id
      LEFT JOIN usuarios uf ON a.operador_fim_id = uf.id
      LEFT JOIN motivos_parada mp ON a.motivo_parada_id = mp.id
      ORDER BY a.data_inicio DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    // Converter com segurança
    const rows = result.rows.map(row => ({
      id: String(row.id || ''),
      op_id: Number(row.op_id || 0),
      maquina_id: String(row.maquina_id || ''),
      produto_id: row.produto_id ? String(row.produto_id) : null,
      estagio_id: row.estagio_id ? String(row.estagio_id) : null,
      operador_inicio_id: String(row.operador_inicio_id || ''),
      operador_fim_id: row.operador_fim_id ? String(row.operador_fim_id) : null,
      metragem_processada: row.metragem_processada ? String(row.metragem_processada) : null,
      data_inicio: String(row.data_inicio || ''),
      data_fim: String(row.data_fim || ''),
      status: String(row.status || ''),
      motivo_parada_id: row.motivo_parada_id ? String(row.motivo_parada_id) : null,
      inicio_parada: row.inicio_parada ? String(row.inicio_parada) : null,
      fim_parada: row.fim_parada ? String(row.fim_parada) : null,
      observacoes: row.observacoes ? String(row.observacoes) : null,
      created_at: String(row.created_at || ''),
      updated_at: String(row.updated_at || ''),
      op_numero: row.op_numero ? Number(row.op_numero) : null,
      op_produto: row.op_produto ? String(row.op_produto) : null,
      maquina_nome: row.maquina_nome ? String(row.maquina_nome) : null,
      maquina_codigo: row.maquina_codigo ? String(row.maquina_codigo) : null,
      operador_inicio_nome: row.operador_inicio_nome ? String(row.operador_inicio_nome) : null,
      operador_inicio_matricula: row.operador_inicio_matricula ? String(row.operador_inicio_matricula) : null,
      operador_fim_nome: row.operador_fim_nome ? String(row.operador_fim_nome) : null,
      operador_fim_matricula: row.operador_fim_matricula ? String(row.operador_fim_matricula) : null,
      motivo_descricao: row.motivo_descricao ? String(row.motivo_descricao) : null,
    }));

    // Contar total
    const totalResult = await db.execute(sql`
      SELECT COUNT(*) as total FROM apontamentos
    `);

    const total = Number(totalResult.rows[0]?.total || 0);

    // Formatar os dados para o frontend
    const data = rows.map(row => ({
      id: row.id,
      opId: row.op_id,
      maquinaId: row.maquina_id,
      operadorInicioId: row.operador_inicio_id,
      operadorFimId: row.operador_fim_id,
      metragemProcessada: row.metragem_processada ? parseFloat(row.metragem_processada) : null,
      dataInicio: row.data_inicio,
      dataFim: row.data_fim,
      status: row.status,
      motivoParadaId: row.motivo_parada_id,
      inicioParada: row.inicio_parada,
      fimParada: row.fim_parada,
      observacoes: row.observacoes,
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
      } : null
    }));

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
    console.error('❌ Erro detalhado:', error);
    return NextResponse.json(
      { error: 'Erro interno ao buscar apontamentos', details: String(error) },
      { status: 500 }
    );
  }
}