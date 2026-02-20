import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { maquinas } from '@/lib/db/schema/maquinas';
import { ops } from '@/lib/db/schema/ops';
import { apontamentos } from '@/lib/db/schema/apontamentos';
import { eq, and, sql } from 'drizzle-orm';
import { MobileCard } from '@/components/mobile/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Play, Pause, CheckCircle } from 'lucide-react';

export default async function MachinePage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  // Buscar dados da máquina
  const maquina = await db.query.maquinas.findFirst({
    where: eq(maquinas.id, params.id),
  });

  if (!maquina) {
    redirect('/apontamento');
  }

  // Buscar apontamento ativo nesta máquina
  const apontamentoAtivo = await db.query.apontamentos.findFirst({
    where: and(
      eq(apontamentos.maquinaId, params.id),
      eq(apontamentos.status, 'EM_ANDAMENTO')
    ),
    with: {
      op: true,
    },
  });

  // Buscar OPs disponíveis (que ainda não passaram pelo último estágio)
  const opsDisponiveis = await db
    .select()
    .from(ops)
    .where(
      and(
        sql`${ops.status} != 'FINALIZADA'`,
        sql`${ops.status} != 'CANCELADA'`
      )
    )
    .limit(20);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/apontamento">
          <Button variant="ghost" size="icon" className="h-10 w-10">
            <ArrowLeft className="h-6 w-6" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-semibold">{maquina.nome}</h1>
          <p className="text-sm text-gray-500">Código: {maquina.codigo}</p>
        </div>
      </div>

      {/* Status da máquina */}
      <MobileCard>
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Status</span>
          <span className={`font-medium px-3 py-1 rounded-full text-sm ${
            maquina.status === 'DISPONIVEL' ? 'bg-green-100 text-green-700' :
            maquina.status === 'EM_PROCESSO' ? 'bg-blue-100 text-blue-700' :
            'bg-yellow-100 text-yellow-700'
          }`}>
            {maquina.status === 'DISPONIVEL' ? 'Disponível' :
             maquina.status === 'EM_PROCESSO' ? 'Em Processo' : 'Parada'}
          </span>
        </div>
      </MobileCard>

      {/* Se tem apontamento ativo */}
      {apontamentoAtivo && (
        <MobileCard>
          <h2 className="font-medium mb-3">Produção em andamento</h2>
          <div className="space-y-2">
            <p className="text-sm">OP: {apontamentoAtivo.op.op}</p>
            <p className="text-sm text-gray-500">{apontamentoAtivo.op.produto}</p>
            <p className="text-xs text-gray-400">
              Iniciado: {new Date(apontamentoAtivo.dataInicio).toLocaleString('pt-BR')}
            </p>
          </div>
          <div className="flex gap-2 mt-4">
            <Button className="flex-1" variant="default">
              <CheckCircle className="mr-2 h-4 w-4" />
              Finalizar
            </Button>
            <Button className="flex-1" variant="outline" className="text-yellow-600">
              <Pause className="mr-2 h-4 w-4" />
              Parada
            </Button>
          </div>
        </MobileCard>
      )}

      {/* Lista de OPs disponíveis */}
      {!apontamentoAtivo && (
        <div className="space-y-3">
          <h2 className="font-medium">OPs disponíveis</h2>
          {opsDisponiveis.map((op) => (
            <MobileCard key={op.op}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">OP {op.op}</p>
                  <p className="text-sm text-gray-500">{op.produto}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Programado: {op.qtdeProgramado} {op.um}
                  </p>
                </div>
                <Link href={`/apontamento/iniciar?machine=${params.id}&op=${op.op}`}>
                  <Button size="sm">
                    <Play className="mr-1 h-4 w-4" />
                    Iniciar
                  </Button>
                </Link>
              </div>
            </MobileCard>
          ))}
        </div>
      )}
    </div>
  );
}