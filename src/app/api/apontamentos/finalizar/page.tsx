'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MobileCard } from '@/components/mobile/card';
import { ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

export default function FinalizarPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const apontamentoId = searchParams.get('apontamento');
  
  const [loading, setLoading] = useState(false);
  const [metragem, setMetragem] = useState<string>('');
  const [apontamento, setApontamento] = useState<any>(null);
  const [op, setOp] = useState<any>(null);

  useEffect(() => {
    if (apontamentoId) {
      carregarDados();
    }
  }, [apontamentoId]);

  async function carregarDados() {
    try {
      // Buscar apontamento e OP
      const response = await fetch(`/api/apontamentos/${apontamentoId}`);
      const data = await response.json();
      
      setApontamento(data);
      
      // Buscar detalhes da OP
      if (data.opId) {
        const opRes = await fetch(`/api/ops/${data.opId}`);
        const opData = await opRes.json();
        setOp(opData);
        
        // Sugerir quantidade programada como padrão
        if (opData.qtdeProgramado) {
          setMetragem(opData.qtdeProgramado.toString());
        }
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados',
        variant: 'destructive',
      });
    }
  }

  async function handleFinalizar() {
    if (!metragem || parseFloat(metragem) <= 0) {
      toast({
        title: 'Erro',
        description: 'Informe a metragem produzida',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/apontamentos/${apontamentoId}/finalizar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metragem: parseFloat(metragem) }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao finalizar');
      }

      toast({
        title: 'Sucesso',
        description: 'Produção finalizada com sucesso',
      });

      router.push('/apontamento');
      
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

  if (!apontamento || !op) {
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
        <Link href="/apontamento">
          <Button variant="ghost" size="icon" className="h-10 w-10">
            <ArrowLeft className="h-6 w-6" />
          </Button>
        </Link>
        <h1 className="text-xl font-semibold">Finalizar Produção</h1>
      </div>

      {/* Card de finalização */}
      <MobileCard>
        <div className="space-y-4">
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm text-blue-700">
              OP {op.op} - {op.produto}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="metragem">Metragem produzida ({op.um})</Label>
            <Input
              id="metragem"
              type="number"
              step="0.01"
              min="0"
              value={metragem}
              onChange={(e) => setMetragem(e.target.value)}
              placeholder="0,00"
              className="text-lg"
            />
            {op.qtdeProgramado && (
              <p className="text-xs text-gray-500">
                Programado: {Number(op.qtdeProgramado).toLocaleString('pt-BR')} {op.um}
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Link href="/apontamento" className="flex-1">
              <Button variant="outline" className="w-full" disabled={loading}>
                Cancelar
              </Button>
            </Link>
            <Button 
              className="flex-1" 
              onClick={handleFinalizar}
              disabled={loading}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              {loading ? 'Finalizando...' : 'Confirmar'}
            </Button>
          </div>
        </div>
      </MobileCard>
    </div>
  );
}