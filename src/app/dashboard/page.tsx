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
  try {
    // Obter datas para cálculo
    const hoje = new Date();
    const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const mesmoDiaMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, hoje.getDate());
    const primeiroDiaMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
    
    // Formatar datas como strings ISO (YYYY-MM-DD)
    const inicioMesAtual = primeiroDiaMes.toISOString().split('T')[0];
    const fimMesAtual = hoje.toISOString().split('T')[0];
    const inicioMesAnterior = primeiroDiaMesAnterior.toISOString().split('T')[0];
    const fimMesAnterior = mesmoDiaMesAnterior.toISOString().split('T')[0];

    // Nomes dos meses para exibição
    const mesAtualNome = hoje.toLocaleDateString('pt-BR', { month: 'long' });
    const mesAnteriorNome = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1).toLocaleDateString('pt-BR', { month: 'long' });
    
    // Período para exibição (ex: "fev/01-12")
    const periodoAnterior = `${mesAnteriorNome.substring(0,3)}/${primeiroDiaMesAnterior.getDate()}-${mesmoDiaMesAnterior.getDate()}`;

    const result = await db.execute(sql`
      WITH datas AS (
        SELECT 
          CURRENT_DATE as hoje,
          ${inicioMesAtual}::date as inicio_mes_atual,
          ${fimMesAtual}::date as fim_mes_atual,
          ${inicioMesAnterior}::date as inicio_mes_anterior,
          ${fimMesAnterior}::date as fim_mes_anterior
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
        
        -- 🔴 CORRIGIDO: Métricas do mês com conversão explícita para date
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

    const stats = result.rows[0] as DashboardStats;

    // Calcular variações com segurança
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
      dias_corridos_mes: hoje.getDate(),
      mes_atual_nome: mesAtualNome,
      mes_anterior_nome: mesAnteriorNome,
      periodo_anterior: periodoAnterior,
    };

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

        {/* Cards principais (mantidos iguais) */}
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

        {/* Métricas de hoje e do mês */}
        <h2 className="text-xl font-semibold mt-8">Resumo do Dia / Mês</h2>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Estágios Finalizados */}
          <Dialog>
            <DialogTrigger asChild>
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Estágios Finalizados</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.producoes_finalizadas_hoje ?? 0}</div>
                  <div className="mt-2 pt-2 border-t text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Mês:</span>
                      <span className="font-medium">{statsComVariacao.producoes_finalizadas_mes}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-400">{statsComVariacao.mes_anterior_nome} ({statsComVariacao.periodo_anterior}):</span>
                      <span className={`text-xs font-medium ${
                        Number(statsComVariacao.variacao_producoes) >= 0 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {statsComVariacao.producoes_finalizadas_mes_anterior} 
                        ({Number(statsComVariacao.variacao_producoes) >= 0 ? '▲' : '▼'} 
                        {Math.abs(Number(statsComVariacao.variacao_producoes))}%)
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Estágios Finalizados - {statsComVariacao.mes_atual_nome}</DialogTitle>
              </DialogHeader>
              <div className="p-4">
                <p className="text-gray-500">Listagem das produções finalizadas no mês...</p>
              </div>
            </DialogContent>
          </Dialog>

          {/* Card 2: Paradas Registradas */}
          <Dialog>
            <DialogTrigger asChild>
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Paradas Registradas</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.paradas_hoje ?? 0}</div>
                  <div className="mt-2 pt-2 border-t text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Mês:</span>
                      <span className="font-medium">{statsComVariacao.paradas_mes}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-400">{statsComVariacao.mes_anterior_nome} ({statsComVariacao.periodo_anterior}):</span>
                      <span className={`text-xs font-medium ${
                        Number(statsComVariacao.variacao_paradas) <= 0 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {statsComVariacao.paradas_mes_anterior} 
                        ({Number(statsComVariacao.variacao_paradas) <= 0 ? '▼' : '▲'} 
                        {Math.abs(Number(statsComVariacao.variacao_paradas))}%)
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Paradas Registradas - {statsComVariacao.mes_atual_nome}</DialogTitle>
              </DialogHeader>
              <div className="p-4">
                <p className="text-gray-500">Listagem das paradas registradas no mês...</p>
              </div>
            </DialogContent>
          </Dialog>

          {/* Card 3: Metragem Processada */}
          <Dialog>
            <DialogTrigger asChild>
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Metragem Processada</CardTitle>
                  <BarChart3 className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{(stats?.metragem_total_hoje ?? 0).toLocaleString('pt-BR')} m</div>
                  <div className="mt-2 pt-2 border-t text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Mês:</span>
                      <span className="font-medium">{(statsComVariacao.metragem_processada_mes ?? 0).toLocaleString('pt-BR')} m</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-400">{statsComVariacao.mes_anterior_nome} ({statsComVariacao.periodo_anterior}):</span>
                      <span className={`text-xs font-medium ${
                        Number(statsComVariacao.variacao_metragem_processada) >= 0 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {(statsComVariacao.metragem_processada_mes_anterior ?? 0).toLocaleString('pt-BR')} m
                        ({Number(statsComVariacao.variacao_metragem_processada) >= 0 ? '▲' : '▼'} 
                        {Math.abs(Number(statsComVariacao.variacao_metragem_processada))}%)
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Metragem Processada - {statsComVariacao.mes_atual_nome}</DialogTitle>
              </DialogHeader>
              <div className="p-4">
                <p className="text-gray-500">Gráfico e detalhamento da metragem processada...</p>
              </div>
            </DialogContent>
          </Dialog>

          {/* Card 4: Metragem Produzida */}
          <Dialog>
            <DialogTrigger asChild>
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Metragem Produzida</CardTitle>
                  <Clock className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{(stats?.metragem_produzida_total_hoje ?? 0).toLocaleString('pt-BR')} m</div>
                  <div className="mt-2 pt-2 border-t text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Mês:</span>
                      <span className="font-medium">{(statsComVariacao.metragem_produzida_mes ?? 0).toLocaleString('pt-BR')} m</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-400">{statsComVariacao.mes_anterior_nome} ({statsComVariacao.periodo_anterior}):</span>
                      <span className={`text-xs font-medium ${
                        Number(statsComVariacao.variacao_metragem_produzida) >= 0 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {(statsComVariacao.metragem_produzida_mes_anterior ?? 0).toLocaleString('pt-BR')} m
                        ({Number(statsComVariacao.variacao_metragem_produzida) >= 0 ? '▲' : '▼'} 
                        {Math.abs(Number(statsComVariacao.variacao_metragem_produzida))}%)
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Metragem Produzida - {statsComVariacao.mes_atual_nome}</DialogTitle>
              </DialogHeader>
              <div className="p-4">
                <p className="text-gray-500">Gráfico e detalhamento da metragem produzida...</p>
              </div>
            </DialogContent>
          </Dialog>
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

  } catch (error) {
    console.error('❌ ERRO NO DASHBOARD:', error);
    
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