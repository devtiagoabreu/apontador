import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Factory, 
  Users, 
  Package, 
  AlertTriangle, 
  TrendingUp, 
  Clock,
  CheckCircle,
  XCircle,
  BarChart3,
  Calendar
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

type DashboardStats = {
  total_maquinas: number;
  maquinas_disponiveis: number;
  maquinas_em_processo: number;
  maquinas_paradas: number;
  total_operadores: number;
  operadores_ativos: number;
  ops_abertas: number;
  ops_andamento: number;
  ops_finalizadas: number;
  ops_canceladas: number;
  producoes_ativas: number;
  producoes_finalizadas_hoje: number;
  paradas_ativas: number;
  paradas_hoje: number;
  metragem_total_hoje: number;
  metragem_produzida_total_hoje: number;
  tempo_total_producao_hoje: number;
  tempo_total_paradas_hoje: number;
  
  // Novos campos
  producoes_finalizadas_mes: number;
  producoes_finalizadas_mes_anterior: number;
  paradas_mes: number;
  paradas_mes_anterior: number;
  metragem_processada_mes: number;
  metragem_processada_mes_anterior: number;
  metragem_produzida_mes: number;
  metragem_produzida_mes_anterior: number;
};

export default async function DashboardPage() {
  console.log('📊 DashboardPage - Iniciando renderização');
  
  try {
    // Obter datas para cálculo
    const hoje = new Date();
    console.log('📅 Data atual:', hoje.toISOString());
    
    const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const mesmoDiaMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, hoje.getDate());
    const primeiroDiaMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
    
    console.log('📅 Períodos:', {
      inicio_mes_atual: primeiroDiaMes.toISOString().split('T')[0],
      fim_mes_atual: hoje.toISOString().split('T')[0],
      inicio_mes_anterior: primeiroDiaMesAnterior.toISOString().split('T')[0],
      fim_mes_anterior: mesmoDiaMesAnterior.toISOString().split('T')[0],
    });

    // Nomes dos meses para exibição
    const mesAtualNome = hoje.toLocaleDateString('pt-BR', { month: 'long' });
    const mesAnteriorNome = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1).toLocaleDateString('pt-BR', { month: 'long' });
    
    // Período para exibição (ex: "fev/01-12")
    const periodoAnterior = `${mesAnteriorNome.substring(0,3)}/${primeiroDiaMesAnterior.getDate()}-${mesmoDiaMesAnterior.getDate()}`;

    console.log('📅 Nomes:', { mesAtualNome, mesAnteriorNome, periodoAnterior });

    const result = await db.execute(sql`
      WITH datas AS (
        SELECT 
          CURRENT_DATE as hoje,
          DATE_TRUNC('month', CURRENT_DATE) as primeiro_dia_mes,
          DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') as primeiro_dia_mes_anterior,
          ${primeiroDiaMes.toISOString().split('T')[0]} as inicio_mes_atual,
          ${hoje.toISOString().split('T')[0]} as fim_mes_atual,
          ${primeiroDiaMesAnterior.toISOString().split('T')[0]} as inicio_mes_anterior,
          ${mesmoDiaMesAnterior.toISOString().split('T')[0]} as fim_mes_anterior
      )
      SELECT 
        -- Máquinas
        COALESCE((SELECT COUNT(*) FROM maquinas), 0) as total_maquinas,
        COALESCE((SELECT COUNT(*) FROM maquinas WHERE status = 'DISPONIVEL'), 0) as maquinas_disponiveis,
        COALESCE((SELECT COUNT(*) FROM maquinas WHERE status = 'EM_PROCESSO'), 0) as maquinas_em_processo,
        COALESCE((SELECT COUNT(*) FROM maquinas WHERE status = 'PARADA'), 0) as maquinas_paradas,
        
        -- Operadores
        COALESCE((SELECT COUNT(*) FROM usuarios WHERE nivel = 'OPERADOR'), 0) as total_operadores,
        COALESCE((
          SELECT COUNT(DISTINCT operador_inicio_id) 
          FROM producoes 
          WHERE data_fim IS NULL
        ), 0) as operadores_ativos,
        
        -- OPs
        COALESCE((SELECT COUNT(*) FROM ops WHERE status = 'ABERTA'), 0) as ops_abertas,
        COALESCE((SELECT COUNT(*) FROM ops WHERE status = 'EM_ANDAMENTO'), 0) as ops_andamento,
        COALESCE((SELECT COUNT(*) FROM ops WHERE status = 'FINALIZADA'), 0) as ops_finalizadas,
        COALESCE((SELECT COUNT(*) FROM ops WHERE status = 'CANCELADA'), 0) as ops_canceladas,
        
        -- Produções
        COALESCE((
            SELECT COUNT(*) 
            FROM producoes 
            WHERE data_fim IS NULL
              AND estagio_id <> '73e1dc52-6447-4e26-af7c-9d50ade7337f'
        ), 0) AS producoes_ativas,

        COALESCE((
            SELECT COUNT(*) 
            FROM producoes 
            WHERE DATE(data_fim) = CURRENT_DATE
              AND estagio_id <> '73e1dc52-6447-4e26-af7c-9d50ade7337f'
        ), 0) AS producoes_finalizadas_hoje,
        
        -- Paradas
        COALESCE((SELECT COUNT(*) FROM paradas_maquina WHERE data_fim IS NULL), 0) as paradas_ativas,
        COALESCE((
          SELECT COUNT(*) FROM paradas_maquina 
          WHERE DATE(data_fim) = CURRENT_DATE
        ), 0) as paradas_hoje,
        
        -- Métricas de produção hoje
        COALESCE((
          SELECT COALESCE(SUM(metragem_processada::numeric), 0) 
          FROM producoes 
          WHERE DATE(data_fim) = CURRENT_DATE
            AND estagio_id <> '73e1dc52-6447-4e26-af7c-9d50ade7337f'
        ), 0) AS metragem_total_hoje,

        COALESCE((
          SELECT COALESCE(SUM(qtde_produzida::numeric), 0) 
          FROM ops 
          WHERE DATE(data_ultimo_apontamento) = CURRENT_DATE
        ), 0) as metragem_produzida_total_hoje,
        
        COALESCE((
          SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (data_fim - data_inicio))/60), 0)
          FROM producoes 
          WHERE DATE(data_fim) = CURRENT_DATE
        ), 0) as tempo_total_producao_hoje,
        
        COALESCE((
          SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (data_fim - data_inicio))/60), 0)
          FROM paradas_maquina 
          WHERE DATE(data_fim) = CURRENT_DATE
        ), 0) as tempo_total_paradas_hoje,
        
        -- Métricas do mês
        COALESCE((
          SELECT COUNT(*) 
          FROM producoes 
          WHERE DATE(data_fim) BETWEEN (SELECT inicio_mes_atual FROM datas) AND (SELECT fim_mes_atual FROM datas)
            AND estagio_id <> '73e1dc52-6447-4e26-af7c-9d50ade7337f'
        ), 0) AS producoes_finalizadas_mes,
        
        COALESCE((
          SELECT COUNT(*) 
          FROM producoes 
          WHERE DATE(data_fim) BETWEEN (SELECT inicio_mes_anterior FROM datas) AND (SELECT fim_mes_anterior FROM datas)
            AND estagio_id <> '73e1dc52-6447-4e26-af7c-9d50ade7337f'
        ), 0) AS producoes_finalizadas_mes_anterior,
        
        COALESCE((
          SELECT COUNT(*) 
          FROM paradas_maquina 
          WHERE DATE(data_fim) BETWEEN (SELECT inicio_mes_atual FROM datas) AND (SELECT fim_mes_atual FROM datas)
        ), 0) AS paradas_mes,
        
        COALESCE((
          SELECT COUNT(*) 
          FROM paradas_maquina 
          WHERE DATE(data_fim) BETWEEN (SELECT inicio_mes_anterior FROM datas) AND (SELECT fim_mes_anterior FROM datas)
        ), 0) AS paradas_mes_anterior,
        
        COALESCE((
          SELECT COALESCE(SUM(metragem_processada::numeric), 0) 
          FROM producoes 
          WHERE DATE(data_fim) BETWEEN (SELECT inicio_mes_atual FROM datas) AND (SELECT fim_mes_atual FROM datas)
            AND estagio_id <> '73e1dc52-6447-4e26-af7c-9d50ade7337f'
        ), 0) AS metragem_processada_mes,
        
        COALESCE((
          SELECT COALESCE(SUM(metragem_processada::numeric), 0) 
          FROM producoes 
          WHERE DATE(data_fim) BETWEEN (SELECT inicio_mes_anterior FROM datas) AND (SELECT fim_mes_anterior FROM datas)
            AND estagio_id <> '73e1dc52-6447-4e26-af7c-9d50ade7337f'
        ), 0) AS metragem_processada_mes_anterior,
        
        COALESCE((
          SELECT COALESCE(SUM(qtde_produzida::numeric), 0) 
          FROM ops 
          WHERE DATE(data_ultimo_apontamento) BETWEEN (SELECT inicio_mes_atual FROM datas) AND (SELECT fim_mes_atual FROM datas)
        ), 0) AS metragem_produzida_mes,
        
        COALESCE((
          SELECT COALESCE(SUM(qtde_produzida::numeric), 0) 
          FROM ops 
          WHERE DATE(data_ultimo_apontamento) BETWEEN (SELECT inicio_mes_anterior FROM datas) AND (SELECT fim_mes_anterior FROM datas)
        ), 0) AS metragem_produzida_mes_anterior
    `);

    console.log('✅ Query executada com sucesso');
    console.log('📊 Resultado bruto:', result.rows[0]);

    const stats = result.rows[0] as DashboardStats;
    console.log('📊 Stats processados:', stats);

    // Calcular variações com segurança
    const diasCorridos = hoje.getDate();
    
    const statsComVariacao = {
      ...stats,
      variacao_producoes: stats.producoes_finalizadas_mes_anterior > 0 
        ? ((stats.producoes_finalizadas_mes - stats.producoes_finalizadas_mes_anterior) / stats.producoes_finalizadas_mes_anterior * 100).toFixed(1)
        : 0,
      variacao_paradas: stats.paradas_mes_anterior > 0
        ? ((stats.paradas_mes - stats.paradas_mes_anterior) / stats.paradas_mes_anterior * 100).toFixed(1)
        : 0,
      variacao_metragem_processada: stats.metragem_processada_mes_anterior > 0
        ? ((stats.metragem_processada_mes - stats.metragem_processada_mes_anterior) / stats.metragem_processada_mes_anterior * 100).toFixed(1)
        : 0,
      variacao_metragem_produzida: stats.metragem_produzida_mes_anterior > 0
        ? ((stats.metragem_produzida_mes - stats.metragem_produzida_mes_anterior) / stats.metragem_produzida_mes_anterior * 100).toFixed(1)
        : 0,
      dias_corridos_mes: diasCorridos,
      mes_atual_nome: mesAtualNome,
      mes_anterior_nome: mesAnteriorNome,
      periodo_anterior: periodoAnterior,
    };

    console.log('📊 Stats com variação:', statsComVariacao);

    const eficienciaGlobal = stats.tempo_total_producao_hoje > 0 
      ? (stats.tempo_total_producao_hoje / (stats.tempo_total_producao_hoje + stats.tempo_total_paradas_hoje) * 100).toFixed(1)
      : 0;

    console.log('✅ Dashboard renderizado com sucesso');

    return (
      <div className="space-y-6">
        {/* ... resto do JSX permanece igual ... */}
      </div>
    );

  } catch (error) {
    console.error('❌ ERRO NO DASHBOARD:');
    console.error('   Mensagem:', error instanceof Error ? error.message : String(error));
    console.error('   Stack:', error instanceof Error ? error.stack : 'N/A');
    
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold text-red-600">Erro no Dashboard</h1>
        <p className="mt-4">Ocorreu um erro ao carregar o dashboard. Verifique os logs do servidor.</p>
        <pre className="mt-4 p-4 bg-gray-100 rounded overflow-auto">
          {error instanceof Error ? error.message : String(error)}
        </pre>
      </div>
    );
  }
}