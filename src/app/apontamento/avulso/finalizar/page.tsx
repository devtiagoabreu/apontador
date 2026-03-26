// src/app/apontamento/avulso/finalizar/page.tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MobileCard } from '@/components/mobile/card';
import { ArrowLeft, CheckCircle, Package } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

function FinalizarAvulsoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  
  const [loading, setLoading] = useState(false);
  const [carregandoDados, setCarregandoDados] = useState(true);
  const [registro, setRegistro] = useState<any>(null);
  const [metragem, setMetragem] = useState<string>('');
  const [observacoes, setObservacoes] = useState<string>('');

  useEffect(() => {
    if (id) carregarDados();
  }, [id]);

  async function carregarDados() {
    try {
      const response = await fetch(`/api/producoes-avulsas/${id}`);
      if (!response.ok) throw new Error();
      const data = await response.json();
      setRegistro(data);
    } catch (error) {
      toast({ title: 'Erro', description: 'Erro ao carregar dados do registro', variant: 'destructive' });
    } finally {
      setCarregandoDados(false);
    }
  }

  async function handleFinalizar() {
    if (!metragem || parseFloat(metragem) <= 0) {
      toast({ title: 'Erro', description: 'Informe a metragem produzida', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/producoes-avulsas/${id}/finalizar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metragem: parseFloat(metragem),
          observacoes
        }),
      });

      if (!response.ok) throw new Error();

      toast({ title: 'Sucesso', description: 'Produção avulsa finalizada!' });
      router.push(`/apontamento/machine/${registro.maquina_id}`);
    } catch (error) {
      toast({ title: 'Erro', description: 'Erro ao finalizar', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  if (carregandoDados) return <div className="p-8 text-center">Carregando...</div>;
  if (!registro) return <div className="p-8 text-center text-red-500">Registro não encontrado.</div>;

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href={`/apontamento/machine/${registro.maquina_id}`}>
          <Button variant="ghost" size="icon"><ArrowLeft className="h-6 w-6" /></Button>
        </Link>
        <h1 className="text-xl font-semibold">Finalizar Avulso</h1>
      </div>

      <MobileCard>
        <div className="space-y-4">
          <div className="bg-green-50 p-4 rounded-lg border border-green-100 flex items-start gap-3">
            <Package className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <p className="font-bold text-green-800 text-lg">{registro.produto_codigo}</p>
              <p className="text-sm text-green-700">{registro.produto_nome}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Máquina</p>
              <p className="font-medium">{registro.maquina_nome}</p>
            </div>
            <div>
              <p className="text-gray-500">Estágio</p>
              <p className="font-medium">{registro.estagio_nome}</p>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <Label htmlFor="metragem">Metragem Final ({registro.produto_um})</Label>
            <Input
              id="metragem"
              type="number"
              step="0.01"
              value={metragem}
              onChange={(e) => setMetragem(e.target.value)}
              placeholder="0,00"
              className="text-2xl h-14 font-bold text-primary"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="obs">Observações</Label>
            <Input 
              id="obs"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex: Troca de rolo, portada final..."
            />
          </div>

          <Button 
            className="w-full h-14 text-lg bg-green-600 hover:bg-green-700" 
            onClick={handleFinalizar} 
            disabled={loading || !metragem}
          >
            <CheckCircle className="mr-2 h-6 w-6" /> 
            {loading ? 'Finalizando...' : 'Confirmar Finalização'}
          </Button>
        </div>
      </MobileCard>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <FinalizarAvulsoContent />
    </Suspense>
  );
}