'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MobileCard } from '@/components/mobile/card';
import { MobileHeader } from '@/components/mobile/header';
import { MobileNav } from '@/components/mobile/nav';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Suspense } from 'react';
import { formatNumber } from '@/lib/utils';

function FinalizarContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const producaoId = searchParams.get('id');
  
  const [loading, setLoading] = useState(false);
  const [producao, setProducao] = useState<any>(null);
  const [metragem, setMetragem] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (producaoId) {
      carregarProducao();
    }
  }, [producaoId]);

  async function carregarProducao() {
    try {
      const response = await fetch(`/api/producoes/${producaoId}`);
      const data = await response.json();
      setProducao(data);
      
      // Sugerir o valor carregado
      if (data.op?.carregado) {
        setMetragem(data.op.carregado.toString());
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar a produção',
        variant: 'destructive',
      });
    } finally {
      setCarregando(false);
    }
  }

  async function handleFinalizar() {
    if (!metragem || parseFloat(metragem) <= 0) {
      toast({
        title: 'Erro',
        description: 'Informe a metragem processada',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/producoes/${producaoId}/finalizar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metragemProcessada: parseFloat(metragem),
          observacoes,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao finalizar');
      }

      toast({
        title: 'Sucesso',
        description: 'Produção finalizada com sucesso',
      });

      router.push('/apontamento/producoes');
      
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao finalizar',
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
    <div className="min-h-screen bg-gray-50">
      <MobileHeader user={{ nome: 'Operador', matricula: '123' }} />
      
      <main className="p-4 pb-20">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/apontamento/producoes">
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <ArrowLeft className="h-6 w-6" />
            </Button>
          </Link>
          <h1 className="text-xl font-semibold">Finalizar Produção</h1>
        </div>

        <MobileCard>
          <div className="space-y-4">
            {/* Informações */}
            <div className="bg-blue-50 p-3 rounded-lg space-y-1">
              <p className="font-medium">OP {producao?.op?.op}</p>
              <p className="text-sm text-gray-600">{producao?.op?.produto}</p>
              <p className="text-xs text-gray-500">
                Carregado: {formatNumber(producao?.op?.carregado || 0)} {producao?.op?.um}
              </p>
            </div>

            <div className="bg-purple-50 p-3 rounded-lg">
              <p className="text-sm font-medium">Estágio</p>
              <div className="flex items-center gap-2 mt-1">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: producao?.estagio?.cor }}
                />
                <p className="text-sm">{producao?.estagio?.nome}</p>
              </div>
            </div>

            {/* Metragem Processada */}
            <div className="space-y-2">
              <Label htmlFor="metragem">Metragem Processada *</Label>
              <Input
                id="metragem"
                type="number"
                step="0.01"
                value={metragem}
                onChange={(e) => setMetragem(e.target.value)}
                placeholder="Digite a metragem processada"
              />
              <p className="text-xs text-gray-500">
                Carregado: {formatNumber(producao?.op?.carregado || 0)} {producao?.op?.um}
              </p>
            </div>

            {/* Observações */}
            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Observações (opcional)"
                rows={3}
              />
            </div>

            {/* Botão */}
            <Button 
              className="w-full bg-green-600 hover:bg-green-700"
              onClick={handleFinalizar}
              disabled={loading}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              {loading ? 'Finalizando...' : 'Finalizar Produção'}
            </Button>
          </div>
        </MobileCard>
      </main>
      
      <MobileNav />
    </div>
  );
}

export default function FinalizarProducaoPage() {
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
      <FinalizarContent />
    </Suspense>
  );
}