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
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { sql } from 'drizzle-orm';

const apontamentoSchema = z.object({
  opId: z.number().int().positive().optional(),
  maquinaId: z.string().uuid(),
  operadorInicioId: z.string().uuid(),
  operadorFimId: z.string().uuid().optional(),
  metragemProcessada: z.number().optional(),
  dataInicio: z.string().datetime(),
  dataFim: z.string().datetime(),
  status: z.enum(['EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO']),
  motivoParadaId: z.string().uuid().optional(),
  observacoes: z.string().optional(),
  estagioId: z.string().uuid().optional(),
  isReprocesso: z.boolean().optional(),
  tipo: z.enum(['PRODUCAO', 'PARADA']),
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

    // Buscar apontamento com joins usando SQL raw para evitar problemas de tipo
    const result = await db.execute(sql`
      SELECT 
        a.*,
        o.op as op_numero,
        o.produto as op_produto,
        o.cod_estagio_atual as op_cod_estagio,
        o.estagio_atual as op_estagio,
        m.nome as maquina_nome,
        m.codigo as maquina_codigo,
        ui.nome as operador_inicio_nome,
        ui.matricula as operador_inicio_matricula,
        uf.nome as operador_fim_nome,
        uf.matricula as operador_fim_matricula,
        mp.descricao as motivo_descricao,
        mp.codigo as motivo_codigo,
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
      WHERE a.id = ${params.id}
    `);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Apontamento não encontrado' },
        { status: 404 }
      );
    }

    const row = result.rows[0];

    // Formatar resposta
    const apontamento = {
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
      
      // Relacionamentos
      op: row.op_numero ? {
        op: row.op_numero,
        produto: row.op_produto,
        codEstagioAtual: row.op_cod_estagio,
        estagioAtual: row.op_estagio,
      } : null,
      
      maquina: {
        nome: row.maquina_nome,
        codigo: row.maquina_codigo,
      },
      
      operadorInicio: {
        nome: row.operador_inicio_nome,
        matricula: row.operador_inicio_matricula,
      },
      
      operadorFim: row.operador_fim_nome ? {
        nome: row.operador_fim_nome,
        matricula: row.operador_fim_matricula,
      } : null,
      
      motivoParada: row.motivo_descricao ? {
        descricao: row.motivo_descricao,
        codigo: row.motivo_codigo,
      } : null,
      
      estagio: row.estagio_nome ? {
        nome: row.estagio_nome,
        codigo: row.estagio_codigo,
        cor: row.estagio_cor,
      } : null,
    };

    return NextResponse.json(apontamento);
    
  } catch (error) {
    console.error('Erro ao buscar apontamento:', error);
    return NextResponse.json(
      { error: 'Erro interno ao buscar apontamento' },
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
    const validated = apontamentoSchema.parse(body);

    // Preparar dados para atualização
    const dadosAtualizar: any = {
      maquinaId: validated.maquinaId,
      operadorInicioId: validated.operadorInicioId,
      dataInicio: new Date(validated.dataInicio),
      dataFim: new Date(validated.dataFim),
      status: validated.status,
      observacoes: validated.observacoes,
      tipo: validated.tipo,
      updatedAt: new Date(),
    };

    // Adicionar campos opcionais apenas se fornecidos
    if (validated.operadorFimId) {
      dadosAtualizar.operadorFimId = validated.operadorFimId;
    }

    if (validated.metragemProcessada !== undefined) {
      dadosAtualizar.metragemProcessada = validated.metragemProcessada.toString();
    }

    if (validated.motivoParadaId) {
      dadosAtualizar.motivoParadaId = validated.motivoParadaId;
    }

    if (validated.estagioId) {
      dadosAtualizar.estagioId = validated.estagioId;
    }

    if (validated.isReprocesso !== undefined) {
      dadosAtualizar.isReprocesso = validated.isReprocesso;
    }

    if (validated.opId !== undefined) {
      dadosAtualizar.opId = validated.opId;
    }

    const [updated] = await db
      .update(apontamentos)
      .set(dadosAtualizar)
      .where(eq(apontamentos.id, params.id))
      .returning();

    return NextResponse.json(updated);
    
  } catch (error) {
    console.error('Erro ao atualizar apontamento:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', detalhes: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erro interno ao atualizar apontamento' },
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

    await db.delete(apontamentos).where(eq(apontamentos.id, params.id));
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Erro ao excluir apontamento:', error);
    return NextResponse.json(
      { error: 'Erro interno ao excluir apontamento' },
      { status: 500 }
    );
  }
}