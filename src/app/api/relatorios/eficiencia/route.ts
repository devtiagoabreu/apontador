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
import { sql, and, inArray, eq } from 'drizzle-orm';
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
}

interface GraficoData {
  data: string;
  metragemReal: number;
  metragemEsperadaProduto: number;
  metragemEsperadaMaquina: number;
  tempoTotal: number;
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

// Schema de validação dos filtros
const filtrosSchema = z.object({
  maquinas: z.array(z.string()).optional(),
  operadores: z.array(z.string()).optional(),
  datas: z.array(z.string()).optional(),
  grupos: z.array(z.string()).optional(),
  estagios: z.array(z.string()).optional(),
  referencia: z.enum(['produto', 'maquina']).default('produto'),
});

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

    // Construir query base
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

    // Aplicar filtros
    const conditions = [];

    if (validated.maquinas && validated.maquinas.length > 0) {
      conditions.push(sql`p.maquina_id IN (${sql.join(validated.maquinas, sql`, `)})`);
    }

    if (validated.operadores && validated.operadores.length > 0) {
      conditions.push(sql`p.operador_fim_id IN (${sql.join(validated.operadores, sql`, `)})`);
    }

    if (validated.estagios && validated.estagios.length > 0) {
      conditions.push(sql`p.estagio_id IN (${sql.join(validated.estagios, sql`, `)})`);
    }

    if (validated.datas && validated.datas.length > 0) {
      conditions.push(sql`DATE(p.data_fim) IN (${sql.join(validated.datas.map(d => `'${d}'`), sql`, `)})`);
    }

    // Aplicar condições à query
    if (conditions.length > 0) {
      query = sql`${query} AND ${sql.join(conditions, sql` AND `)}`;
    }

    query = sql`${query} ORDER BY p.data_fim DESC`;

    console.log('🔍 Executando query...');
    const result = await db.execute(query);
    console.log(`✅ Encontrados ${result.rows.length} registros`);

    // Buscar todos os produtos do banco para mapear códigos
    const todosProdutos = await db.select().from(produtos);
    const produtosMap = new Map<string, typeof produtos.$inferSelect>(
      todosProdutos.map(p => [p.codigo, p])
    );

    // Processar dados com tipagem correta
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

      return {
        id: rowData.id,
        data: rowData.dataFim?.split('T')[0] || '',
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
    if (validated.grupos && validated.grupos.length > 0) {
      dadosFiltrados = dadosProcessados.filter(d => 
        d.grupo && validated.grupos?.includes(d.grupo)
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
      if (!porDataMap[d.data]) {
        porDataMap[d.data] = {
          data: d.data,
          metragemReal: 0,
          metragemEsperadaProduto: 0,
          metragemEsperadaMaquina: 0,
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
      },
      graficos: {
        porData: Object.values(porDataMap),
        porEstagio: Object.values(porEstagioMap),
      },
      filtrosAplicados: validated,
    };

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