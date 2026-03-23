// src/app/dashboard/page.tsx
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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
  
  // Dados do mês
  producoes_finalizadas_mes: number;
  producoes_finalizadas_mes_anterior: number;
  paradas_mes: number;
  paradas_mes_anterior: number;
  metragem_processada_mes: number;
  metragem_processada_mes_anterior: number;
  metragem_produzida_mes: number;
  metragem_produzida_mes_anterior: number;
};

type Producao = {
  id: string;
  opId: number;
  produto: string;
  maquina: string;
  estagio: string;
  operador: string;
  dataFim: string;
  metragem: number;
};

export default async function DashboardPage() {
  try {
    // Obter datas para cálculo
    const hoje = new Date();
    const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const mesmoDiaMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, hoje.getDate());
    const primeiroDiaMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
    
    const inicioMesAtual = primeiroDiaMes.toISOString().split('T')[0];
    const fimMesAtual = hoje.toISOString().split('T')[0];
    const inicioMesAnterior = primeiroDiaMesAnterior.toISOString().split('T')[0];
    const fimMesAnterior = mesmoDiaMesAnterior.toISOString().split('T')[0];

    const mesAtualNome = hoje.toLocaleDateString('pt-BR', { month: 'long' });
    const mesAnteriorNome = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1).toLocaleDateString('pt-BR', { month: 'long' });
    const periodoAnterior = `${mesAnteriorNome.substring(0,3)}/${primeiroDiaMesAnterior.getDate()}-${mesmoDiaMesAnterior.getDate()}`;

    // Buscar estatísticas principais
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
        
        -- Dados do mês
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

    // Buscar produções finalizadas no mês
    const producoesMes = await db.execute(sql`
      SELECT 
        p.id,
        p.op_id as "opId",
        o.produto,
        m.nome as maquina,
        e.nome as estagio,
        u.nome as operador,
        p.data_fim as "dataFim",
        p.metragem_processada as metragem
      FROM producoes p
      LEFT JOIN ops o ON p.op_id = o.op
      LEFT JOIN maquinas m ON p.maquina_id = m.id
      LEFT JOIN estagios e ON p.estagio_id = e.id
      LEFT JOIN usuarios u ON p.operador_fim_id = u.id
      WHERE DATE(p.data_fim) BETWEEN ${inicioMesAtual}::date AND ${fimMesAtual}::date
        AND p.estagio_id <> '73e1dc52-6447-4e26-af7c-9d50ade7337f'
      ORDER BY p.data_fim DESC
    `);

    // Buscar OPs por status
    const opsList = await db.execute(sql`
      SELECT 
        op,
        produto,
        status,
        estagio_atual as estagio,
        maquina_atual as maquina
      FROM ops
      ORDER BY op DESC
      LIMIT 100
    `);

    // Calcular variações
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
      mes_atual_nome: mesAtualNome,
      mes_anterior_nome: mesAnteriorNome,
      periodo_anterior: periodoAnterior,
    };

    const producoesFinalizadas = producoesMes.rows as Producao[];
    const opsRows = opsList.rows as any[];

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
          {/* Card Máquinas */}
          <Dialog>
            <DialogTrigger asChild>
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
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
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Detalhamento de Máquinas</DialogTitle>
              </DialogHeader>
              <div className="p-4">
                <p className="text-gray-500">Em desenvolvimento...</p>
              </div>
            </DialogContent>
          </Dialog>

          {/* Card Operadores */}
          <Dialog>
            <DialogTrigger asChild>
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
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
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Operadores Ativos</DialogTitle>
              </DialogHeader>
              <div className="p-4">
                <p className="text-gray-500">Em desenvolvimento...</p>
              </div>
            </DialogContent>
          </Dialog>

          {/* Card OPs em Aberto */}
          <Dialog>
            <DialogTrigger asChild>
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
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
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Ordens de Produção</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-2">
                  <div className="bg-blue-50 p-3 rounded-lg text-center">
                    <p className="text-xs text-blue-600">Abertas</p>
                    <p className="text-xl font-bold">{stats?.ops_abertas}</p>
                  </div>
                  <div className="bg-yellow-50 p-3 rounded-lg text-center">
                    <p className="text-xs text-yellow-600">Andamento</p>
                    <p className="text-xl font-bold">{stats?.ops_andamento}</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg text-center">
                    <p className="text-xs text-green-600">Finalizadas</p>
                    <p className="text-xl font-bold">{stats?.ops_finalizadas}</p>
                  </div>
                  <div className="bg-red-50 p-3 rounded-lg text-center">
                    <p className="text-xs text-red-600">Canceladas</p>
                    <p className="text-xl font-bold">{stats?.ops_canceladas}</p>
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>OP</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>Estágio</TableHead>
                      <TableHead>Máquina</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {opsRows.map((op) => (
                      <TableRow key={op.op}>
                        <TableCell className="font-medium">OP {op.op}</TableCell>
                        <TableCell>{op.produto}</TableCell>
                        <TableCell>{op.estagio}</TableCell>
                        <TableCell>{op.maquina}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            op.status === 'ABERTA' ? 'bg-blue-100 text-blue-800' :
                            op.status === 'EM_ANDAMENTO' ? 'bg-yellow-100 text-yellow-800' :
                            op.status === 'FINALIZADA' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {op.status.replace('_', ' ')}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </DialogContent>
          </Dialog>

          {/* Card Produções Ativas */}
          <Dialog>
            <DialogTrigger asChild>
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
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
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Produções em Andamento</DialogTitle>
              </DialogHeader>
              <div className="p-4">
                <p className="text-gray-500">Em desenvolvimento...</p>
              </div>
            </DialogContent>
          </Dialog>
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
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Estágios Finalizados - {statsComVariacao.mes_atual_nome}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>OP</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>Máquina</TableHead>
                      <TableHead>Estágio</TableHead>
                      <TableHead>Operador</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Metragem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {producoesFinalizadas.map((prod) => (
                      <TableRow key={prod.id}>
                        <TableCell className="font-medium">OP {prod.opId}</TableCell>
                        <TableCell>{prod.produto}</TableCell>
                        <TableCell>{prod.maquina}</TableCell>
                        <TableCell>{prod.estagio}</TableCell>
                        <TableCell>{prod.operador}</TableCell>
                        <TableCell>{new Date(prod.dataFim).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell className="text-right">{Number(prod.metragem).toLocaleString('pt-BR')} m</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
                <p className="text-gray-500">Em desenvolvimento...</p>
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
                <p className="text-gray-500">Em desenvolvimento...</p>
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
                <p className="text-gray-500">Em desenvolvimento...</p>
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