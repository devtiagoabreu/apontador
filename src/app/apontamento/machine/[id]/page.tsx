//src/app/apontamento/machine/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { maquinas } from '@/lib/db/schema/maquinas';
import { ops } from '@/lib/db/schema/ops';
import { producoesTable } from '@/lib/db/schema/producoes';
import { paradasMaquina } from '@/lib/db/schema/paradas-maquina';
import { motivosParada } from '@/lib/db/schema/motivos-parada';
import { estagios } from '@/lib/db/schema/estagios';
import { eq, and, sql } from 'drizzle-orm';
import { MobileCard } from '@/components/mobile/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { ArrowLeft, Play, Pause, CheckCircle, PlayCircle, Layers, Search, X } from 'lucide-react';

// Interfaces para tipagem
interface Maquina {
  id: string;
  nome: string;
  codigo: string;
  status: 'DISPONIVEL' | 'EM_PROCESSO' | 'PARADA';
}

interface ProducaoAtiva {
  id: string;
  opId: number;
  opNumero: number;
  opProduto: string;
  estagioNome: string;
  estagioCor: string;
  dataInicio: Date;
  metragemProcessada: number | null;
}

interface ParadaAtiva {
  id: string;
  dataInicio: Date;
  opId: number | null;
  observacoes: string | null;
  motivoDescricao: string;
  motivoCodigo: string;
}

interface OPDisp {
  op: number;
  produto: string;
  qtdeProgramado: number;
  um: string;
  status: string;
}

// FORÇA A PÁGINA A SER SEMPRE ATUALIZADA (SEM CACHE)
export const revalidate = 0;
export const dynamic = 'force-dynamic';

// Componente de busca de OP (client component)
function SearchOP({ maquinaId, onSelect }: { maquinaId: string; onSelect?: (op: any) => void }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/ops/search?q=${encodeURIComponent(searchTerm)}`);
      const data = await response.json();
      setSearchResults(data);
      setShowResults(true);
    } catch (error) {
      console.error('Erro ao buscar OP:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleSelect = (op: any) => {
    setSearchTerm(`OP ${op.op}`);
    setShowResults(false);
    if (onSelect) onSelect(op);
  };

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Digite o número da OP..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-10 pr-10"
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSearchResults([]);
                setShowResults(false);
              }}
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
            >
              <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>
        <Button onClick={handleSearch} disabled={loading} size="sm">
          {loading ? 'Buscando...' : 'Buscar'}
        </Button>
      </div>

      {/* Resultados da busca */}
      {showResults && searchResults.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {searchResults.map((op) => (
            <div
              key={op.op}
              className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
              onClick={() => handleSelect(op)}
            >
              <p className="font-medium">OP {op.op}</p>
              <p className="text-sm text-gray-500 line-clamp-1">{op.produto}</p>
              <p className="text-xs text-gray-400 mt-1">
                Programado: {Number(op.qtdeProgramado).toLocaleString('pt-BR')} {op.um}
              </p>
            </div>
          ))}
        </div>
      )}

      {showResults && searchResults.length === 0 && !loading && (
        <div className="absolute z-10 mt-1 w-full bg-white border rounded-md shadow-lg p-4 text-center text-gray-500">
          Nenhuma OP encontrada
        </div>
      )}
    </div>
  );
}

// Componente Client para gerenciar estado
function MachineClient({ 
  maquina, 
  producoesAtivas, 
  paradaAtiva, 
  opsDisponiveis, 
  paramsId 
}: { 
  maquina: Maquina;
  producoesAtivas: ProducaoAtiva[];
  paradaAtiva: ParadaAtiva | null;
  opsDisponiveis: OPDisp[];
  paramsId: string;
}) {
  const [selectedOp, setSelectedOp] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('✅ MachineClient montado');
    console.log('📊 Maquina:', maquina);
    console.log('📊 Produções ativas:', producoesAtivas);
    console.log('📊 Parada ativa:', paradaAtiva);
    console.log('📊 OPs disponíveis:', opsDisponiveis);
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Carregando...</p>
      </div>
    );
  }

  // Verificação de segurança
  if (!maquina) {
    console.error('❌ Máquina não encontrada');
    return (
      <div className="p-4">
        <p className="text-red-500">Erro: Máquina não encontrada</p>
        <Link href="/apontamento">
          <Button className="mt-4">Voltar</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
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
            {producoesAtivas && producoesAtivas.length > 1 && (
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
            <Link href={`/apontamento/finalizar-parada?paradaId=${paradaAtiva.id}&maquinaId=${paramsId}`}>
              <Button className="w-full bg-green-600 hover:bg-green-700">
                <PlayCircle className="mr-2 h-4 w-4" />
                Finalizar Parada
              </Button>
            </Link>
          </div>
        </MobileCard>
      )}

      {/* SE TEM PRODUÇÕES ATIVAS (mostra todas) */}
      {!paradaAtiva && producoesAtivas && producoesAtivas.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-medium flex items-center gap-2">
            <Layers className="h-5 w-5 text-blue-600" />
            Produções em andamento ({producoesAtivas.length})
          </h2>
          
          {producoesAtivas.map((producao: ProducaoAtiva) => (
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
                
                <div className="flex gap-2 mt-3">
                  <Link href={`/apontamento/producoes/finalizar?id=${producao.id}`} className="flex-1">
                    <Button size="sm" className="w-full" variant="default">
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Finalizar
                    </Button>
                  </Link>
                  <Link href={`/apontamento/parada?maquinaId=${paramsId}&opId=${producao.opId}&producaoId=${producao.id}`} className="flex-1">
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
          {/* Botão de Parada Rápida */}
          <Link href={`/apontamento/parada?maquinaId=${paramsId}`}>
            <Button className="w-full bg-yellow-600 hover:bg-yellow-700 text-white">
              <Pause className="mr-2 h-4 w-4" />
              Registrar Parada (sem OP)
            </Button>
          </Link>

          {/* 🔍 CAMPO DE BUSCA DE OP */}
          <div className="mt-4">
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Buscar OP por número
            </label>
            <SearchOP 
              maquinaId={paramsId} 
              onSelect={(op) => setSelectedOp(op)}
            />
            {selectedOp && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">OP {selectedOp.op}</p>
                    <p className="text-sm text-gray-600">{selectedOp.produto}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Programado: {Number(selectedOp.qtdeProgramado).toLocaleString('pt-BR')} {selectedOp.um}
                    </p>
                  </div>
                  <Link href={`/apontamento/iniciar?machine=${paramsId}&op=${selectedOp.op}`}>
                    <Button size="sm">
                      <Play className="mr-1 h-4 w-4" />
                      Iniciar
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Lista de OPs disponíveis */}
          <div className="space-y-3 mt-4">
            <h2 className="font-medium">OPs disponíveis para iniciar</h2>
            
            {opsDisponiveis && opsDisponiveis.length === 0 ? (
              <MobileCard>
                <p className="text-center text-gray-500 py-4">
                  Nenhuma OP disponível no momento
                </p>
              </MobileCard>
            ) : (
              opsDisponiveis && opsDisponiveis.map((op: OPDisp) => {
                const jaEmProducao = producoesAtivas?.some((p: ProducaoAtiva) => p.opId === op.op) || false;
                
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
                        <Link href={`/apontamento/iniciar?machine=${paramsId}&op=${op.op}`}>
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

// Componente Server que busca os dados
export default async function MachinePage({ params }: { params: { id: string } }) {
  console.log('🔍 MachinePage iniciando para máquina:', params.id);
  
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      console.log('❌ Sem sessão, redirecionando para login');
      redirect('/login');
    }

    // Buscar dados da máquina
    const maquina = await db.query.maquinas.findFirst({
      where: eq(maquinas.id, params.id),
    });

    if (!maquina) {
      console.log('❌ Máquina não encontrada:', params.id);
      redirect('/apontamento');
    }

    console.log('✅ Máquina encontrada:', maquina.nome);

    // Buscar produções ativas
    const producoesAtivasRaw = await db
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

    console.log(`📊 Encontradas ${producoesAtivasRaw.length} produções ativas`);

    const producoesAtivas: ProducaoAtiva[] = producoesAtivasRaw.map(p => ({
      id: p.id,
      opId: p.opId,
      opNumero: p.opNumero || 0,
      opProduto: p.opProduto || '',
      estagioNome: p.estagioNome || '',
      estagioCor: p.estagioCor || '#666',
      dataInicio: p.dataInicio,
      metragemProcessada: p.metragemProcessada ? Number(p.metragemProcessada) : null,
    }));

    // Buscar parada ativa
    const paradaAtivaRaw = await db
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

    const paradaAtiva: ParadaAtiva | null = paradaAtivaRaw ? {
      id: paradaAtivaRaw.id,
      dataInicio: paradaAtivaRaw.dataInicio,
      opId: paradaAtivaRaw.opId,
      observacoes: paradaAtivaRaw.observacoes,
      motivoDescricao: paradaAtivaRaw.motivoDescricao || 'Motivo não especificado',
      motivoCodigo: paradaAtivaRaw.motivoCodigo || '',
    } : null;

    // Buscar OPs disponíveis
    const opsDisponiveisRaw = await db
      .select()
      .from(ops)
      .where(
        and(
          sql`${ops.status} != 'FINALIZADA'`,
          sql`${ops.status} != 'CANCELADA'`
        )
      )
      .orderBy(ops.op)
      .limit(50);

    const opsDisponiveis: OPDisp[] = opsDisponiveisRaw.map(op => ({
      op: op.op,
      produto: op.produto,
      qtdeProgramado: typeof op.qtdeProgramado === 'string' ? parseFloat(op.qtdeProgramado) : (op.qtdeProgramado || 0),
      um: op.um || 'M',
      status: op.status || 'ABERTA',
    }));

    console.log(`📊 Encontradas ${opsDisponiveis.length} OPs disponíveis`);

    return (
      <MachineClient 
        maquina={{
          id: maquina.id,
          nome: maquina.nome,
          codigo: maquina.codigo,
          status: maquina.status as 'DISPONIVEL' | 'EM_PROCESSO' | 'PARADA',
        }}
        producoesAtivas={producoesAtivas}
        paradaAtiva={paradaAtiva}
        opsDisponiveis={opsDisponiveis}
        paramsId={params.id}
      />
    );
  } catch (error) {
    console.error('❌ Erro ao carregar página da máquina:', error);
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <h2 className="text-red-800 font-medium mb-2">Erro ao carregar página</h2>
          <p className="text-red-600 text-sm">{error instanceof Error ? error.message : 'Erro desconhecido'}</p>
        </div>
        <Link href="/apontamento">
          <Button>Voltar</Button>
        </Link>
      </div>
    );
  }
}