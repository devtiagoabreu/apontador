export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { estagios } from '@/lib/db/schema/estagios';
import { ops } from '@/lib/db/schema/ops';
import { sql } from 'drizzle-orm';

export async function GET() {
  const diagnostico: {
    timestamp: string;
    autenticacao: boolean;
    error?: string;
    estagios: {
      total: number;
      comKanban: number;
      dados: any[];
    };
    ops: {
      total: number;
      porStatus: Record<string, number>;
      porEstagio: Record<string, number>;
      amostra: any[];
    };
    colunas: {
      paradas: number;
      finalizadas: number;
      estagios: Record<string, number>;
    };
  } = {
    timestamp: new Date().toISOString(),
    autenticacao: false,
    estagios: {
      total: 0,
      comKanban: 0,
      dados: []
    },
    ops: {
      total: 0,
      porStatus: {},
      porEstagio: {},
      amostra: []
    },
    colunas: {
      paradas: 0,
      finalizadas: 0,
      estagios: {}
    }
  };

  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions);
    diagnostico.autenticacao = !!session;

    if (!session) {
      diagnostico.error = 'Não autenticado';
      return NextResponse.json(diagnostico);
    }

    // Buscar estágios
    const todosEstagios = await db.select().from(estagios).orderBy(estagios.ordem);
    diagnostico.estagios.total = todosEstagios.length;
    diagnostico.estagios.comKanban = todosEstagios.filter(e => e.mostrarNoKanban).length;
    diagnostico.estagios.dados = todosEstagios.map(e => ({
      codigo: e.codigo,
      nome: e.nome,
      cor: e.cor,
      kanban: e.mostrarNoKanban,
      ativo: e.ativo
    }));

    // Buscar OPs
    const todasOps = await db.select().from(ops).limit(100);
    diagnostico.ops.total = todasOps.length;
    
    // Contar por status
    todasOps.forEach(op => {
      const status = op.status || 'SEM STATUS';
      diagnostico.ops.porStatus[status] = (diagnostico.ops.porStatus[status] || 0) + 1;
      
      const estagio = op.codEstagioAtual || '00';
      diagnostico.ops.porEstagio[estagio] = (diagnostico.ops.porEstagio[estagio] || 0) + 1;
    });

    // Amostra das 5 primeiras OPs
    diagnostico.ops.amostra = todasOps.slice(0, 5).map(op => ({
      op: op.op,
      produto: op.produto?.substring(0, 30),
      status: op.status,
      estagio: op.codEstagioAtual,
      maquina: op.codMaquinaAtual
    }));

    // Simular colunas do Kanban
    diagnostico.colunas.paradas = todasOps.filter(op => op.status === 'PARADA').length;
    diagnostico.colunas.finalizadas = todasOps.filter(op => 
      op.status === 'FINALIZADA' || op.status === 'CANCELADA'
    ).length;

    todosEstagios
      .filter(e => e.mostrarNoKanban)
      .forEach(e => {
        diagnostico.colunas.estagios[e.nome] = todasOps.filter(op => 
          op.codEstagioAtual === e.codigo && 
          op.status !== 'PARADA' && 
          op.status !== 'FINALIZADA' && 
          op.status !== 'CANCELADA'
        ).length;
      });

  } catch (error) {
    diagnostico.error = error instanceof Error ? error.message : String(error);
  }

  return NextResponse.json(diagnostico);
}