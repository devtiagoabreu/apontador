'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MobileCard } from '@/components/mobile/card';
import { ArrowLeft, PlayCircle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Suspense } from 'react';

function FinalizarParadaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paradaId = searchParams.get('paradaId');
  const maquinaId = searchParams.get('maquinaId');
  
  const [loading, setLoading] = useState(false);
  const [parada, setParada] = useState<any>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (paradaId) {
      carregarParada();
    }
  }, [paradaId]);

  async function carregarParada() {
    try {
      const response = await fetch(`/api/paradas-maquina/${paradaId}`);
      const data = await response.json();
      setParada(data);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar a parada',
        variant: 'destructive',
      });
    } finally {
      setCarregando(false);
    }
  }

  async function handleFinalizar() {
    setLoading(true);
    try {
      const response = await fetch(`/api/paradas-maquina/${paradaId}/finalizar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataFim: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao finalizar');
      }

      toast({
        title: 'Sucesso',
        description: 'Parada finalizada com sucesso',
      });

      router.push(`/apontamento/machine/${maquinaId}`);
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao finalizar parada',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  if (carregando) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-3">
          <Link href={`/apontamento/machine/${maquinaId}`}>
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
      <div className="flex items-center gap-3">
        <Link href={`/apontamento/machine/${maquinaId}`}>
          <Button variant="ghost" size="icon" className="h-10 w-10">
            <ArrowLeft className="h-6 w-6" />
          </Button>
        </Link>
        <h1 className="text-xl font-semibold">Finalizar Parada</h1>
      </div>

      <MobileCard>
        <div className="space-y-4">
          <div className="bg-yellow-50 p-3 rounded-lg">
            <p className="text-sm font-medium text-yellow-700">Motivo da Parada</p>
            <p className="text-sm">{parada?.motivo?.descricao}</p>
            {parada?.observacoes && (
              <p className="text-xs text-yellow-600 mt-1">{parada.observacoes}</p>
            )}
          </div>

          <p className="text-sm text-gray-600">
            Clique no botão abaixo para finalizar esta parada e liberar a máquina.
          </p>

          <Button 
            className="w-full bg-green-600 hover:bg-green-700"
            onClick={handleFinalizar}
            disabled={loading}
          >
            <PlayCircle className="mr-2 h-4 w-4" />
            {loading ? 'Finalizando...' : 'Confirmar Finalização'}
          </Button>
        </div>
      </MobileCard>
    </div>
  );
}

export default function FinalizarParadaPage() {
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
      <FinalizarParadaContent />
    </Suspense>
  );
}