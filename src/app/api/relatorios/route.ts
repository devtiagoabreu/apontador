// src/app/api/relatorios/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { producoesTable } from '@/lib/db/schema/producoes'; // ✅ USAR PRODUCOES
import { paradasMaquina } from '@/lib/db/schema/paradas-maquina'; // ✅ USAR PARADAS
import { ops } from '@/lib/db/schema/ops';
import { maquinas } from '@/lib/db/schema/maquinas';
import { usuarios } from '@/lib/db/schema/usuarios';
import { motivosParada } from '@/lib/db/schema/motivos-parada';
import { estagios } from '@/lib/db/schema/estagios';
import { sql, and, gte, lte, eq, isNotNull } from 'drizzle-orm';

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
        // 🔴 CORRIGIDO: Usar producoesTable em vez de apontamentos
        dados = await db
          .select({
            data: sql<string>`DATE(${producoesTable.dataFim})`,
            op: ops.op,
            produto: ops.produto,
            maquina: maquinas.nome,
            operador: usuarios.nome,
            metragem: producoesTable.metragemProcessada,
            estagio: estagios.nome,
            tempoProdução: sql<number>`EXTRACT(EPOCH FROM (${producoesTable.dataFim} - ${producoesTable.dataInicio}))/60`,
          })
          .from(producoesTable)
          .innerJoin(ops, eq(producoesTable.opId, ops.op))
          .innerJoin(maquinas, eq(producoesTable.maquinaId, maquinas.id))
          .innerJoin(usuarios, eq(producoesTable.operadorFimId, usuarios.id))
          .leftJoin(estagios, eq(producoesTable.estagioId, estagios.id))
          .where(
            and(
              isNotNull(producoesTable.dataFim),
              gte(producoesTable.dataFim, dataInicio),
              lte(producoesTable.dataFim, dataFim)
            )
          )
          .orderBy(sql`DATE(${producoesTable.dataFim})`);
        break;

      case 'paradas':
        // 🔴 CORRIGIDO: Usar paradasMaquina em vez de apontamentos
        const paradas = await db
          .select({
            motivo: motivosParada.descricao,
            motivoCodigo: motivosParada.codigo,
            quantidade: sql<number>`COUNT(*)`,
            minutos: sql<number>`SUM(EXTRACT(EPOCH FROM (${paradasMaquina.dataFim} - ${paradasMaquina.dataInicio}))/60)`,
            maquina: maquinas.nome,
            operador: usuarios.nome,
            data: sql<string>`DATE(${paradasMaquina.dataInicio})`,
            observacoes: paradasMaquina.observacoes,
          })
          .from(paradasMaquina)
          .innerJoin(maquinas, eq(paradasMaquina.maquinaId, maquinas.id))
          .innerJoin(usuarios, eq(paradasMaquina.operadorId, usuarios.id))
          .innerJoin(motivosParada, eq(paradasMaquina.motivoParadaId, motivosParada.id))
          .where(
            and(
              isNotNull(paradasMaquina.dataFim),
              gte(paradasMaquina.dataInicio, dataInicio),
              lte(paradasMaquina.dataFim, dataFim)
            )
          )
          .groupBy(
            motivosParada.descricao, 
            motivosParada.codigo,
            maquinas.nome,
            usuarios.nome,
            sql`DATE(${paradasMaquina.dataInicio})`,
            paradasMaquina.observacoes
          );

        // Para o gráfico, agrupar por motivo
        const paradasPorMotivo = paradas.reduce((acc: any[], item) => {
          const existente = acc.find(m => m.motivo === item.motivo);
          if (existente) {
            existente.quantidade += item.quantidade;
            existente.minutos = Math.round((existente.minutos + item.minutos) * 100) / 100;
          } else {
            acc.push({
              motivo: item.motivo,
              codigo: item.motivoCodigo,
              quantidade: item.quantidade,
              minutos: Math.round((item.minutos || 0) * 100) / 100,
            });
          }
          return acc;
        }, []);

        dados = paradasPorMotivo;
        break;

      case 'operadores':
        // 🔴 CORRIGIDO: Usar producoesTable em vez de apontamentos
        dados = await db
          .select({
            nome: usuarios.nome,
            matricula: usuarios.matricula,
            totalMetragem: sql<number>`COALESCE(SUM(${producoesTable.metragemProcessada}), 0)`,
            tempoTotal: sql<number>`COALESCE(SUM(EXTRACT(EPOCH FROM (${producoesTable.dataFim} - ${producoesTable.dataInicio}))/60), 0)`,
            quantidadeProducoes: sql<number>`COUNT(${producoesTable.id})`,
            metrosPorMinuto: sql<number>`
              CASE 
                WHEN SUM(EXTRACT(EPOCH FROM (${producoesTable.dataFim} - ${producoesTable.dataInicio}))/60) > 0 
                THEN ROUND(
                  COALESCE(SUM(${producoesTable.metragemProcessada}), 0) / 
                  SUM(EXTRACT(EPOCH FROM (${producoesTable.dataFim} - ${producoesTable.dataInicio}))/60), 2
                )
                ELSE 0 
              END
            `,
          })
          .from(usuarios)
          .leftJoin(
            producoesTable, 
            and(
              eq(producoesTable.operadorFimId, usuarios.id),
              isNotNull(producoesTable.dataFim),
              gte(producoesTable.dataFim, dataInicio),
              lte(producoesTable.dataFim, dataFim)
            )
          )
          .groupBy(usuarios.nome, usuarios.matricula)
          .having(sql`COUNT(${producoesTable.id}) > 0 OR COALESCE(SUM(${producoesTable.metragemProcessada}), 0) > 0`);
        break;

      case 'maquinas':
        // 🔴 CORRIGIDO: Usar producoesTable e paradasMaquina
        const producoesMaquinas = await db
          .select({
            maquinaId: maquinas.id,
            nome: maquinas.nome,
            codigo: maquinas.codigo,
            totalMetragem: sql<number>`COALESCE(ROUND(SUM(${producoesTable.metragemProcessada})::numeric, 2), 0)`,
            tempoProducao: sql<number>`COALESCE(ROUND(SUM(EXTRACT(EPOCH FROM (${producoesTable.dataFim} - ${producoesTable.dataInicio}))/60)::numeric, 2), 0)`,
          })
          .from(maquinas)
          .leftJoin(
            producoesTable,
            and(
              eq(producoesTable.maquinaId, maquinas.id),
              isNotNull(producoesTable.dataFim),
              gte(producoesTable.dataFim, dataInicio),
              lte(producoesTable.dataFim, dataFim)
            )
          )
          .groupBy(maquinas.id, maquinas.nome, maquinas.codigo);

        const paradasMaquinas = await db
          .select({
            maquinaId: maquinas.id,
            tempoParada: sql<number>`COALESCE(ROUND(SUM(EXTRACT(EPOCH FROM (${paradasMaquina.dataFim} - ${paradasMaquina.dataInicio}))/60)::numeric, 2), 0)`,
          })
          .from(maquinas)
          .leftJoin(
            paradasMaquina,
            and(
              eq(paradasMaquina.maquinaId, maquinas.id),
              isNotNull(paradasMaquina.dataFim),
              gte(paradasMaquina.dataInicio, dataInicio),
              lte(paradasMaquina.dataFim, dataFim)
            )
          )
          .groupBy(maquinas.id);

        // Combinar e calcular métricas
        dados = producoesMaquinas.map(p => {
          const parada = paradasMaquinas.find(pm => pm.maquinaId === p.maquinaId);
          const tempoParada = parada?.tempoParada || 0;
          const tempoTotal = p.tempoProducao + tempoParada;
          
          let disponibilidade = 100;
          if (tempoTotal > 0) {
            disponibilidade = Math.round((p.tempoProducao / tempoTotal) * 10000) / 100;
          }
          
          let metrosPorMinuto = 0;
          if (p.tempoProducao > 0) {
            metrosPorMinuto = Math.round((p.totalMetragem / p.tempoProducao) * 100) / 100;
          }
          
          let eficiencia = 100;
          if (p.tempoProducao > 0) {
            eficiencia = 100;
          } else if (p.totalMetragem === 0 && tempoParada > 0) {
            eficiencia = 0;
          }
          
          return {
            nome: p.nome,
            codigo: p.codigo,
            totalMetragem: p.totalMetragem,
            tempoProducao: p.tempoProducao,
            tempoParada,
            disponibilidade,
            eficiencia,
            metrosPorMinuto,
          };
        }).filter(m => m.totalMetragem > 0 || m.tempoParada > 0);
        
        dados.sort((a, b) => a.nome.localeCompare(b.nome));
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