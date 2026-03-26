// src/app/apontamento/avulso/iniciar/page.tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { MobileCard } from '@/components/mobile/card';
import { ArrowLeft, Play, AlertCircle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchProductByCode } from '../components/search-product';

function IniciarAvulsoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const machineId = searchParams.get('machine');
  
  const [loading, setLoading] = useState(false);
  const [carregandoDados, setCarregandoDados] = useState(true);
  const [maquina, setMaquina] = useState<any>(null);
  const [estagios, setEstagios] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [estagioId, setEstagioId] = useState<string>('');

  useEffect(() => {
    if (machineId) carregarDados();
  }, [machineId]);

  async function carregarDados() {
    try {
      const [maquinaRes, estagiosRes] = await Promise.all([
        fetch(`/api/maquinas/${machineId}`),
        fetch('/api/estagios?ativos=true'),
      ]);
      const maquinaData = await maquinaRes.json();
      const estagiosData = await estagiosRes.json();

      setMaquina(maquinaData);
      setEstagios(estagiosData);
    } catch (error) {
      toast({ title: 'Erro', description: 'Erro ao carregar dados iniciais', variant: 'destructive' });
    } finally {
      setCarregandoDados(false);
    }
  }

  async function handleIniciar() {
    if (!selectedProduct || !estagioId || !machineId) {
      toast({ title: 'Erro', description: 'Preencha o produto e estágio', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/producoes-avulsas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maquinaId: machineId,
          produtoId: selectedProduct.id,
          estagioId,
        }),
      });

      if (!response.ok) throw new Error('Falha ao iniciar produção');

      toast({ title: 'Sucesso', description: 'Iniciado com sucesso (Avulso)' });
      router.push(`/apontamento/machine/${machineId}`);
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível iniciar', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  if (carregandoDados) return <div className="p-8 text-center">Carregando...</div>;

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href={`/apontamento/machine/${machineId}`}>
          <Button variant="ghost" size="icon"><ArrowLeft className="h-6 w-6" /></Button>
        </Link>
        <h1 className="text-xl font-semibold">Nova Produção Avulsa</h1>
      </div>

      <MobileCard>
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-blue-600 bg-blue-50 p-3 rounded-lg text-sm">
            <AlertCircle className="h-5 w-5" /> Início de processo sem Ordem de Produção (ERP).
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Máquina</p>
              <p className="font-medium">{maquina?.nome} ({maquina?.codigo})</p>
            </div>

            <div className="space-y-2">
              <Label>Produto (pelo código K... ou W...)</Label>
              <SearchProductByCode onSelect={setSelectedProduct} />
              {selectedProduct && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm">
                  <p className="font-bold text-green-700">{selectedProduct.codigo}</p>
                  <p className="text-green-600">{selectedProduct.nome}</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Estágio do Processo</Label>
              <Select value={estagioId} onValueChange={setEstagioId}>
                <SelectTrigger><SelectValue placeholder="Selecione o estágio" /></SelectTrigger>
                <SelectContent>
                  {estagios.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            className="w-full h-12 text-lg" 
            onClick={handleIniciar} 
            disabled={loading || !selectedProduct || !estagioId}
          >
            <Play className="mr-2 h-5 w-5" /> {loading ? 'Iniciando...' : 'Confirmar Início'}
          </Button>
        </div>
      </MobileCard>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <IniciarAvulsoContent />
    </Suspense>
  );
}