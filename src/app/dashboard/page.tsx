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
  BarChart3
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

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
};

export default async function DashboardPage() {
  // Buscar estatísticas
  const result = await db.execute(sql`
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
            AND estagio_id <> '73e1dc52-6447-4e26-af7c-9d50ade7337f' -- estágio (Finalizar) utilizado para fila de revisão de op do pcp não deve contar como produção
      ), 0) AS producoes_ativas,

      COALESCE((
          SELECT COUNT(*) 
          FROM producoes 
          WHERE DATE(data_fim) = CURRENT_DATE
            AND estagio_id <> '73e1dc52-6447-4e26-af7c-9d50ade7337f' -- estágio (Finalizar) utilizado para fila de revisão de op do pcp não deve contar como produção
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
          AND estagio_id <> '73e1dc52-6447-4e26-af7c-9d50ade7337f' -- estágio (Finalizar) utilizado para fila de revisão de op do pcp não deve contar como produção
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
  `);

  // Converter para o tipo correto
  const stats = result.rows[0] as DashboardStats;

  // Calcular eficiência global
  const eficienciaGlobal = stats.tempo_total_producao_hoje > 0 
    ? (stats.tempo_total_producao_hoje / (stats.tempo_total_producao_hoje + stats.tempo_total_paradas_hoje) * 100).toFixed(1)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="text-sm text-gray-500">
          {new Date().toLocaleDateString('pt-BR', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </div>
      </div>
      
      {/* Cards principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Máquinas</CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_maquinas ?? 0}</div>
            <div className="flex gap-2 mt-1 text-xs">
              <span className="text-green-600">{stats?.maquinas_disponiveis ?? 0} disponíveis</span>
              <span className="text-blue-600">{stats?.maquinas_em_processo ?? 0} em processo</span>
              <span className="text-yellow-600">{stats?.maquinas_paradas ?? 0} paradas</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Operadores</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_operadores ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.operadores_ativos ?? 0} ativos agora
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">OPs em Aberto</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.ops_abertas ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.ops_andamento ?? 0} em andamento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produções Ativas</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.producoes_ativas ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.paradas_ativas ?? 0} paradas ativas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Métricas de hoje */}
      <h2 className="text-xl font-semibold mt-8">Resumo do Dia</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estágios Finalizados</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.producoes_finalizadas_hoje ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paradas Registradas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.paradas_hoje ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Metragem Processada</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(stats?.metragem_total_hoje ?? 0).toLocaleString('pt-BR')} m</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Metragem Produzida</CardTitle>
            <Clock className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(stats?.metragem_produzida_total_hoje ?? 0).toLocaleString('pt-BR')} m</div>
          </CardContent>
        </Card>
      </div>

      {/* Status das OPs */}
      <h2 className="text-xl font-semibold mt-8">Status das OPs</h2>
      <div className="grid gap-4 md:grid-cols-4">
        <Link href="/dashboard/ops?status=ABERTA">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Abertas</p>
                  <p className="text-3xl font-bold text-blue-600">{stats?.ops_abertas ?? 0}</p>
                </div>
                <Package className="h-8 w-8 text-blue-600 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/ops?status=EM_ANDAMENTO">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Em Andamento</p>
                  <p className="text-3xl font-bold text-yellow-600">{stats?.ops_andamento ?? 0}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-yellow-600 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/ops?status=FINALIZADA">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Finalizadas</p>
                  <p className="text-3xl font-bold text-green-600">{stats?.ops_finalizadas ?? 0}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/ops?status=CANCELADA">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Canceladas</p>
                  <p className="text-3xl font-bold text-red-600">{stats?.ops_canceladas ?? 0}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-600 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Links rápidos */}
      <div className="flex gap-4 mt-8">
        <Link href="/dashboard/relatorios">
          <Button variant="outline">Ver Relatórios</Button>
        </Link>
        <Link href="/dashboard/kanban">
          <Button variant="outline">Modo Kanban</Button>
        </Link>
        <Link href="/dashboard/producoes">
          <Button variant="outline">Produções</Button>
        </Link>
      </div>
    </div>
  );
}