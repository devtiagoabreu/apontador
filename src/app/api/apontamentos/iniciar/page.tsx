'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MobileCard } from '@/components/mobile/card';
import { ArrowLeft, Play, AlertCircle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

export default function IniciarPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const machineId = searchParams.get('machine');
  const opNumero = searchParams.get('op');
  
  const [loading, setLoading] = useState(false);
  const [maquina, setMaquina] = useState<any>(null);
  const [op, setOp] = useState<any>(null);

  useEffect(() => {
    if (machineId && opNumero) {
      carregarDados();
    }
  }, [machineId, opNumero]);

  async function carregarDados() {
    try {
      const [maquinaRes, opRes] = await Promise.all([
        fetch(`/api/maquinas/${machineId}`),
        fetch(`/api/ops/${opNumero}`),
      ]);

      const maquinaData = await maquinaRes.json();
      const opData = await opRes.json();

      setMaquina(maquinaData);
      setOp(opData);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados',
        variant: 'destructive',
      });
    }
  }

  async function handleIniciar() {
    setLoading(true);
    try {
      const response = await fetch('/api/apontamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opId: parseInt(opNumero!),
          maquinaId: machineId,
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

      router.push(`/apontamento/machine/${machineId}`);
      
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

  if (!maquina || !op) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          <Link href="/apontamento">
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
        <Link href={`/apontamento/machine/${machineId}`}>
          <Button variant="ghost" size="icon" className="h-10 w-10">
            <ArrowLeft className="h-6 w-6" />
          </Button>
        </Link>
        <h1 className="text-xl font-semibold">Iniciar Produção</h1>
      </div>

      {/* Card de confirmação */}
      <MobileCard>
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-yellow-600 bg-yellow-50 p-3 rounded-lg">
            <AlertCircle className="h-5 w-5" />
            <p className="text-sm">Confirme os dados antes de iniciar</p>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Máquina</p>
              <p className="font-medium">{maquina.nome}</p>
              <p className="text-xs text-gray-400">Código: {maquina.codigo}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Ordem de Produção</p>
              <p className="font-medium">OP {op.op}</p>
              <p className="text-sm text-gray-600 mt-1">{op.produto}</p>
              <p className="text-xs text-gray-400 mt-1">
                Programado: {Number(op.qtdeProgramado).toLocaleString('pt-BR')} {op.um}
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Link href={`/apontamento/machine/${machineId}`} className="flex-1">
              <Button variant="outline" className="w-full" disabled={loading}>
                Cancelar
              </Button>
            </Link>
            <Button 
              className="flex-1" 
              onClick={handleIniciar}
              disabled={loading}
            >
              <Play className="mr-2 h-4 w-4" />
              {loading ? 'Iniciando...' : 'Confirmar Início'}
            </Button>
          </div>
        </div>
      </MobileCard>
    </div>
  );
}