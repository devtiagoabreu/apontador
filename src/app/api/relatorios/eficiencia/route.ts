// src/app/api/relatorios/eficiencia/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { producoesTable } from '@/lib/db/schema/producoes';
import { ops } from '@/lib/db/schema/ops';
import { maquinas } from '@/lib/db/schema/maquinas';
import { usuarios } from '@/lib/db/schema/usuarios';
import { estagios } from '@/lib/db/schema/estagios';
import { produtos } from '@/lib/db/schema/produtos';
import { sql, and, gte, lte, eq, isNotNull, inArray } from 'drizzle-orm';
import { z } from 'zod';

// Interfaces para tipagem
interface RowData {
  id: string;
  opId: number;
  maquinaId: string;
  operadorFimId: string | null;
  estagioId: string;
  dataFim: string | null;
  metragemProcessada: string | null;
  tempoMinutos: string | null;
  opNumero: number | null;
  produtoOp: string | null;
  maquinaNome: string | null;
  velocidadeMaquina: string | null;
  operadorNome: string | null;
  estagioNome: string | null;
  estagioCodigo: string | null;
}

interface DadoProcessado {
  id: string;
  data: string;
  dataISO: string;
  dataCompleta: string;
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

interface Totais {
  totalRegistros: number;
  metragemReal: number;
  metragemEsperadaProduto: number;
  metragemEsperadaMaquina: number;
  tempoTotal: number;
  eficienciaMediaProduto: number;
  eficienciaMediaMaquina: number;
  diasNoPeriodo: number;
}

interface GraficoData {
  data: string;
  dataISO: string;
  metragemReal: number;
  metragemEsperadaProduto: number;
  metragemEsperadaMaquina: number;
  tempoTotal: number;
  eficiencia: number;
  registros: DadoProcessado[];
}

interface GraficoEstagio {
  estagio: string;
  estagioId: string;
  metragemReal: number;
  metragemEsperadaProduto: number;
  metragemEsperadaMaquina: number;
  tempoTotal: number;
  eficienciaProduto: number;
  eficienciaMaquina: number;
  registros: DadoProcessado[];
}

interface DadosMaquina {
  nome: string;
  metragemReal: number;
  metragemEsperada: number;
  tempoApontado: number;
  tempoDisponivel: number;
  diasNoPeriodo: number;
  eficiencia: number;
  registros: DadoProcessado[];
}

// Schema de validação dos filtros
const filtrosSchema = z.object({
  maquinas: z.array(z.string()).optional(),
  operadores: z.array(z.string()).optional(),
  datas: z.array(z.string()).optional(),
  grupos: z.array(z.string()).optional(),
  estagios: z.array(z.string()).optional(),
  referencia: z.enum(['produto', 'maquina']).default('produto'),
});

// Função auxiliar para formatar tempo em horas e minutos (apenas para debug)
function formatarTempo(minutos: number): string {
  const horas = Math.floor(minutos / 60);
  const mins = Math.floor(minutos % 60);
  if (horas > 0) {
    return `${horas}h ${mins > 0 ? `${mins}min` : ''}`;
  }
  return `${mins}min`;
}

export async function POST(request: Request) {
  console.log('='.repeat(50));
  console.log('📦 POST /api/relatorios/eficiencia - INICIANDO');
  console.log('='.repeat(50));
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    console.log('📦 Filtros recebidos:', JSON.stringify(body, null, 2));

    // Validar filtros
    const validated = filtrosSchema.parse(body);
    console.log('✅ Filtros validados:', validated);

    // Obter período dos filtros
    const hoje = new Date();
    let dataInicio: Date;
    let dataFim: Date;

    // Se tiver datas específicas, usar a menor e maior
    if (validated.datas && validated.datas.length > 0) {
      const datasOrdenadas = validated.datas.sort();
      dataInicio = new Date(datasOrdenadas[0] + 'T00:00:00');
      dataFim = new Date(datasOrdenadas[datasOrdenadas.length - 1] + 'T23:59:59');
    } else {
      // Se não tiver datas específicas, usar últimos 30 dias
      dataInicio = new Date(hoje);
      dataInicio.setDate(hoje.getDate() - 30);
      dataFim = hoje;
    }

    console.log('📅 Período:', { 
      inicio: dataInicio.toISOString().split('T')[0], 
      fim: dataFim.toISOString().split('T')[0] 
    });

    // ✅ Calcular dias no período selecionado
    const diffTime = Math.abs(dataFim.getTime() - dataInicio.getTime());
    const diasNoPeriodo = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 para incluir ambos

    console.log(`📅 Período selecionado: ${diasNoPeriodo} dias (${dataInicio.toISOString().split('T')[0]} a ${dataFim.toISOString().split('T')[0]})`);

    // Processar arrays de filtros
    const maquinasFilter = validated.maquinas || [];
    const operadoresFilter = validated.operadores || [];
    const datasFilter = validated.datas || [];
    const gruposFilter = validated.grupos || [];
    const estagiosFilter = validated.estagios || [];

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
    `;

    // Aplicar filtros de período
    query = sql`${query} AND p.data_fim >= ${dataInicio} AND p.data_fim <= ${dataFim}`;

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
      const rowData = row as RowData;
      
      // Extrair grupo do produto da OP
      const produtoOp = rowData.produtoOp || '';
      const partes = produtoOp.split('.');
      const grupo = partes.length > 1 ? partes[1] : '';

      // Buscar parâmetros do produto
      const produto = produtosMap.get(grupo);
      const parametrosProduto = (produto?.parametrosEficiencia as ParametrosProduto) || {};

      // Calcular metragem esperada baseada na referência
      const tempoMinutos = Number(rowData.tempoMinutos) || 0;
      const velocidadeMaquina = Number(rowData.velocidadeMaquina) || 0;
      
      // Buscar velocidade do produto para este estágio
      const estagioKey = rowData.estagioNome?.toLowerCase() || '';
      const velocidadeProduto = parametrosProduto[estagioKey]?.velocidade || 0;

      const metragemEsperadaProduto = tempoMinutos * velocidadeProduto;
      const metragemEsperadaMaquina = tempoMinutos * velocidadeMaquina;

      const metragemReal = Number(rowData.metragemProcessada) || 0;

      // Calcular eficiência
      const eficienciaProduto = metragemEsperadaProduto > 0 
        ? (metragemReal / metragemEsperadaProduto) * 100 
        : 0;
      
      const eficienciaMaquina = metragemEsperadaMaquina > 0 
        ? (metragemReal / metragemEsperadaMaquina) * 100 
        : 0;

      // Formatar datas
      const dataFim = rowData.dataFim ? new Date(rowData.dataFim) : null;
      
      return {
        id: rowData.id,
        data: dataFim ? dataFim.toLocaleDateString('pt-BR') : '',
        dataISO: rowData.dataFim?.split('T')[0] || '',
        dataCompleta: dataFim ? dataFim.toLocaleString('pt-BR') : '',
        op: rowData.opNumero,
        grupo,
        produtoOp: rowData.produtoOp,
        estagioId: rowData.estagioId,
        estagio: rowData.estagioNome,
        estagioCodigo: rowData.estagioCodigo,
        maquinaId: rowData.maquinaId,
        maquina: rowData.maquinaNome,
        operadorId: rowData.operadorFimId,
        operador: rowData.operadorNome,
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
    const totais: Totais = {
      totalRegistros: dadosFiltrados.length,
      metragemReal: dadosFiltrados.reduce((acc, d) => acc + d.metragemReal, 0),
      metragemEsperadaProduto: dadosFiltrados.reduce((acc, d) => acc + d.metragemEsperadaProduto, 0),
      metragemEsperadaMaquina: dadosFiltrados.reduce((acc, d) => acc + d.metragemEsperadaMaquina, 0),
      tempoTotal: dadosFiltrados.reduce((acc, d) => acc + d.tempoMinutos, 0),
      eficienciaMediaProduto: 0,
      eficienciaMediaMaquina: 0,
      diasNoPeriodo,
    };

    totais.eficienciaMediaProduto = totais.metragemEsperadaProduto > 0 
      ? (totais.metragemReal / totais.metragemEsperadaProduto) * 100 
      : 0;
    
    totais.eficienciaMediaMaquina = totais.metragemEsperadaMaquina > 0 
      ? (totais.metragemReal / totais.metragemEsperadaMaquina) * 100 
      : 0;

    // Agrupar por data para gráficos
    const porDataMap: Record<string, GraficoData> = {};
    
    dadosFiltrados.forEach(d => {
      if (!porDataMap[d.dataISO]) {
        porDataMap[d.dataISO] = {
          data: d.data,
          dataISO: d.dataISO,
          metragemReal: 0,
          metragemEsperadaProduto: 0,
          metragemEsperadaMaquina: 0,
          tempoTotal: 0,
          eficiencia: 0,
          registros: []
        };
      }
      porDataMap[d.dataISO].metragemReal += d.metragemReal;
      porDataMap[d.dataISO].metragemEsperadaProduto += d.metragemEsperadaProduto;
      porDataMap[d.dataISO].metragemEsperadaMaquina += d.metragemEsperadaMaquina;
      porDataMap[d.dataISO].tempoTotal += d.tempoMinutos;
      porDataMap[d.dataISO].registros.push(d);
    });

    // Calcular eficiência por data
    Object.values(porDataMap).forEach((item: GraficoData) => {
      const esperado = validated.referencia === 'produto' 
        ? item.metragemEsperadaProduto 
        : item.metragemEsperadaMaquina;
      item.eficiencia = esperado > 0 ? (item.metragemReal / esperado) * 100 : 0;
    });

    // Agrupar por estágio
    const porEstagioMap: Record<string, GraficoEstagio> = {};
    
    dadosFiltrados.forEach(d => {
      if (!d.estagio) return;
      
      if (!porEstagioMap[d.estagio]) {
        porEstagioMap[d.estagio] = {
          estagio: d.estagio,
          estagioId: d.estagioId,
          metragemReal: 0,
          metragemEsperadaProduto: 0,
          metragemEsperadaMaquina: 0,
          tempoTotal: 0,
          eficienciaProduto: 0,
          eficienciaMaquina: 0,
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
    Object.values(porEstagioMap).forEach((item: GraficoEstagio) => {
      item.eficienciaProduto = item.metragemEsperadaProduto > 0 
        ? (item.metragemReal / item.metragemEsperadaProduto) * 100 
        : 0;
      item.eficienciaMaquina = item.metragemEsperadaMaquina > 0 
        ? (item.metragemReal / item.metragemEsperadaMaquina) * 100 
        : 0;
    });

    // 🔴 PROCESSAMENTO POR MÁQUINA PARA OS GRÁFICOS (CORRIGIDO)
    const maquinasMap = new Map<string, DadosMaquina>();
    
    dadosFiltrados.forEach(d => {
      const chave = d.maquinaId;
      if (!maquinasMap.has(chave)) {
        maquinasMap.set(chave, {
          nome: d.maquina || 'Não identificada',
          metragemReal: 0,
          metragemEsperada: 0,
          tempoApontado: 0,
          tempoDisponivel: 0,
          diasNoPeriodo: 0,
          eficiencia: 0,
          registros: []
        });
      }
      const maq = maquinasMap.get(chave)!;
      maq.metragemReal += d.metragemReal;
      maq.metragemEsperada += validated.referencia === 'produto' 
        ? d.metragemEsperadaProduto 
        : d.metragemEsperadaMaquina;
      maq.tempoApontado += d.tempoMinutos;
      maq.registros.push(d);
    });

    // Buscar tempo disponível das máquinas
    const maquinasInfo = await db
      .select({
        id: maquinas.id,
        nome: maquinas.nome,
        tempoDiarioDisponivel: maquinas.tempoDiarioDisponivel,
      })
      .from(maquinas)
      .where(
        maquinasFilter.length > 0 
          ? inArray(maquinas.id, maquinasFilter) 
          : undefined
      );

    const maquinasInfoMap = new Map(
      maquinasInfo.map(m => [m.id, m])
    );

    // ✅ Calcular tempo disponível baseado no PERÍODO, não nas produções
    maquinasMap.forEach((maq, id) => {
      const info = maquinasInfoMap.get(id);
      
      // Tempo disponível por dia (padrão 1440 min = 24h)
      const tempoPorDia = info?.tempoDiarioDisponivel 
        ? Number(info.tempoDiarioDisponivel) 
        : 1440;
      
      // ✅ Multiplicar pelo número de DIAS NO PERÍODO
      maq.tempoDisponivel = tempoPorDia * diasNoPeriodo;
      maq.diasNoPeriodo = diasNoPeriodo;
      
      // Calcular eficiência (baseada em metragem)
      maq.eficiencia = maq.metragemEsperada > 0 
        ? (maq.metragemReal / maq.metragemEsperada) * 100 
        : 0;
      
      console.log(`🔍 Máquina ${maq.nome}: ${diasNoPeriodo} dias no período × ${formatarTempo(tempoPorDia)}/dia = ${formatarTempo(maq.tempoDisponivel)} (apontado: ${formatarTempo(maq.tempoApontado)})`);
    });

    const resposta = {
      dados: dadosFiltrados,
      totais: {
        totalRegistros: totais.totalRegistros,
        metragemReal: Math.round(totais.metragemReal * 100) / 100,
        metragemEsperadaProduto: Math.round(totais.metragemEsperadaProduto * 100) / 100,
        metragemEsperadaMaquina: Math.round(totais.metragemEsperadaMaquina * 100) / 100,
        tempoTotal: Math.round(totais.tempoTotal * 100) / 100,
        eficienciaMediaProduto: Math.round(totais.eficienciaMediaProduto * 100) / 100,
        eficienciaMediaMaquina: Math.round(totais.eficienciaMediaMaquina * 100) / 100,
        diasNoPeriodo,
      },
      graficos: {
        porData: Object.values(porDataMap).sort((a, b) => a.dataISO.localeCompare(b.dataISO)),
        porEstagio: Object.values(porEstagioMap),
        porMaquina: Array.from(maquinasMap.values()).map(m => ({
          nome: m.nome,
          metragemReal: Math.round(m.metragemReal * 100) / 100,
          metragemEsperada: Math.round(m.metragemEsperada * 100) / 100,
          tempoApontado: Math.round(m.tempoApontado * 100) / 100,
          tempoDisponivel: Math.round(m.tempoDisponivel * 100) / 100,
          diasNoPeriodo: m.diasNoPeriodo,
          eficiencia: Math.round(m.eficiencia * 100) / 100,
        })),
      },
      filtrosAplicados: validated,
    };

    console.log('✅ Resposta preparada com', dadosFiltrados.length, 'registros');
    console.log('📊 Totais:', resposta.totais);
    console.log('📊 Máquinas:', resposta.graficos.porMaquina.length);
    
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