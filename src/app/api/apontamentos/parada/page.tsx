'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MobileCard } from '@/components/mobile/card';
import { ArrowLeft, Pause, Play } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface MotivoParada {
  id: string;
  codigo: string;
  descricao: string;
}

export default function ParadaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const apontamentoId = searchParams.get('apontamento');
  
  const [loading, setLoading] = useState(false);
  const [motivos, setMotivos] = useState<MotivoParada[]>([]);
  const [motivoSelecionado, setMotivoSelecionado] = useState<string>('');
  const [observacoes, setObservacoes] = useState<string>('');
  const [apontamento, setApontamento] = useState<any>(null);
  const [emParada, setEmParada] = useState(false);

  useEffect(() => {
    carregarMotivos();
    if (apontamentoId) {
      carregarApontamento();
    }
  }, [apontamentoId]);

  async function carregarMotivos() {
    try {
      const response = await fetch('/api/motivos-parada');
      const data = await response.json();
      setMotivos(data);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os motivos',
        variant: 'destructive',
      });
    }
  }

  async function carregarApontamento() {
    try {
      const response = await fetch(`/api/apontamentos/${apontamentoId}`);
      const data = await response.json();
      setApontamento(data);
      setEmParada(!!data.inicioParada && !data.fimParada);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o apontamento',
        variant: 'destructive',
      });
    }
  }

  async function handleRegistrarParada() {
    if (!motivoSelecionado && !emParada) {
      toast({
        title: 'Erro',
        description: 'Selecione um motivo para a parada',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/apontamentos/${apontamentoId}/parada`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          motivoId: motivoSelecionado,
          observacoes,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao registrar parada');
      }

      toast({
        title: 'Sucesso',
        description: data.message,
      });

      router.push(`/apontamento/machine/${apontamento?.maquinaId}`);
      
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao registrar',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3">
        <Link href={apontamento ? `/apontamento/machine/${apontamento.maquinaId}` : '/apontamento'}>
          <Button variant="ghost" size="icon" className="h-10 w-10">
            <ArrowLeft className="h-6 w-6" />
          </Button>
        </Link>
        <h1 className="text-xl font-semibold">
          {emParada ? 'Finalizar Parada' : 'Registrar Parada'}
        </h1>
      </div>

      <MobileCard>
        <div className="space-y-4">
          {emParada ? (
            // Modo: Finalizar parada
            <>
              <div className="bg-yellow-50 p-3 rounded-lg">
                <p className="text-sm text-yellow-700">
                  Máquina em parada. Clique no botão abaixo para retomar a produção.
                </p>
              </div>

              <Button 
                className="w-full" 
                onClick={handleRegistrarParada}
                disabled={loading}
              >
                <Play className="mr-2 h-4 w-4" />
                {loading ? 'Processando...' : 'Retomar Produção'}
              </Button>
            </>
          ) : (
            // Modo: Iniciar parada
            <>
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Motivo da Parada
                </label>
                <select
                  value={motivoSelecionado}
                  onChange={(e) => setMotivoSelecionado(e.target.value)}
                  className="w-full rounded-md border border-gray-300 p-3 text-base"
                  disabled={loading}
                >
                  <option value="">Selecione um motivo...</option>
                  {motivos.map((motivo) => (
                    <option key={motivo.id} value={motivo.id}>
                      {motivo.codigo} - {motivo.descricao}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Observações (opcional)
                </label>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
 rows={3}
                  className="w-full rounded-md border border-gray-300 p-3 text-base"
                  placeholder="Descreva o motivo da parada..."
                  disabled={loading}
                />
              </div>

              <Button 
                className="w-full bg-yellow-600 hover:bg-yellow-700" 
                onClick={handleRegistrarParada}
                disabled={loading}
              >
                <Pause className="mr-2 h-4 w-4" />
                {loading ? 'Registrando...' : 'Registrar Parada'}
              </Button>
            </>
          )}
        </div>
      </MobileCard>
    </div>
  );
}