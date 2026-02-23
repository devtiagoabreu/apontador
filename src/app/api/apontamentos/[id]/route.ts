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

    const apontamento = await db
      .select({
        id: apontamentos.id,
        tipo: apontamentos.tipo,
        opId: apontamentos.opId,
        maquinaId: apontamentos.maquinaId,
        operadorInicioId: apontamentos.operadorInicioId,
        operadorFimId: apontamentos.operadorFimId,
        metragemProcessada: apontamentos.metragemProcessada,
        dataInicio: apontamentos.dataInicio,
        dataFim: apontamentos.dataFim,
        status: apontamentos.status,
        motivoParadaId: apontamentos.motivoParadaId,
        observacoes: apontamentos.observacoes,
        estagioId: apontamentos.estagioId,
        isReprocesso: apontamentos.isReprocesso,
        createdAt: apontamentos.createdAt,
        updatedAt: apontamentos.updatedAt,
        
        // Relacionamentos
        op: apontamentos.opId ? {
          op: ops.op,
          produto: ops.produto,
          codEstagioAtual: ops.codEstagioAtual,
          estagioAtual: ops.estagioAtual,
        } : null,
        
        maquina: {
          nome: maquinas.nome,
          codigo: maquinas.codigo,
        },
        
        operadorInicio: {
          nome: usuarios.nome,
          matricula: usuarios.matricula,
        },
        
        operadorFim: apontamentos.operadorFimId ? {
          nome: usuarios.nome,
          matricula: usuarios.matricula,
        } : null,
        
        motivoParada: apontamentos.motivoParadaId ? {
          descricao: motivosParada.descricao,
          codigo: motivosParada.codigo,
        } : null,
        
        estagio: apontamentos.estagioId ? {
          nome: estagios.nome,
          codigo: estagios.codigo,
          cor: estagios.cor,
        } : null,
      })
      .from(apontamentos)
      .leftJoin(ops, eq(apontamentos.opId, ops.op))
      .leftJoin(maquinas, eq(apontamentos.maquinaId, maquinas.id))
      .leftJoin(usuarios, eq(apontamentos.operadorInicioId, usuarios.id))
      .leftJoin(usuarios, eq(apontamentos.operadorFimId, usuarios.id))
      .leftJoin(motivosParada, eq(apontamentos.motivoParadaId, motivosParada.id))
      .leftJoin(estagios, eq(apontamentos.estagioId, estagios.id))
      .where(eq(apontamentos.id, params.id))
      .then(rows => rows[0]);

    if (!apontamento) {
      return NextResponse.json(
        { error: 'Apontamento não encontrado' },
        { status: 404 }
      );
    }

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