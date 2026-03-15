// src/app/api/relatorios/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { producoesTable } from '@/lib/db/schema/producoes';
import { paradasMaquina } from '@/lib/db/schema/paradas-maquina';
import { ops } from '@/lib/db/schema/ops';
import { maquinas } from '@/lib/db/schema/maquinas';
import { usuarios } from '@/lib/db/schema/usuarios';
import { motivosParada } from '@/lib/db/schema/motivos-parada';
import { estagios } from '@/lib/db/schema/estagios';
import { produtos } from '@/lib/db/schema/produtos';
import { sql, and, gte, lte, eq, isNotNull, inArray } from 'drizzle-orm';
import { z } from 'zod';

// Interfaces para tipagem
interface DadoProcessado {
  id: string;
  data: string;
  op: number | null;
  grupo: string;
  produtoOp: string | null;
  estagioId: string;
  estagio: string | null;
  estagioCodigo: string | null;
  maquinaId: string;
  maquina: string | null;
  operadorId: string | null;
  operador: string | null;
  metragemReal: number;
  tempoMinutos: number;
  velocidadeProduto: number;
  velocidadeMaquina: number;
  metragemEsperadaProduto: number;
  metragemEsperadaMaquina: number;
  eficienciaProduto: number;
  eficienciaMaquina: number;
}

interface ParametroEstagio {
  tempoPadrao?: number;
  rendimento?: number;
  velocidade?: number;
}

interface ParametrosProduto {
  [key: string]: ParametroEstagio;
}

// Schema de validação dos filtros
const filtrosSchema = z.object({
  inicio: z.string(),
  fim: z.string(),
  tipo: z.enum(['producao', 'paradas', 'operadores', 'maquinas', 'eficiencia']),
  maquinas: z.string().optional(),
  operadores: z.string().optional(),
  datas: z.string().optional(),
  grupos: z.string().optional(),
  estagios: z.string().optional(),
  referencia: z.enum(['produto', 'maquina']).optional().default('produto'),
});

export async function GET(request: Request) {
  console.log('='.repeat(50));
  console.log('📦 GET /api/relatorios - INICIANDO');
  console.log('='.repeat(50));
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.nivel !== 'ADM') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    // Extrair parâmetros
    const params = {
      inicio: searchParams.get('inicio') || '',
      fim: searchParams.get('fim') || '',
      tipo: searchParams.get('tipo') || 'producao',
      maquinas: searchParams.get('maquinas') || undefined,
      operadores: searchParams.get('operadores') || undefined,
      datas: searchParams.get('datas') || undefined,
      grupos: searchParams.get('grupos') || undefined,
      estagios: searchParams.get('estagios') || undefined,
      referencia: searchParams.get('referencia') as 'produto' | 'maquina' || 'produto',
    };

    console.log('📦 Parâmetros recebidos:', params);

    // Validar filtros
    const validated = filtrosSchema.parse(params);
    console.log('✅ Filtros validados:', validated);

    const dataInicio = new Date(validated.inicio);
    const dataFim = new Date(validated.fim);

    // Processar arrays de filtros
    const maquinasFilter = validated.maquinas?.split(',').filter(Boolean) || [];
    const operadoresFilter = validated.operadores?.split(',').filter(Boolean) || [];
    const datasFilter = validated.datas?.split(',').filter(Boolean) || [];
    const gruposFilter = validated.grupos?.split(',').filter(Boolean) || [];
    const estagiosFilter = validated.estagios?.split(',').filter(Boolean) || [];

    console.log('🔍 Filtros processados:', {
      maquinas: maquinasFilter,
      operadores: operadoresFilter,
      datas: datasFilter,
      grupos: gruposFilter,
      estagios: estagiosFilter,
    });

    // Buscar todos os produtos para mapear grupos
    const todosProdutos = await db.select().from(produtos);
    const produtosMap = new Map<string, typeof produtos.$inferSelect>(
      todosProdutos.map(p => [p.codigo, p])
    );

    // Construir query base para produções
    let query = sql`
      SELECT 
        p.id,
        p.op_id as "opId",
        p.maquina_id as "maquinaId",
        p.operador_fim_id as "operadorFimId",
        p.estagio_id as "estagioId",
        p.data_fim as "dataFim",
        p.metragem_processada as "metragemProcessada",
        EXTRACT(EPOCH FROM (p.data_fim - p.data_inicio))/60 as "tempoMinutos",
        
        o.op as "opNumero",
        o.produto as "produtoOp",
        
        m.nome as "maquinaNome",
        m.velocidade_padrao as "velocidadeMaquina",
        
        u.nome as "operadorNome",
        
        e.nome as "estagioNome",
        e.codigo as "estagioCodigo"
        
      FROM producoes p
      LEFT JOIN ops o ON p.op_id = o.op
      LEFT JOIN maquinas m ON p.maquina_id = m.id
      LEFT JOIN usuarios u ON p.operador_fim_id = u.id
      LEFT JOIN estagios e ON p.estagio_id = e.id
      WHERE p.data_fim IS NOT NULL
        AND p.data_fim >= ${dataInicio}
        AND p.data_fim <= ${dataFim}
    `;

    // Aplicar filtros
    if (maquinasFilter.length > 0) {
      query = sql`${query} AND p.maquina_id IN (${sql.join(maquinasFilter, sql`, `)})`;
    }

    if (operadoresFilter.length > 0) {
      query = sql`${query} AND p.operador_fim_id IN (${sql.join(operadoresFilter, sql`, `)})`;
    }

    if (estagiosFilter.length > 0) {
      query = sql`${query} AND p.estagio_id IN (${sql.join(estagiosFilter, sql`, `)})`;
    }

    if (datasFilter.length > 0) {
      query = sql`${query} AND DATE(p.data_fim) IN (${sql.join(datasFilter.map(d => `'${d}'`), sql`, `)})`;
    }

    query = sql`${query} ORDER BY p.data_fim DESC`;

    console.log('🔍 Executando query...');
    const result = await db.execute(query);
    console.log(`✅ Encontrados ${result.rows.length} registros`);

    // Processar dados
    const dadosProcessados: DadoProcessado[] = await Promise.all(result.rows.map(async (row: any) => {
      // Extrair grupo do produto da OP
      const produtoOp = row.produtoOp || '';
      const partes = produtoOp.split('.');
      const grupo = partes.length > 1 ? partes[1] : '';

      // Buscar parâmetros do produto
      const produto = produtosMap.get(grupo);
      const parametrosProduto = (produto?.parametrosEficiencia as ParametrosProduto) || {};

      const tempoMinutos = Number(row.tempoMinutos) || 0;
      const velocidadeMaquina = Number(row.velocidadeMaquina) || 0;
      
      const estagioKey = row.estagioNome?.toLowerCase() || '';
      const velocidadeProduto = parametrosProduto[estagioKey]?.velocidade || 0;

      const metragemEsperadaProduto = tempoMinutos * velocidadeProduto;
      const metragemEsperadaMaquina = tempoMinutos * velocidadeMaquina;
      const metragemReal = Number(row.metragemProcessada) || 0;

      const eficienciaProduto = metragemEsperadaProduto > 0 
        ? (metragemReal / metragemEsperadaProduto) * 100 
        : 0;
      
      const eficienciaMaquina = metragemEsperadaMaquina > 0 
        ? (metragemReal / metragemEsperadaMaquina) * 100 
        : 0;

      return {
        id: row.id,
        data: row.dataFim?.split('T')[0] || '',
        op: row.opNumero,
        grupo,
        produtoOp: row.produtoOp,
        estagioId: row.estagioId,
        estagio: row.estagioNome,
        estagioCodigo: row.estagioCodigo,
        maquinaId: row.maquinaId,
        maquina: row.maquinaNome,
        operadorId: row.operadorFimId,
        operador: row.operadorNome,
        metragemReal,
        tempoMinutos,
        velocidadeProduto,
        velocidadeMaquina,
        metragemEsperadaProduto,
        metragemEsperadaMaquina,
        eficienciaProduto: Math.round(eficienciaProduto * 100) / 100,
        eficienciaMaquina: Math.round(eficienciaMaquina * 100) / 100,
      };
    }));

    // Filtrar por grupos se necessário
    let dadosFiltrados = dadosProcessados;
    if (gruposFilter.length > 0) {
      dadosFiltrados = dadosProcessados.filter(d => 
        d.grupo && gruposFilter.includes(d.grupo)
      );
    }

    // Calcular totais
    const totais = {
      totalRegistros: dadosFiltrados.length,
      metragemReal: dadosFiltrados.reduce((acc, d) => acc + d.metragemReal, 0),
      metragemEsperadaProduto: dadosFiltrados.reduce((acc, d) => acc + d.metragemEsperadaProduto, 0),
      metragemEsperadaMaquina: dadosFiltrados.reduce((acc, d) => acc + d.metragemEsperadaMaquina, 0),
      tempoTotal: dadosFiltrados.reduce((acc, d) => acc + d.tempoMinutos, 0),
      eficienciaMediaProduto: 0,
      eficienciaMediaMaquina: 0,
    };

    totais.eficienciaMediaProduto = totais.metragemEsperadaProduto > 0 
      ? (totais.metragemReal / totais.metragemEsperadaProduto) * 100 
      : 0;
    
    totais.eficienciaMediaMaquina = totais.metragemEsperadaMaquina > 0 
      ? (totais.metragemReal / totais.metragemEsperadaMaquina) * 100 
      : 0;

    // Agrupar por data para gráficos
    const porDataMap: Record<string, any> = {};
    dadosFiltrados.forEach(d => {
      if (!porDataMap[d.data]) {
        porDataMap[d.data] = {
          data: d.data,
          metragemReal: 0,
          metragemEsperadaProduto: 0,
          metragemEsperadaMaquina: 0,
          eficiencia: 0,
          tempoTotal: 0,
          registros: []
        };
      }
      porDataMap[d.data].metragemReal += d.metragemReal;
      porDataMap[d.data].metragemEsperadaProduto += d.metragemEsperadaProduto;
      porDataMap[d.data].metragemEsperadaMaquina += d.metragemEsperadaMaquina;
      porDataMap[d.data].tempoTotal += d.tempoMinutos;
      porDataMap[d.data].registros.push(d);
    });

    // Calcular eficiência por data
    Object.values(porDataMap).forEach((item: any) => {
      const esperado = validated.referencia === 'produto' 
        ? item.metragemEsperadaProduto 
        : item.metragemEsperadaMaquina;
      item.eficiencia = esperado > 0 ? (item.metragemReal / esperado) * 100 : 0;
    });

    // Agrupar por estágio
    const porEstagioMap: Record<string, any> = {};
    dadosFiltrados.forEach(d => {
      if (!d.estagio) return;
      
      if (!porEstagioMap[d.estagio]) {
        porEstagioMap[d.estagio] = {
          estagio: d.estagio,
          estagioId: d.estagioId,
          metragemReal: 0,
          metragemEsperadaProduto: 0,
          metragemEsperadaMaquina: 0,
          eficienciaProduto: 0,
          eficienciaMaquina: 0,
          tempoTotal: 0,
          registros: []
        };
      }
      porEstagioMap[d.estagio].metragemReal += d.metragemReal;
      porEstagioMap[d.estagio].metragemEsperadaProduto += d.metragemEsperadaProduto;
      porEstagioMap[d.estagio].metragemEsperadaMaquina += d.metragemEsperadaMaquina;
      porEstagioMap[d.estagio].tempoTotal += d.tempoMinutos;
      porEstagioMap[d.estagio].registros.push(d);
    });

    // Calcular eficiência por estágio
    Object.values(porEstagioMap).forEach((item: any) => {
      item.eficienciaProduto = item.metragemEsperadaProduto > 0 
        ? (item.metragemReal / item.metragemEsperadaProduto) * 100 
        : 0;
      item.eficienciaMaquina = item.metragemEsperadaMaquina > 0 
        ? (item.metragemReal / item.metragemEsperadaMaquina) * 100 
        : 0;
    });

    // Para relatório de paradas, buscar dados específicos
    let dadosParadas: any[] = [];
    if (validated.tipo === 'paradas') {
      const paradasQuery = await db
        .select({
          motivo: motivosParada.descricao,
          codigo: motivosParada.codigo,
          quantidade: sql<number>`COUNT(*)`,
          minutos: sql<number>`SUM(EXTRACT(EPOCH FROM (${paradasMaquina.dataFim} - ${paradasMaquina.dataInicio}))/60)`,
        })
        .from(paradasMaquina)
        .innerJoin(maquinas, eq(paradasMaquina.maquinaId, maquinas.id))
        .innerJoin(motivosParada, eq(paradasMaquina.motivoParadaId, motivosParada.id))
        .where(
          and(
            isNotNull(paradasMaquina.dataFim),
            gte(paradasMaquina.dataInicio, dataInicio),
            lte(paradasMaquina.dataFim, dataFim),
            maquinasFilter.length > 0 ? inArray(paradasMaquina.maquinaId, maquinasFilter) : undefined,
          )
        )
        .groupBy(motivosParada.descricao, motivosParada.codigo);

      dadosParadas = paradasQuery;
    }

    // Preparar resposta baseada no tipo
    let resposta: any = {
      dados: dadosFiltrados,
      totais: {
        totalRegistros: totais.totalRegistros,
        metragemReal: Math.round(totais.metragemReal * 100) / 100,
        metragemEsperadaProduto: Math.round(totais.metragemEsperadaProduto * 100) / 100,
        metragemEsperadaMaquina: Math.round(totais.metragemEsperadaMaquina * 100) / 100,
        tempoTotal: Math.round(totais.tempoTotal * 100) / 100,
        eficienciaMediaProduto: Math.round(totais.eficienciaMediaProduto * 100) / 100,
        eficienciaMediaMaquina: Math.round(totais.eficienciaMediaMaquina * 100) / 100,
      },
      graficos: {
        porData: Object.values(porDataMap),
        porEstagio: Object.values(porEstagioMap),
      },
    };

    // Adicionar dados específicos para cada tipo
    if (validated.tipo === 'paradas') {
      resposta.dados = dadosParadas;
      resposta.graficos.porMotivo = dadosParadas;
    }

    console.log('✅ Resposta preparada com', dadosFiltrados.length, 'registros');
    console.log('📊 Totais:', resposta.totais);
    
    return NextResponse.json(resposta);

  } catch (error) {
    console.error('❌ ERRO:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Filtros inválidos', detalhes: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erro interno ao gerar relatório' },
      { status: 500 }
    );
  }
}