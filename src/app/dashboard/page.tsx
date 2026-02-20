import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Factory, Users, Package, AlertTriangle } from 'lucide-react';

export default async function DashboardPage() {
  // Buscar estatísticas
  const [stats] = await db.execute(sql`
    SELECT 
      (SELECT COUNT(*) FROM maquinas) as total_maquinas,
      (SELECT COUNT(*) FROM usuarios WHERE nivel = 'OPERADOR') as total_operadores,
      (SELECT COUNT(*) FROM ops WHERE status = 'ABERTA') as ops_abertas,
      (SELECT COUNT(*) FROM ops WHERE status = 'EM_ANDAMENTO') as ops_andamento,
      (SELECT COUNT(*) FROM apontamentos WHERE status = 'EM_ANDAMENTO') as processos_andamento
  `);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Máquinas</CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_maquinas || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Operadores</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_operadores || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">OPs em Aberto</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.ops_abertas || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processos em Andamento</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.processos_andamento || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Aqui vamos adicionar mais cards e gráficos depois */}
      </div>
    </div>
  );
}