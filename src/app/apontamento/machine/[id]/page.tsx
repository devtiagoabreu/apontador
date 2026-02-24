import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { maquinas } from '@/lib/db/schema/maquinas';
import { ops } from '@/lib/db/schema/ops';
import { apontamentos } from '@/lib/db/schema/apontamentos';
import { paradasMaquina } from '@/lib/db/schema/paradas-maquina';
import { motivosParada } from '@/lib/db/schema/motivos-parada';
import { eq, and, sql } from 'drizzle-orm';
import { MobileCard } from '@/components/mobile/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Play, Pause, CheckCircle, PlayCircle } from 'lucide-react';

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

  // Buscar apontamento ativo nesta máquina (produção)
  const apontamentoAtivo = await db
    .select({
      id: apontamentos.id,
      dataInicio: apontamentos.dataInicio,
      opId: apontamentos.opId,
      opNumero: ops.op,
      opProduto: ops.produto,
      opProgramado: ops.qtdeProgramado,
      opUm: ops.um,
    })
    .from(apontamentos)
    .leftJoin(ops, eq(apontamentos.opId, ops.op))
    .where(
      and(
        eq(apontamentos.maquinaId, params.id),
        eq(apontamentos.status, 'EM_ANDAMENTO')
      )
    )
    .then(rows => rows[0] || null);

  // Buscar parada ativa nesta máquina
  const paradaAtiva = await db
    .select({
      id: paradasMaquina.id,
      dataInicio: paradasMaquina.dataInicio,
      opId: paradasMaquina.opId,
      observacoes: paradasMaquina.observacoes,
      motivoDescricao: motivosParada.descricao,
      motivoCodigo: motivosParada.codigo,
    })
    .from(paradasMaquina)
    .leftJoin(motivosParada, eq(paradasMaquina.motivoParadaId, motivosParada.id))
    .where(
      and(
        eq(paradasMaquina.maquinaId, params.id),
        sql`${paradasMaquina.dataFim} IS NULL`
      )
    )
    .then(rows => rows[0] || null);

  // Buscar OPs disponíveis
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
      {/* Cabeçalho com botão voltar */}
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

      {/* Card de status da máquina */}
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

      {/* SE TEM PARADA ATIVA */}
      {paradaAtiva && (
        <MobileCard>
          <h2 className="font-medium mb-3 text-yellow-600 flex items-center gap-2">
            <Pause className="h-5 w-5" /> Máquina em Parada
          </h2>
          <div className="space-y-2">
            <p className="text-sm">
              <span className="font-medium">Motivo:</span> {paradaAtiva.motivoDescricao}
            </p>
            {paradaAtiva.observacoes && (
              <p className="text-sm text-gray-600">{paradaAtiva.observacoes}</p>
            )}
            <p className="text-xs text-gray-400">
              Iniciado: {new Date(paradaAtiva.dataInicio).toLocaleString('pt-BR')}
            </p>
            {paradaAtiva.opId && (
              <p className="text-xs text-gray-500">
                OP {paradaAtiva.opId} estava em produção quando parou
              </p>
            )}
          </div>
          
          {/* Botão para finalizar parada */}
          <div className="mt-4">
            <Link href={`/apontamento/finalizar-parada?paradaId=${paradaAtiva.id}&maquinaId=${params.id}`}>
              <Button className="w-full bg-green-600 hover:bg-green-700">
                <PlayCircle className="mr-2 h-4 w-4" />
                Finalizar Parada
              </Button>
            </Link>
          </div>
        </MobileCard>
      )}

      {/* SE TEM PRODUÇÃO ATIVA (só mostra se não tiver parada) */}
      {!paradaAtiva && apontamentoAtivo && (
        <MobileCard>
          <h2 className="font-medium mb-3">Produção em andamento</h2>
          <div className="space-y-2">
            <p className="text-sm">OP: {apontamentoAtivo.opNumero}</p>
            <p className="text-sm text-gray-500">{apontamentoAtivo.opProduto}</p>
            <p className="text-xs text-gray-400">
              Iniciado: {new Date(apontamentoAtivo.dataInicio).toLocaleString('pt-BR')}
            </p>
          </div>
          
          {/* Botões de ação */}
          <div className="flex gap-2 mt-4">
            <Link href={`/apontamento/finalizar?apontamento=${apontamentoAtivo.id}`} className="flex-1">
              <Button className="w-full" variant="default">
                <CheckCircle className="mr-2 h-4 w-4" />
                Finalizar
              </Button>
            </Link>
            <Link href={`/apontamento/parada?maquinaId=${params.id}&opId=${apontamentoAtivo.opId}`} className="flex-1">
              <Button className="w-full text-yellow-600" variant="outline">
                <Pause className="mr-2 h-4 w-4" />
                Parada
              </Button>
            </Link>
          </div>
        </MobileCard>
      )}

      {/* SE NÃO TEM NADA (disponível) */}
      {!paradaAtiva && !apontamentoAtivo && (
        <>
          {/* Botão de Parada Rápida (sem OP) */}
          <Link href={`/apontamento/parada?maquinaId=${params.id}`}>
            <Button className="w-full bg-yellow-600 hover:bg-yellow-700 text-white mb-4">
              <Pause className="mr-2 h-4 w-4" />
              Registrar Parada (sem OP)
            </Button>
          </Link>

          <div className="space-y-3">
            <h2 className="font-medium">OPs disponíveis</h2>
            
            {opsDisponiveis.length === 0 ? (
              <MobileCard>
                <p className="text-center text-gray-500 py-4">
                  Nenhuma OP disponível no momento
                </p>
              </MobileCard>
            ) : (
              opsDisponiveis.map((op) => (
                <MobileCard key={op.op}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium">OP {op.op}</p>
                      <p className="text-sm text-gray-500 line-clamp-2">{op.produto}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Programado: {Number(op.qtdeProgramado).toLocaleString('pt-BR')} {op.um}
                      </p>
                    </div>
                    <Link href={`/apontamento/iniciar?machine=${params.id}&op=${op.op}`}>
                      <Button size="sm" className="ml-2">
                        <Play className="mr-1 h-4 w-4" />
                        Iniciar
                      </Button>
                    </Link>
                  </div>
                </MobileCard>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}