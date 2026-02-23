import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { apontamentos } from '@/lib/db/schema/apontamentos';
import { ops } from '@/lib/db/schema/ops';
import { maquinas } from '@/lib/db/schema/maquinas';
import { usuarios } from '@/lib/db/schema/usuarios';
import { motivosParada } from '@/lib/db/schema/motivos-parada';
import { sql, and, gte, lte, eq } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.nivel !== 'ADM') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const inicio = searchParams.get('inicio');
    const fim = searchParams.get('fim');
    const tipo = searchParams.get('tipo');

    if (!inicio || !fim) {
      return NextResponse.json(
        { error: 'Período não informado' },
        { status: 400 }
      );
    }

    const dataInicio = new Date(inicio);
    const dataFim = new Date(fim);

    let dados = [];

    switch (tipo) {
      case 'producao':
        dados = await db
          .select({
            data: sql<string>`DATE(${apontamentos.dataFim})`,
            op: ops.op,
            produto: ops.produto,
            maquina: maquinas.nome,
            operador: usuarios.nome,
            metragem: apontamentos.metragemProcessada,
          })
          .from(apontamentos)
          .leftJoin(ops, eq(apontamentos.opId, ops.op))
          .leftJoin(maquinas, eq(apontamentos.maquinaId, maquinas.id))
          .leftJoin(usuarios, eq(apontamentos.operadorFimId, usuarios.id))
          .where(
            and(
              gte(apontamentos.dataFim, dataInicio),
              lte(apontamentos.dataFim, dataFim),
              eq(apontamentos.tipo, 'PRODUCAO'),
              eq(apontamentos.status, 'CONCLUIDO')
            )
          )
          .orderBy(sql`DATE(${apontamentos.dataFim})`);
        break;

      case 'paradas':
        // Calcular duração da parada (dataFim - dataInicio)
        dados = await db
          .select({
            motivo: motivosParada.descricao,
            quantidade: sql<number>`COUNT(*)`,
            minutos: sql<number>`SUM(EXTRACT(EPOCH FROM (${apontamentos.dataFim} - ${apontamentos.dataInicio}))/60)`,
          })
          .from(apontamentos)
          .leftJoin(motivosParada, eq(apontamentos.motivoParadaId, motivosParada.id))
          .where(
            and(
              gte(apontamentos.dataInicio, dataInicio),
              lte(apontamentos.dataFim, dataFim),
              eq(apontamentos.tipo, 'PARADA'),
              eq(apontamentos.status, 'CONCLUIDO')
            )
          )
          .groupBy(motivosParada.descricao);
        break;

      case 'operadores':
        dados = await db
          .select({
            nome: usuarios.nome,
            matricula: usuarios.matricula,
            totalMetragem: sql<number>`SUM(${apontamentos.metragemProcessada})`,
            tempoTotal: sql<number>`SUM(EXTRACT(EPOCH FROM (${apontamentos.dataFim} - ${apontamentos.dataInicio}))/60)`,
            eficiencia: sql<number>`AVG((${apontamentos.metragemProcessada} / NULLIF(${ops.qtdeProgramado}, 0)) * 100)`,
          })
          .from(apontamentos)
          .leftJoin(usuarios, eq(apontamentos.operadorFimId, usuarios.id))
          .leftJoin(ops, eq(apontamentos.opId, ops.op))
          .where(
            and(
              gte(apontamentos.dataFim, dataInicio),
              lte(apontamentos.dataFim, dataFim),
              eq(apontamentos.tipo, 'PRODUCAO'),
              eq(apontamentos.status, 'CONCLUIDO')
            )
          )
          .groupBy(usuarios.nome, usuarios.matricula);
        break;

      case 'maquinas':
        dados = await db
          .select({
            nome: maquinas.nome,
            codigo: maquinas.codigo,
            totalMetragem: sql<number>`SUM(${apontamentos.metragemProcessada})`,
            tempoProducao: sql<number>`SUM(CASE WHEN ${apontamentos.tipo} = 'PRODUCAO' THEN EXTRACT(EPOCH FROM (${apontamentos.dataFim} - ${apontamentos.dataInicio}))/60 ELSE 0 END)`,
            tempoParada: sql<number>`SUM(CASE WHEN ${apontamentos.tipo} = 'PARADA' THEN EXTRACT(EPOCH FROM (${apontamentos.dataFim} - ${apontamentos.dataInicio}))/60 ELSE 0 END)`,
            disponibilidade: sql<number>`
              100 * (1 - (
                SUM(CASE WHEN ${apontamentos.tipo} = 'PARADA' THEN EXTRACT(EPOCH FROM (${apontamentos.dataFim} - ${apontamentos.dataInicio}))/60 ELSE 0 END) 
                / 
                NULLIF(
                  SUM(EXTRACT(EPOCH FROM (${apontamentos.dataFim} - ${apontamentos.dataInicio}))/60), 
                  0
                )
              ))
            `,
          })
          .from(apontamentos)
          .leftJoin(maquinas, eq(apontamentos.maquinaId, maquinas.id))
          .where(
            and(
              gte(apontamentos.dataFim, dataInicio),
              lte(apontamentos.dataFim, dataFim),
              eq(apontamentos.status, 'CONCLUIDO')
            )
          )
          .groupBy(maquinas.nome, maquinas.codigo);
        break;

      default:
        return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
    }

    return NextResponse.json(dados);

  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    return NextResponse.json(
      { error: 'Erro interno ao gerar relatório' },
      { status: 500 }
    );
  }
}