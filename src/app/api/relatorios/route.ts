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
  operadorMatricula: string | null;
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
  operadorMatricula: string | null;
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

    console.log('📦 Parâmetros recebidos:', JSON.stringify(params, null, 2));

    // Validar filtros
    const validated = filtrosSchema.parse(params);
    console.log('✅ Filtros validados:', validated);

    // Datas com fuso brasileiro
    const dataInicio = new Date(validated.inicio + 'T00:00:00.000-03:00');
    const dataFim = new Date(validated.fim + 'T23:59:59.999-03:00');

    console.log('📅 Datas de filtro:', {
      inicio: dataInicio.toISOString(),
      fim: dataFim.toISOString(),
    });

    // Processar arrays de filtros
    const maquinasFilter = validated.maquinas ? validated.maquinas.split(',').filter(Boolean) : [];
    const operadoresFilter = validated.operadores ? validated.operadores.split(',').filter(Boolean) : [];
    const datasFilter = validated.datas ? validated.datas.split(',').filter(Boolean) : [];
    const gruposFilter = validated.grupos ? validated.grupos.split(',').filter(Boolean) : [];
    const estagiosFilter = validated.estagios ? validated.estagios.split(',').filter(Boolean) : [];

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

    console.log(`📅 Período base: ${validated.inicio} a ${validated.fim}`);
    console.log(`📅 Datas específicas: ${datasFilter.length > 0 ? datasFilter.join(', ') : 'Todas do período'}`);
    console.log(`📅 Dias no período: ${diasNoPeriodo}`);

    // Buscar produtos
    const todosProdutos = await db.select().from(produtos);
    console.log(`📦 Encontrados ${todosProdutos.length} produtos`);
    
    const produtosMap = new Map<string, typeof produtos.$inferSelect>(
      todosProdutos.map(p => [p.codigo, p])
    );

    // 🔴 CONSTRUIR QUERY PRINCIPAL
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
        ui.matricula as "operadorMatricula",
        
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

    // Filtro de operadores (agora usando operador_inicio_id)
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

      // Calcular eficiência
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
        operadorId: rowData.operadorInicioId, // ✅ Usando operador de início
        operador: rowData.operadorNome,
        operadorMatricula: rowData.operadorMatricula,
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

    console.log(`✅ Processados ${dadosProcessados.length} registros`);

    // Filtrar por grupos
    let dadosFiltrados = dadosProcessados;
    if (gruposFilter.length > 0) {
      dadosFiltrados = dadosProcessados.filter(d => 
        d.grupo && gruposFilter.includes(d.grupo)
      );
      console.log(`📊 Após filtro de grupos: ${dadosFiltrados.length} registros`);
    }

    // Processar operadores (agrupado por operador de início)
    const operadoresMap = new Map();
    dadosFiltrados.forEach(d => {
      if (!d.operadorId) return;
      
      const chave = d.operadorId;
      if (!operadoresMap.has(chave)) {
        operadoresMap.set(chave, {
          nome: d.operador || 'Não identificado',
          totalMetragem: 0,
          tempoTotal: 0,
          quantidadeProducoes: 0,
        });
      }
      const op = operadoresMap.get(chave);
      op.totalMetragem += d.metragemReal;
      op.tempoTotal += d.tempoMinutos;
      op.quantidadeProducoes += 1;
    });

    console.log(`📊 Encontrados ${operadoresMap.size} operadores`);

    // Processar máquinas
    const maquinasMap = new Map();
    dadosFiltrados.forEach(d => {
      const chave = d.maquinaId;
      if (!maquinasMap.has(chave)) {
        maquinasMap.set(chave, {
          nome: d.maquina || 'Não identificado',
          totalMetragem: 0,
          tempoProducao: 0,
          tempoParada: 0,
        });
      }
      const maq = maquinasMap.get(chave);
      maq.totalMetragem += d.metragemReal;
      maq.tempoProducao += d.tempoMinutos;
    });

    console.log(`📊 Encontradas ${maquinasMap.size} máquinas`);

    // Buscar paradas
    let paradasQuery: any[] = [];
    if (validated.tipo === 'maquinas' || validated.tipo === 'eficiencia') {
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

    // Adicionar tempo de parada
    paradasQuery.forEach((p: any) => {
      const maq = maquinasMap.get(p.maquinaId);
      if (maq) {
        maq.tempoParada = Number(p.tempoParada) || 0;
      }
    });

    // Calcular métricas das máquinas
    maquinasMap.forEach(maq => {
      const tempoTotal = maq.tempoProducao + maq.tempoParada;
      maq.disponibilidade = tempoTotal > 0 
        ? Math.round((maq.tempoProducao / tempoTotal) * 10000) / 100 
        : 100;
      
      maq.eficiencia = maq.tempoProducao > 0 ? 100 : 0;
      maq.metrosPorMinuto = maq.tempoProducao > 0 
        ? Math.round((maq.totalMetragem / maq.tempoProducao) * 100) / 100 
        : 0;
    });

    // Calcular totais
    const totais = {
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
    const porDataMap: Record<string, any> = {};
    dadosFiltrados.forEach(d => {
      if (!porDataMap[d.dataISO]) {
        porDataMap[d.dataISO] = {
          data: d.data,
          dataISO: d.dataISO,
          metragemReal: 0,
          metragemEsperadaProduto: 0,
          metragemEsperadaMaquina: 0,
          eficiencia: 0,
          tempoTotal: 0,
          registros: []
        };
      }
      porDataMap[d.dataISO].metragemReal += d.metragemReal;
      porDataMap[d.dataISO].metragemEsperadaProduto += d.metragemEsperadaProduto;
      porDataMap[d.dataISO].metragemEsperadaMaquina += d.metragemEsperadaMaquina;
      porDataMap[d.dataISO].tempoTotal += d.tempoMinutos;
      porDataMap[d.dataISO].registros.push(d);
    });

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

    Object.values(porEstagioMap).forEach((item: any) => {
      item.eficienciaProduto = item.metragemEsperadaProduto > 0 
        ? (item.metragemReal / item.metragemEsperadaProduto) * 100 
        : 0;
      item.eficienciaMaquina = item.metragemEsperadaMaquina > 0 
        ? (item.metragemReal / item.metragemEsperadaMaquina) * 100 
        : 0;
    });

    // Para relatório de paradas
    let dadosParadas: any[] = [];
    if (validated.tipo === 'paradas') {
      console.log('🔍 Buscando dados de paradas por motivo...');
      
      let paradasMotivoSql = `
        SELECT 
          mp.descricao as motivo,
          mp.codigo,
          COUNT(*) as quantidade,
          COALESCE(SUM(EXTRACT(EPOCH FROM (pm.data_fim - pm.data_inicio))/60), 0) as minutos
        FROM paradas_maquina pm
        INNER JOIN maquinas m ON pm.maquina_id = m.id
        INNER JOIN motivos_parada mp ON pm.motivo_parada_id = mp.id
        WHERE pm.data_fim IS NOT NULL
      `;

      const paradasMotivoConditions: string[] = [];

      if (datasFilter.length > 0) {
        const datasStr = datasFilter.map(d => `'${d}'`).join(', ');
        paradasMotivoConditions.push(`DATE(pm.data_inicio) IN (${datasStr})`);
      } else {
        paradasMotivoConditions.push(`pm.data_inicio >= '${dataInicio.toISOString()}'`);
        paradasMotivoConditions.push(`pm.data_fim <= '${dataFim.toISOString()}'`);
      }

      if (maquinasFilter.length > 0) {
        const maquinasStr = maquinasFilter.map(id => `'${id}'`).join(', ');
        paradasMotivoConditions.push(`pm.maquina_id IN (${maquinasStr})`);
      }

      if (paradasMotivoConditions.length > 0) {
        paradasMotivoSql += ' AND ' + paradasMotivoConditions.join(' AND ');
      }

      paradasMotivoSql += ' GROUP BY mp.descricao, mp.codigo';
      
      console.log('📝 Query de paradas por motivo:', paradasMotivoSql);
      
      const paradasMotivoResult = await db.execute(sql.raw(paradasMotivoSql));
      dadosParadas = paradasMotivoResult.rows;
      console.log(`✅ Encontrados ${dadosParadas.length} motivos de parada`);
    }

    // Preparar resposta
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
        diasNoPeriodo,
      },
      graficos: {
        porData: Object.values(porDataMap).sort((a, b) => a.dataISO.localeCompare(b.dataISO)),
        porEstagio: Object.values(porEstagioMap),
      },
    };

    if (validated.tipo === 'paradas') {
      resposta.dados = dadosParadas;
      resposta.graficos.porMotivo = dadosParadas;
    }

    if (validated.tipo === 'operadores') {
      resposta.dados = Array.from(operadoresMap.values())
        .filter(op => op.totalMetragem > 0 || op.quantidadeProducoes > 0)
        .map(op => ({
          ...op,
          metrosPorMinuto: op.tempoTotal > 0 
            ? Math.round((op.totalMetragem / op.tempoTotal) * 100) / 100 
            : 0,
        }));
    }

    if (validated.tipo === 'maquinas') {
      resposta.dados = Array.from(maquinasMap.values())
        .filter(maq => maq.totalMetragem > 0 || maq.tempoProducao > 0)
        .map(maq => ({
          nome: maq.nome,
          totalMetragem: maq.totalMetragem,
          tempoProducao: maq.tempoProducao,
          tempoParada: maq.tempoParada,
          disponibilidade: maq.disponibilidade,
          eficiencia: maq.eficiencia,
          metrosPorMinuto: maq.metrosPorMinuto,
        }));
    }

    console.log('✅ Resposta preparada com', dadosFiltrados.length, 'registros');
    console.log('📊 Totais:', resposta.totais);
    
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