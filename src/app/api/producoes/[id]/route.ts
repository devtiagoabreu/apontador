import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { producoesTable } from '@/lib/db/schema/producoes';
import { ops } from '@/lib/db/schema/ops';
import { maquinas } from '@/lib/db/schema/maquinas';
import { usuarios } from '@/lib/db/schema/usuarios';
import { estagios } from '@/lib/db/schema/estagios';
import { sql, eq } from 'drizzle-orm';
import { z } from 'zod';

// Funções auxiliares para conversão segura
const safeParseFloat = (value: any): number | null => {
  if (value === null || value === undefined) return null;
  const str = String(value);
  if (str.trim() === '') return null;
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
};

const safeParseBoolean = (value: any): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true' || value === '1';
  }
  if (typeof value === 'number') return value === 1;
  return false;
};

const safeParseInt = (value: any): number | null => {
  if (value === null || value === undefined) return null;
  const str = String(value);
  if (str.trim() === '') return null;
  const num = parseInt(str, 10);
  return isNaN(num) ? null : num;
};

const safeParseString = (value: any): string => {
  if (value === null || value === undefined) return '';
  return String(value);
};

// 🔴 SCHEMA CORRIGIDO - TODOS OS CAMPOS OPCIONAIS E ACEITANDO STRINGS VAZIAS
const atualizarProducaoSchema = z.object({
  opId: z.union([z.string(), z.number()]).optional().nullable()
    .transform(val => val ? Number(val) : undefined),
  maquinaId: z.string().uuid().optional().nullable()
    .transform(val => val || undefined),
  estagioId: z.string().uuid().optional().nullable()
    .transform(val => val || undefined),
  operadorInicioId: z.string().uuid().optional().nullable()
    .transform(val => val || undefined),
  operadorFimId: z.string().uuid().optional().nullable()
    .transform(val => val || null),
  dataInicio: z.string().optional().nullable()
    .transform(val => val || undefined),
  dataFim: z.string().optional().nullable()
    .transform(val => val || null),
  metragemProgramada: z.union([z.string(), z.number()]).optional().nullable()
    .transform(val => val ? Number(val) : null),
  metragemProcessada: z.union([z.string(), z.number()]).optional().nullable()
    .transform(val => val ? Number(val) : null),
  observacoes: z.string().optional().nullable()
    .transform(val => val || null),
  isReprocesso: z.boolean().optional().nullable()
    .transform(val => val ?? undefined),
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

    console.log('🔍 Buscando produção por ID:', params.id);

    const result = await db.execute(sql`
      SELECT 
        p.*,
        o.op as op_numero,
        o.produto as op_produto,
        o.qtde_programado as op_programado,
        o.um as op_um,
        m.nome as maquina_nome,
        m.codigo as maquina_codigo,
        ui.nome as operador_inicio_nome,
        ui.matricula as operador_inicio_matricula,
        uf.nome as operador_fim_nome,
        uf.matricula as operador_fim_matricula,
        e.nome as estagio_nome,
        e.codigo as estagio_codigo,
        e.cor as estagio_cor
      FROM producoes p
      LEFT JOIN ops o ON p.op_id = o.op
      LEFT JOIN maquinas m ON p.maquina_id = m.id
      LEFT JOIN usuarios ui ON p.operador_inicio_id = ui.id
      LEFT JOIN usuarios uf ON p.operador_fim_id = uf.id
      LEFT JOIN estagios e ON p.estagio_id = e.id
      WHERE p.id = ${params.id}
    `);

    if (result.rows.length === 0) {
      console.log('❌ Produção não encontrada:', params.id);
      return NextResponse.json(
        { error: 'Produção não encontrada' },
        { status: 404 }
      );
    }

    const row = result.rows[0];
    
    const producao = {
      id: safeParseString(row.id),
      opId: safeParseInt(row.op_id),
      maquinaId: safeParseString(row.maquina_id),
      operadorInicioId: safeParseString(row.operador_inicio_id),
      operadorFimId: safeParseString(row.operador_fim_id) || null,
      estagioId: safeParseString(row.estagio_id),
      dataInicio: safeParseString(row.data_inicio),
      dataFim: safeParseString(row.data_fim) || null,
      metragemProgramada: safeParseFloat(row.metragem_programada),
      metragemProcessada: safeParseFloat(row.metragem_processada),
      isReprocesso: safeParseBoolean(row.is_reprocesso),
      observacoes: safeParseString(row.observacoes) || null,
      createdAt: safeParseString(row.created_at),
      updatedAt: safeParseString(row.updated_at),
      op: {
        op: safeParseInt(row.op_numero),
        produto: safeParseString(row.op_produto),
        programado: safeParseFloat(row.op_programado),
        um: safeParseString(row.op_um),
      },
      maquina: {
        nome: safeParseString(row.maquina_nome),
        codigo: safeParseString(row.maquina_codigo),
      },
      operadorInicio: {
        nome: safeParseString(row.operador_inicio_nome),
        matricula: safeParseString(row.operador_inicio_matricula),
      },
      operadorFim: row.operador_fim_nome ? {
        nome: safeParseString(row.operador_fim_nome),
        matricula: safeParseString(row.operador_fim_matricula),
      } : null,
      estagio: {
        nome: safeParseString(row.estagio_nome),
        codigo: safeParseString(row.estagio_codigo),
        cor: safeParseString(row.estagio_cor) || '#3b82f6',
      },
    };

    console.log('✅ Produção encontrada:', producao.id);

    return NextResponse.json(producao);

  } catch (error) {
    console.error('❌ Erro ao buscar produção:', error);
    return NextResponse.json(
      { error: 'Erro interno ao buscar produção' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log('='.repeat(50));
  console.log('📦 PUT /api/producoes/[id] - ATUALIZAR PRODUÇÃO');
  console.log('='.repeat(50));
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      console.log('❌ Não autorizado');
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    console.log('🔍 ID da produção:', params.id);

    const body = await request.json();
    console.log('📦 Body recebido:', JSON.stringify(body, null, 2));

    // Validar dados com schema corrigido
    let validated;
    try {
      validated = atualizarProducaoSchema.parse(body);
      console.log('✅ Dados validados:', JSON.stringify(validated, null, 2));
    } catch (validationError) {
      console.error('❌ Erro de validação:', validationError);
      if (validationError instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Dados inválidos', detalhes: validationError.errors },
          { status: 400 }
        );
      }
      throw validationError;
    }

    // Verificar se produção existe
    const producao = await db.execute(sql`
      SELECT * FROM producoes WHERE id = ${params.id}
    `);

    if (producao.rows.length === 0) {
      console.log('❌ Produção não encontrada');
      return NextResponse.json(
        { error: 'Produção não encontrada' },
        { status: 404 }
      );
    }

    // Construir query de atualização DINAMICAMENTE
    let updateQuery = sql`UPDATE producoes SET `;
    const updates: any[] = [];

    // Adicionar cada campo se foi fornecido (ignorar undefined)
    if (validated.opId !== undefined) {
      updates.push(sql`op_id = ${validated.opId}`);
    }
    if (validated.maquinaId !== undefined) {
      updates.push(sql`maquina_id = ${validated.maquinaId}`);
    }
    if (validated.estagioId !== undefined) {
      updates.push(sql`estagio_id = ${validated.estagioId}`);
    }
    if (validated.operadorInicioId !== undefined) {
      updates.push(sql`operador_inicio_id = ${validated.operadorInicioId}`);
    }
    if (validated.operadorFimId !== undefined) {
      updates.push(sql`operador_fim_id = ${validated.operadorFimId}`);
    }
    if (validated.dataInicio !== undefined) {
      updates.push(sql`data_inicio = ${validated.dataInicio}`);
    }
    if (validated.dataFim !== undefined) {
      updates.push(sql`data_fim = ${validated.dataFim}`);
    }
    if (validated.metragemProgramada !== undefined) {
      updates.push(sql`metragem_programada = ${validated.metragemProgramada?.toString()}`);
    }
    if (validated.metragemProcessada !== undefined) {
      updates.push(sql`metragem_processada = ${validated.metragemProcessada?.toString()}`);
    }
    if (validated.observacoes !== undefined) {
      updates.push(sql`observacoes = ${validated.observacoes}`);
    }
    if (validated.isReprocesso !== undefined) {
      updates.push(sql`is_reprocesso = ${validated.isReprocesso}`);
    }

    // Sempre atualizar o updated_at
    updates.push(sql`updated_at = ${new Date()}`);

    if (updates.length === 0) {
      console.log('⚠️ Nenhum campo para atualizar');
      return NextResponse.json(
        { error: 'Nenhum campo para atualizar' },
        { status: 400 }
      );
    }

    // Combinar todas as atualizações
    updateQuery = sql`${updateQuery} ${sql.join(updates, sql`, `)} WHERE id = ${params.id} RETURNING *`;

    console.log('📝 Query de atualização:', updateQuery);

    // Executar atualização
    const result = await db.execute(updateQuery);
    const updated = result.rows[0];

    console.log('✅ Produção atualizada:', updated.id);

    return NextResponse.json(updated);

  } catch (error) {
    console.error('❌ ERRO:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', detalhes: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erro interno ao atualizar produção' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log('='.repeat(50));
  console.log('📦 DELETE /api/producoes/[id] - EXCLUIR PRODUÇÃO');
  console.log('='.repeat(50));
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      console.log('❌ Não autorizado');
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    console.log('🔍 ID da produção:', params.id);

    // Verificar se produção existe
    const producao = await db.execute(sql`
      SELECT * FROM producoes WHERE id = ${params.id}
    `);

    if (producao.rows.length === 0) {
      console.log('❌ Produção não encontrada');
      return NextResponse.json(
        { error: 'Produção não encontrada' },
        { status: 404 }
      );
    }

    // Excluir produção
    await db.execute(sql`
      DELETE FROM producoes WHERE id = ${params.id}
    `);

    console.log('✅ Produção excluída com sucesso');

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('❌ ERRO:', error);
    return NextResponse.json(
      { error: 'Erro interno ao excluir produção' },
      { status: 500 }
    );
  }
}