'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MobileCard } from '@/components/mobile/card';
import { ArrowLeft, Play, Search, Layers } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Suspense } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

interface Maquina {
  id: string;
  nome: string;
  codigo: string;
  status: string;
  producoesAtivas?: number; // 🔴 NOVO: contar produções ativas
}

interface OP {
  op: number;
  produto: string;
  qtdeCarregado: number;
  um: string;
  status: string;
}

interface Estagio {
  id: string;
  codigo: string;
  nome: string;
}

function IniciarContent() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [opNumero, setOpNumero] = useState('');
  const [op, setOp] = useState<OP | null>(null);
  const [maquinas, setMaquinas] = useState<Maquina[]>([]);
  const [estagios, setEstagios] = useState<Estagio[]>([]);
  const [maquinaId, setMaquinaId] = useState<string>('');
  const [estagioId, setEstagioId] = useState<string>('');
  const [isReprocesso, setIsReprocesso] = useState(false);
  const [carregandoDados, setCarregandoDados] = useState(true);

  useEffect(() => {
    carregarDadosIniciais();
  }, []);

  async function carregarDadosIniciais() {
    try {
      // 🔴 ALTERADO: Buscar TODAS as máquinas (não apenas disponíveis)
      const [maquinasRes, estagiosRes] = await Promise.all([
        fetch('/api/maquinas'), // SEM FILTRO de disponibilidade
        fetch('/api/estagios?ativos=true'),
      ]);

      const maquinasData = await maquinasRes.json();
      const estagiosData = await estagiosRes.json();

      // 🔴 NOVO: Para cada máquina, contar produções ativas
      const maquinasComContagem = await Promise.all(
        maquinasData.map(async (maquina: Maquina) => {
          try {
            const producoesRes = await fetch(`/api/producoes?ativas=true&maquinaId=${maquina.id}`);
            const producoesData = await producoesRes.json();
            return {
              ...maquina,
              producoesAtivas: producoesData.data?.length || 0
            };
          } catch {
            return { ...maquina, producoesAtivas: 0 };
          }
        })
      );

      setMaquinas(maquinasComContagem);
      setEstagios(estagiosData);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados',
        variant: 'destructive',
      });
    } finally {
      setCarregandoDados(false);
    }
  }

  async function buscarOP() {
    if (!opNumero) {
      toast({
        title: 'Atenção',
        description: 'Digite o número da OP',
        variant: 'destructive',
      });
      return;
    }

    setBuscando(true);
    try {
      const response = await fetch(`/api/ops/${opNumero}`);
      
      if (!response.ok) {
        throw new Error('OP não encontrada');
      }

      const data = await response.json();
      
      if (data.status === 'FINALIZADA' || data.status === 'CANCELADA') {
        throw new Error('OP já finalizada ou cancelada');
      }

      setOp(data);
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao buscar OP',
        variant: 'destructive',
      });
      setOp(null);
    } finally {
      setBuscando(false);
    }
  }

  async function handleIniciar() {
    if (!op) {
      toast({
        title: 'Erro',
        description: 'Selecione uma OP',
        variant: 'destructive',
      });
      return;
    }

    if (!maquinaId) {
      toast({
        title: 'Erro',
        description: 'Selecione uma máquina',
        variant: 'destructive',
      });
      return;
    }

    if (!estagioId) {
      toast({
        title: 'Erro',
        description: 'Selecione um estágio',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/producoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opId: op.op,
          maquinaId,
          estagioId,
          isReprocesso,
          observacoes: '',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao iniciar produção');
      }

      toast({
        title: 'Sucesso',
        description: 'Produção iniciada com sucesso',
      });

      router.push('/apontamento/producoes');
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao iniciar',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  if (carregandoDados) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-3">
          <Link href="/apontamento/producoes">
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <ArrowLeft className="h-6 w-6" />
            </Button>
          </Link>
          <h1 className="text-xl font-semibold">Carregando...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3">
        <Link href="/apontamento/producoes">
          <Button variant="ghost" size="icon" className="h-10 w-10">
            <ArrowLeft className="h-6 w-6" />
          </Button>
        </Link>
        <h1 className="text-xl font-semibold">Iniciar Produção</h1>
      </div>

      {/* Buscar OP */}
      <MobileCard>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="op">Número da OP</Label>
            <div className="flex gap-2">
              <Input
                id="op"
                type="number"
                value={opNumero}
                onChange={(e) => setOpNumero(e.target.value)}
                placeholder="Digite o número da OP"
                className="flex-1"
              />
              <Button onClick={buscarOP} disabled={buscando} variant="outline">
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {op && (
            <div className="bg-blue-50 p-3 rounded-lg space-y-1">
              <p className="font-medium">OP {op.op}</p>
              <p className="text-sm text-gray-600">{op.produto}</p>
              <p className="text-xs text-gray-500">
                Programado: {op.qtdeCarregado} {op.um}
              </p>
            </div>
          )}
        </div>
      </MobileCard>

      {/* Seleção de Máquina */}
      {op && (
        <MobileCard>
          <div className="space-y-4">
            <Label>Máquina</Label>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
              {maquinas.map((maquina) => {
                const isSelected = maquinaId === maquina.id;
                const temProducoes = maquina.producoesAtivas && maquina.producoesAtivas > 0;
                
                return (
                  <div
                    key={maquina.id}
                    className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                      isSelected 
                        ? 'border-blue-500 bg-blue-50' 
                        : temProducoes
                          ? 'border-purple-300 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setMaquinaId(maquina.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{maquina.nome}</p>
                        <p className="text-xs text-gray-500">Código: {maquina.codigo}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {temProducoes && (
                          <span className="flex items-center gap-1 text-xs bg-purple-200 text-purple-700 px-2 py-1 rounded-full">
                            <Layers className="h-3 w-3" />
                            {maquina.producoesAtivas} OP(s)
                          </span>
                        )}
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          maquina.status === 'DISPONIVEL' 
                            ? 'bg-green-100 text-green-700' 
                            : maquina.status === 'EM_PROCESSO'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {maquina.status}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </MobileCard>
      )}

      {/* Seleção de Estágio */}
      {op && maquinaId && (
        <MobileCard>
          <div className="space-y-4">
            <Label htmlFor="estagio">Estágio</Label>
            <Select value={estagioId} onValueChange={setEstagioId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o estágio" />
              </SelectTrigger>
              <SelectContent>
                {estagios.map((estagio) => (
                  <SelectItem key={estagio.id} value={estagio.id}>
                    {estagio.codigo} - {estagio.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </MobileCard>
      )}

      {/* Reprocesso */}
      {op && maquinaId && estagioId && (
        <MobileCard>
          <div className="space-y-4">
            <div className="flex items-start space-x-2">
              <Checkbox
                id="reprocesso"
                checked={isReprocesso}
                onCheckedChange={(checked) => setIsReprocesso(checked as boolean)}
                className="mt-1"
              />
              <div className="space-y-1">
                <Label htmlFor="reprocesso" className="text-sm font-medium">
                  🔄 É reprocesso?
                </Label>
                <p className="text-xs text-gray-500">
                  Marque se este produto já passou por este estágio anteriormente
                </p>
              </div>
            </div>
          </div>
        </MobileCard>
      )}

      {/* Botão Iniciar */}
      {op && maquinaId && estagioId && (
        <Button 
          className="w-full" 
          onClick={handleIniciar}
          disabled={loading}
        >
          <Play className="mr-2 h-4 w-4" />
          {loading ? 'Iniciando...' : 'Iniciar Produção'}
        </Button>
      )}
    </div>
  );
}

export default function IniciarProducaoPage() {
  return (
    <Suspense fallback={
      <div className="p-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-10 w-10">
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-xl font-semibold">Carregando...</h1>
        </div>
      </div>
    }>
      <IniciarContent />
    </Suspense>
  );
}