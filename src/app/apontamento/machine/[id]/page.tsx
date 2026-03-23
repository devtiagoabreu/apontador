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

// Componente de busca de OP
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

// Componente principal
export default function MachinePage({ params }: { params: { id: string } }) {
  const [maquina, setMaquina] = useState<Maquina | null>(null);
  const [producoesAtivas, setProducoesAtivas] = useState<ProducaoAtiva[]>([]);
  const [paradaAtiva, setParadaAtiva] = useState<ParadaAtiva | null>(null);
  const [opsDisponiveis, setOpsDisponiveis] = useState<OPDisp[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOp, setSelectedOp] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    carregarDados();
  }, [params.id]);

  async function carregarDados() {
    setLoading(true);
    setError(null);
    
    try {
      // Buscar dados da máquina via API
      const maquinaRes = await fetch(`/api/maquinas/${params.id}`);
      if (!maquinaRes.ok) throw new Error('Erro ao carregar máquina');
      const maquinaData = await maquinaRes.json();
      setMaquina(maquinaData);

      // Buscar produções ativas
      const producoesRes = await fetch(`/api/producoes?maquinaId=${params.id}&ativas=true`);
      if (producoesRes.ok) {
        const producoesData = await producoesRes.json();
        setProducoesAtivas(producoesData.data || []);
      }

      // Buscar parada ativa
      const paradaRes = await fetch(`/api/paradas-maquina/ativas?maquinaId=${params.id}`);
      if (paradaRes.ok) {
        const paradaData = await paradaRes.json();
        setParadaAtiva(paradaData);
      }

      // Buscar OPs disponíveis
      const opsRes = await fetch(`/api/ops?status=ABERTA,EM_ANDAMENTO`);
      if (opsRes.ok) {
        const opsData = await opsRes.json();
        setOpsDisponiveis(opsData.data || []);
      }

    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
      setError('Erro ao carregar dados da máquina');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Carregando...</p>
      </div>
    );
  }

  if (error || !maquina) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <h2 className="text-red-800 font-medium mb-2">Erro ao carregar página</h2>
          <p className="text-red-600 text-sm">{error || 'Máquina não encontrada'}</p>
        </div>
        <Link href="/apontamento">
          <Button>Voltar</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      {/* Cabeçalho */}
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

      {/* Status */}
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

      {/* Parada Ativa */}
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

      {/* Produções Ativas */}
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
                
                <div className="flex gap-2 mt-3">
                  <Link href={`/apontamento/producoes/finalizar?id=${producao.id}`} className="flex-1">
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

      {/* Ações */}
      {!paradaAtiva && (
        <>
          <Link href={`/apontamento/parada?maquinaId=${params.id}`}>
            <Button className="w-full bg-yellow-600 hover:bg-yellow-700 text-white">
              <Pause className="mr-2 h-4 w-4" />
              Registrar Parada (sem OP)
            </Button>
          </Link>

          {/* Busca de OP */}
          <div className="mt-4">
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Buscar OP por número
            </label>
            <SearchOP 
              maquinaId={params.id} 
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
                  <Link href={`/apontamento/iniciar?machine=${params.id}&op=${selectedOp.op}`}>
                    <Button size="sm">
                      <Play className="mr-1 h-4 w-4" />
                      Iniciar
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Lista de OPs */}
          <div className="space-y-3 mt-4">
            <h2 className="font-medium">OPs disponíveis para iniciar</h2>
            
            {opsDisponiveis.length === 0 ? (
              <MobileCard>
                <p className="text-center text-gray-500 py-4">
                  Nenhuma OP disponível no momento
                </p>
              </MobileCard>
            ) : (
              opsDisponiveis.map((op) => {
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