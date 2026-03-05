import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { maquinas } from '@/lib/db/schema/maquinas';
import { ops } from '@/lib/db/schema/ops';
import { producoesTable } from '@/lib/db/schema/producoes'; // ✅ Importar produções
import { paradasMaquina } from '@/lib/db/schema/paradas-maquina';
import { motivosParada } from '@/lib/db/schema/motivos-parada';
import { estagios } from '@/lib/db/schema/estagios'; // ✅ Importar estágios
import { eq, and, sql } from 'drizzle-orm';
import { MobileCard } from '@/components/mobile/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Play, Pause, CheckCircle, PlayCircle, Layers } from 'lucide-react';

// FORÇA A PÁGINA A SER SEMPRE ATUALIZADA (SEM CACHE)
export const revalidate = 0;
export const dynamic = 'force-dynamic';

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

  // 🔴 NOVO: Buscar TODAS as produções ativas nesta máquina
  const producoesAtivas = await db
    .select({
      id: producoesTable.id,
      opId: producoesTable.opId,
      estagioId: producoesTable.estagioId,
      dataInicio: producoesTable.dataInicio,
      metragemProgramada: producoesTable.metragemProgramada,
      metragemProcessada: producoesTable.metragemProcessada,
      isReprocesso: producoesTable.isReprocesso,
      opNumero: ops.op,
      opProduto: ops.produto,
      opProgramado: ops.qtdeProgramado,
      opUm: ops.um,
      estagioNome: estagios.nome,
      estagioCodigo: estagios.codigo,
      estagioCor: estagios.cor,
    })
    .from(producoesTable)
    .leftJoin(ops, eq(producoesTable.opId, ops.op))
    .leftJoin(estagios, eq(producoesTable.estagioId, estagios.id))
    .where(
      and(
        eq(producoesTable.maquinaId, params.id),
        sql`${producoesTable.dataFim} IS NULL`
      )
    );

  console.log(`📊 Encontradas ${producoesAtivas.length} produções ativas na máquina`);

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
    .limit(100);

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
          <div className="flex items-center gap-2">
            {producoesAtivas.length > 1 && (
              <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs flex items-center gap-1">
                <Layers className="h-3 w-3" />
                {producoesAtivas.length} OPs
              </span>
            )}
            <span className={`font-medium px-3 py-1 rounded-full text-sm ${
              maquina.status === 'DISPONIVEL' ? 'bg-green-100 text-green-700' :
              maquina.status === 'EM_PROCESSO' ? 'bg-blue-100 text-blue-700' :
              'bg-yellow-100 text-yellow-700'
            }`}>
              {maquina.status === 'DISPONIVEL' ? 'Disponível' :
               maquina.status === 'EM_PROCESSO' ? 'Em Processo' : 'Parada'}
            </span>
          </div>
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

      {/* SE TEM PRODUÇÕES ATIVAS (mostra todas) */}
      {!paradaAtiva && producoesAtivas.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-medium flex items-center gap-2">
            <Layers className="h-5 w-5 text-blue-600" />
            Produções em andamento ({producoesAtivas.length})
          </h2>
          
          {producoesAtivas.map((producao) => (
            <MobileCard key={producao.id}>
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">OP {producao.opNumero}</p>
                    <p className="text-sm text-gray-500 line-clamp-2">{producao.opProduto}</p>
                  </div>
                  <span 
                    className="text-xs px-2 py-1 rounded-full"
                    style={{ 
                      backgroundColor: producao.estagioCor ? `${producao.estagioCor}20` : '#f0f0f0',
                      color: producao.estagioCor || '#666'
                    }}
                  >
                    {producao.estagioNome}
                  </span>
                </div>
                
                <p className="text-xs text-gray-400">
                  Iniciado: {new Date(producao.dataInicio).toLocaleString('pt-BR')}
                </p>
                
                {producao.metragemProcessada && (
                  <p className="text-xs text-gray-500">
                    Processado: {Number(producao.metragemProcessada).toLocaleString('pt-BR')} m
                  </p>
                )}
                
                {/* Botões de ação para cada produção */}
                <div className="flex gap-2 mt-3">
                  <Link href={`/apontamento/finalizar?producao=${producao.id}`} className="flex-1">
                    <Button size="sm" className="w-full" variant="default">
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Finalizar
                    </Button>
                  </Link>
                  <Link href={`/apontamento/parada?maquinaId=${params.id}&opId=${producao.opId}&producaoId=${producao.id}`} className="flex-1">
                    <Button size="sm" className="w-full text-yellow-600" variant="outline">
                      <Pause className="mr-2 h-4 w-4" />
                      Parada
                    </Button>
                  </Link>
                </div>
              </div>
            </MobileCard>
          ))}
        </div>
      )}

      {/* SE NÃO TEM NADA (disponível) OU TEM ESPAÇO PARA MAIS OPs */}
      {!paradaAtiva && (
        <>
          {/* Botão de Parada Rápida (sempre disponível) */}
          <Link href={`/apontamento/parada?maquinaId=${params.id}`}>
            <Button className="w-full bg-yellow-600 hover:bg-yellow-700 text-white mb-4">
              <Pause className="mr-2 h-4 w-4" />
              Registrar Parada (sem OP)
            </Button>
          </Link>

          <div className="space-y-3">
            <h2 className="font-medium">OPs disponíveis para iniciar</h2>
            
            {opsDisponiveis.length === 0 ? (
              <MobileCard>
                <p className="text-center text-gray-500 py-4">
                  Nenhuma OP disponível no momento
                </p>
              </MobileCard>
            ) : (
              opsDisponiveis.map((op) => {
                // Verificar se esta OP já está em produção nesta máquina
                const jaEmProducao = producoesAtivas.some(p => p.opId === op.op);
                
                return (
                  <MobileCard key={op.op} className={jaEmProducao ? 'opacity-50' : ''}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium">OP {op.op}</p>
                        <p className="text-sm text-gray-500 line-clamp-2">{op.produto}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Programado: {Number(op.qtdeProgramado).toLocaleString('pt-BR')} {op.um}
                        </p>
                        {jaEmProducao && (
                          <p className="text-xs text-blue-600 mt-1">
                            ✓ Já está em produção nesta máquina
                          </p>
                        )}
                      </div>
                      {!jaEmProducao && (
                        <Link href={`/apontamento/iniciar?machine=${params.id}&op=${op.op}`}>
                          <Button size="sm" className="ml-2">
                            <Play className="mr-1 h-4 w-4" />
                            Iniciar
                          </Button>
                        </Link>
                      )}
                    </div>
                  </MobileCard>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}