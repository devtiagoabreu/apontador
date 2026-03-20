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
import { paradasMaquina } from '@/lib/db/schema/paradas-maquina';
import { sql, and, gte, lte, eq, isNotNull, inArray } from 'drizzle-orm';
import { z } from 'zod';

// Interfaces para tipagem
interface RowData {
  id: string;
  opId: number;
  maquinaId: string;
  operadorInicioId: string | null;
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
  tempoParada: number;
  diasNoPeriodo: number;
  eficiencia: number;
  registros: DadoProcessado[];
}

// Schema de validação dos filtros
const filtrosSchema = z.object({
  periodo: z.object({
    inicio: z.string(),
    fim: z.string(),
  }).optional(),
  maquinas: z.array(z.string()).optional(),
  operadores: z.array(z.string()).optional(),
  datas: z.array(z.string()).optional(),
  grupos: z.array(z.string()).optional(),
  estagios: z.array(z.string()).optional(),
  referencia: z.enum(['produto', 'maquina']).default('produto'),
});

// Função para formatar data
function formatarDataBR(data: Date | null): string {
  if (!data) return '';
  return data.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
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

    const hoje = new Date();
    let dataInicio: Date;
    let dataFim: Date;

    // Usar o período do filtro se existir
    if (validated.periodo?.inicio && validated.periodo?.fim) {
      dataInicio = new Date(validated.periodo.inicio + 'T00:00:00.000-03:00');
      dataFim = new Date(validated.periodo.fim + 'T23:59:59.999-03:00');
      console.log('📅 Usando período do filtro:', { 
        inicio: validated.periodo.inicio, 
        fim: validated.periodo.fim 
      });
    } else {
      // Fallback: últimos 30 dias
      dataInicio = new Date(hoje);
      dataInicio.setDate(hoje.getDate() - 30);
      dataFim = hoje;
      console.log('📅 Usando período padrão (30 dias)');
    }

    console.log('📅 Datas de filtro:', {
      inicio: dataInicio.toISOString(),
      fim: dataFim.toISOString(),
    });

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

    // Calcular dias no período
    const diasNoPeriodo = datasFilter.length > 0 
      ? datasFilter.length
      : Math.floor((dataFim.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    console.log(`📅 Período base: ${validated.periodo?.inicio || dataInicio.toISOString().split('T')[0]} a ${validated.periodo?.fim || dataFim.toISOString().split('T')[0]}`);
    console.log(`📅 Datas específicas: ${datasFilter.length > 0 ? datasFilter.join(', ') : 'Todas do período'}`);
    console.log(`📅 Dias no período: ${diasNoPeriodo}`);

    // Buscar todos os produtos
    const todosProdutos = await db.select().from(produtos);
    console.log(`📦 Encontrados ${todosProdutos.length} produtos`);
    
    const produtosMap = new Map<string, typeof produtos.$inferSelect>(
      todosProdutos.map(p => [p.codigo, p])
    );

    // Construir query principal
    console.log('🔨 Construindo query principal...');

    // Query base - usando operador_inicio_id
    let query = sql`
      SELECT 
        p.id,
        p.op_id as "opId",
        p.maquina_id as "maquinaId",
        p.operador_inicio_id as "operadorInicioId",
        p.operador_fim_id as "operadorFimId",
        p.estagio_id as "estagioId",
        p.data_fim as "dataFim",
        p.metragem_processada as "metragemProcessada",
        EXTRACT(EPOCH FROM (p.data_fim - p.data_inicio))/60 as "tempoMinutos",
        
        o.op as "opNumero",
        o.produto as "produtoOp",
        
        m.nome as "maquinaNome",
        m.velocidade_padrao as "velocidadeMaquina",
        
        ui.nome as "operadorNome",
        
        e.nome as "estagioNome",
        e.codigo as "estagioCodigo"
        
      FROM producoes p
      LEFT JOIN ops o ON p.op_id = o.op
      LEFT JOIN maquinas m ON p.maquina_id = m.id
      LEFT JOIN usuarios ui ON p.operador_inicio_id = ui.id
      LEFT JOIN estagios e ON p.estagio_id = e.id
      WHERE p.data_fim IS NOT NULL
    `;

    // Construir condições
    const conditions: string[] = [];

    // Filtro de datas
    if (datasFilter.length > 0) {
      const datasStr = datasFilter.map(d => `'${d}'`).join(', ');
      conditions.push(`DATE(p.data_fim) IN (${datasStr})`);
      console.log(`📅 Adicionando filtro de datas específicas: ${datasStr}`);
    } else {
      conditions.push(`p.data_fim >= '${dataInicio.toISOString()}'`);
      conditions.push(`p.data_fim <= '${dataFim.toISOString()}'`);
      console.log(`📅 Adicionando filtro de período: ${dataInicio.toISOString()} a ${dataFim.toISOString()}`);
    }

    // Filtro de máquinas
    if (maquinasFilter.length > 0) {
      const maquinasStr = maquinasFilter.map(id => `'${id}'`).join(', ');
      conditions.push(`p.maquina_id IN (${maquinasStr})`);
      console.log(`🔧 Adicionando filtro de ${maquinasFilter.length} máquinas`);
    }

    // Filtro de operadores
    if (operadoresFilter.length > 0) {
      const operadoresStr = operadoresFilter.map(id => `'${id}'`).join(', ');
      conditions.push(`p.operador_inicio_id IN (${operadoresStr})`);
      console.log(`👤 Adicionando filtro de ${operadoresFilter.length} operadores (início)`);
    }

    // Filtro de estágios
    if (estagiosFilter.length > 0) {
      const estagiosStr = estagiosFilter.map(id => `'${id}'`).join(', ');
      conditions.push(`p.estagio_id IN (${estagiosStr})`);
      console.log(`🏭 Adicionando filtro de ${estagiosFilter.length} estágios`);
    }

    // Aplicar condições
    if (conditions.length > 0) {
      const whereClause = conditions.join(' AND ');
      query = sql`${query} AND ${sql.raw(whereClause)}`;
      console.log('📝 Where clause:', whereClause);
    }

    query = sql`${query} ORDER BY p.data_fim DESC`;

    console.log('🔍 Executando query...');
    const result = await db.execute(query);
    console.log(`✅ Encontrados ${result.rows.length} registros`);

    if (result.rows.length === 0) {
      console.log('⚠️ Nenhum registro encontrado');
    }

    // Processar dados
    console.log('🔄 Processando dados...');
    const dadosProcessados: DadoProcessado[] = await Promise.all(result.rows.map(async (row: any) => {
      const rowData = row as RowData;
      
      // Extrair grupo do produto da OP
      const produtoOp = rowData.produtoOp || '';
      const partes = produtoOp.split('.');
      const grupo = partes.length > 1 ? partes[1] : '';

      // Buscar parâmetros do produto
      const produto = produtosMap.get(grupo);
      const parametrosProduto = (produto?.parametrosEficiencia as ParametrosProduto) || {};

      // Calcular metragem esperada
      const tempoMinutos = Number(rowData.tempoMinutos) || 0;
      const velocidadeMaquina = Number(rowData.velocidadeMaquina) || 0;
      
      const estagioKey = rowData.estagioNome?.toLowerCase() || '';
      const velocidadeProduto = parametrosProduto[estagioKey]?.velocidade || 0;

      const metragemEsperadaProduto = tempoMinutos * velocidadeProduto;
      const metragemEsperadaMaquina = tempoMinutos * velocidadeMaquina;
      const metragemReal = Number(rowData.metragemProcessada) || 0;

      const eficienciaProduto = metragemEsperadaProduto > 0 
        ? (metragemReal / metragemEsperadaProduto) * 100 
        : 0;
      
      const eficienciaMaquina = metragemEsperadaMaquina > 0 
        ? (metragemReal / metragemEsperadaMaquina) * 100 
        : 0;

      const dataFim = rowData.dataFim ? new Date(rowData.dataFim) : null;
      const dataFormatada = formatarDataBR(dataFim);
      
      return {
        id: rowData.id,
        data: dataFormatada,
        dataISO: rowData.dataFim?.split('T')[0] || '',
        dataCompleta: dataFormatada,
        op: rowData.opNumero,
        grupo,
        produtoOp: rowData.produtoOp,
        estagioId: rowData.estagioId,
        estagio: rowData.estagioNome,
        estagioCodigo: rowData.estagioCodigo,
        maquinaId: rowData.maquinaId,
        maquina: rowData.maquinaNome,
        operadorId: rowData.operadorInicioId,
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

    // Filtrar por grupos
    let dadosFiltrados = dadosProcessados;
    if (gruposFilter.length > 0) {
      dadosFiltrados = dadosProcessados.filter(d => 
        d.grupo && gruposFilter.includes(d.grupo)
      );
      console.log(`📊 Após filtro de grupos: ${dadosFiltrados.length} registros`);
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

    // Agrupar por data
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

    Object.values(porEstagioMap).forEach((item: GraficoEstagio) => {
      item.eficienciaProduto = item.metragemEsperadaProduto > 0 
        ? (item.metragemReal / item.metragemEsperadaProduto) * 100 
        : 0;
      item.eficienciaMaquina = item.metragemEsperadaMaquina > 0 
        ? (item.metragemReal / item.metragemEsperadaMaquina) * 100 
        : 0;
    });

    // Processamento por máquina
    console.log('🔨 Processando dados por máquina...');
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
          tempoParada: 0,
          diasNoPeriodo: 0,
          eficiencia: 0,
          registros: []
        });
      }
      const maq = maquinasMap.get(chave)!;
      maq.metragemReal += d.metragemReal;
      // ✅ CORREÇÃO: Usar a referência correta para metragem esperada
      maq.metragemEsperada += validated.referencia === 'produto' 
        ? d.metragemEsperadaProduto 
        : d.metragemEsperadaMaquina;
      maq.tempoApontado += d.tempoMinutos;
      maq.registros.push(d);
    });

    console.log(`📊 Encontradas ${maquinasMap.size} máquinas com produção`);

    // Buscar informações das máquinas
    console.log('🔍 Buscando informações das máquinas...');
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

    console.log(`📦 Encontradas informações para ${maquinasInfo.length} máquinas`);

    const maquinasInfoMap = new Map(
      maquinasInfo.map(m => [m.id, m])
    );

    // Buscar paradas
    let paradasQuery: any[] = [];
    if (maquinasMap.size > 0) {
      console.log('🔍 Buscando dados de paradas...');
      
      let paradasSql = `
        SELECT 
          maquina_id as "maquinaId",
          COALESCE(SUM(EXTRACT(EPOCH FROM (data_fim - data_inicio))/60), 0) as "tempoParada"
        FROM paradas_maquina
        WHERE data_fim IS NOT NULL
      `;

      const paradasConditions: string[] = [];

      if (maquinasFilter.length > 0) {
        const maquinasStr = maquinasFilter.map(id => `'${id}'`).join(', ');
        paradasConditions.push(`maquina_id IN (${maquinasStr})`);
      }

      if (datasFilter.length > 0) {
        const datasStr = datasFilter.map(d => `'${d}'`).join(', ');
        paradasConditions.push(`DATE(data_inicio) IN (${datasStr})`);
      } else {
        paradasConditions.push(`data_inicio >= '${dataInicio.toISOString()}'`);
        paradasConditions.push(`data_fim <= '${dataFim.toISOString()}'`);
      }

      if (paradasConditions.length > 0) {
        paradasSql += ' AND ' + paradasConditions.join(' AND ');
      }

      paradasSql += ' GROUP BY maquina_id';
      
      console.log('📝 Query de paradas:', paradasSql);
      
      const paradasResult = await db.execute(sql.raw(paradasSql));
      paradasQuery = paradasResult.rows;
      console.log(`✅ Encontradas paradas para ${paradasQuery.length} máquinas`);
    }

    const paradasMap = new Map(
      paradasQuery.map((p: any) => [p.maquinaId, Number(p.tempoParada) || 0])
    );

    // Calcular tempo disponível e eficiência
    console.log('📊 Calculando tempo disponível...');
    maquinasMap.forEach((maq, id) => {
      const info = maquinasInfoMap.get(id);
      
      const tempoPorDia = info?.tempoDiarioDisponivel 
        ? Number(info.tempoDiarioDisponivel) 
        : 1440;
      
      maq.tempoDisponivel = tempoPorDia * diasNoPeriodo;
      maq.diasNoPeriodo = diasNoPeriodo;
      maq.tempoParada = paradasMap.get(id) || 0;
      
      // ✅ Calcular eficiência
      maq.eficiencia = maq.metragemEsperada > 0 
        ? (maq.metragemReal / maq.metragemEsperada) * 100 
        : 0;
      
      console.log(`🔍 Máquina ${maq.nome}:`);
      console.log(`   - Dias no período: ${diasNoPeriodo}`);
      console.log(`   - Registros: ${maq.registros.length}`);
      console.log(`   - Metragem Real: ${maq.metragemReal}`);
      console.log(`   - Metragem Esperada: ${maq.metragemEsperada}`);
      console.log(`   - Tempo Apontado: ${maq.tempoApontado}min`);
      console.log(`   - Tempo Disponível: ${maq.tempoDisponivel}min`);
      console.log(`   - Tempo Parada: ${maq.tempoParada}min`);
      console.log(`   - Eficiência: ${maq.eficiencia}%`);
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
        // ✅ CORREÇÃO: Incluir metragemEsperada no porMaquina
        porMaquina: Array.from(maquinasMap.values()).map(m => ({
          nome: m.nome,
          metragemReal: Math.round(m.metragemReal * 100) / 100,
          metragemEsperada: Math.round(m.metragemEsperada * 100) / 100,
          tempoApontado: Math.round(m.tempoApontado * 100) / 100,
          tempoDisponivel: Math.round(m.tempoDisponivel * 100) / 100,
          tempoParada: Math.round(m.tempoParada * 100) / 100,
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
    console.error('❌ ERRO DETALHADO:', error);
    console.error('❌ Stack:', error instanceof Error ? error.stack : 'No stack');
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Filtros inválidos', detalhes: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erro interno ao gerar relatório', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}