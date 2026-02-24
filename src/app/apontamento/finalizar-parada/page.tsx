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
  const [erroCarregamento, setErroCarregamento] = useState<string | null>(null);

  useEffect(() => {
    if (paradaId) {
      carregarParada();
    } else {
      setCarregando(false);
      setErroCarregamento('ID da parada não informado');
    }
  }, [paradaId]);

  async function carregarParada() {
    try {
      console.log('🔍 Buscando parada:', paradaId);
      const response = await fetch(`/api/paradas-maquina/${paradaId}`);
      
      console.log('📊 Status da resposta:', response.status);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Parada não encontrada');
        }
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ Parada carregada:', data);
      setParada(data);
      setErroCarregamento(null);
    } catch (error) {
      console.error('❌ Erro ao carregar parada:', error);
      setErroCarregamento(error instanceof Error ? error.message : 'Erro desconhecido');
      
      // NÃO mostrar toast aqui - apenas registra no estado
      // O toast será mostrado apenas se o usuário tentar finalizar sem dados
    } finally {
      setCarregando(false);
    }
  }

  async function handleFinalizar() {
    if (!parada) {
      toast({
        title: 'Erro',
        description: 'Dados da parada não carregados. Tente novamente.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      console.log('📦 Finalizando parada:', paradaId);
      
      const response = await fetch(`/api/paradas-maquina/${paradaId}/finalizar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataFim: new Date().toISOString(),
        }),
      });

      const data = await response.json();
      console.log('📦 Resposta:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao finalizar');
      }

      toast({
        title: 'Sucesso',
        description: 'Parada finalizada com sucesso',
      });

      // Redirecionar com refresh forçado
      router.refresh();
      router.push(`/apontamento/machine/${maquinaId}?t=${Date.now()}`);
      
    } catch (error) {
      console.error('❌ Erro:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao finalizar parada',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  // Estado de carregamento
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

  // Estado de erro (mas ainda permite tentar finalizar)
  if (erroCarregamento) {
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
              <p className="text-sm font-medium text-yellow-700">Aviso</p>
              <p className="text-sm">Não foi possível carregar os detalhes da parada.</p>
              <p className="text-xs text-yellow-600 mt-1">Erro: {erroCarregamento}</p>
            </div>

            <p className="text-sm text-gray-600">
              Você ainda pode finalizar a parada. A máquina será liberada.
            </p>

            <Button 
              className="w-full bg-green-600 hover:bg-green-700"
              onClick={handleFinalizar}
              disabled={loading}
            >
              <PlayCircle className="mr-2 h-4 w-4" />
              {loading ? 'Finalizando...' : 'Finalizar Parada (mesmo assim)'}
            </Button>
          </div>
        </MobileCard>
      </div>
    );
  }

  // Estado normal (com dados carregados)
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
            <p className="text-sm">{parada?.motivo?.descricao || 'Não informado'}</p>
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