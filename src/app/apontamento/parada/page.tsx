'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MobileCard } from '@/components/mobile/card';
import { MobileHeader } from '@/components/mobile/header';
import { MobileNav } from '@/components/mobile/nav';
import { ArrowLeft, Pause } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Suspense } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface MotivoParada {
  id: string;
  codigo: string;
  descricao: string;
}

function ParadaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const maquinaId = searchParams.get('maquinaId');
  const opId = searchParams.get('opId');
  
  const [loading, setLoading] = useState(false);
  const [motivos, setMotivos] = useState<MotivoParada[]>([]);
  const [motivoSelecionado, setMotivoSelecionado] = useState<string>('');
  const [observacoes, setObservacoes] = useState<string>('');
  const [maquina, setMaquina] = useState<any>(null);
  const [op, setOp] = useState<any>(null);
  const [carregandoDados, setCarregandoDados] = useState(true);

  useEffect(() => {
    carregarDados();
  }, [maquinaId, opId]);

  async function carregarDados() {
    try {
      const [motivosRes, maquinaRes, opRes] = await Promise.all([
        fetch('/api/motivos-parada'),
        maquinaId ? fetch(`/api/maquinas/${maquinaId}`) : Promise.resolve(null),
        opId ? fetch(`/api/ops/${opId}`) : Promise.resolve(null),
      ]);

      const motivosData = await motivosRes.json();
      setMotivos(motivosData);

      if (maquinaRes && maquinaRes.ok) {
        const maquinaData = await maquinaRes.json();
        setMaquina(maquinaData);
      }

      if (opRes && opRes.ok) {
        const opData = await opRes.json();
        setOp(opData);
      }
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

  async function handleRegistrarParada() {
    if (!motivoSelecionado) {
      toast({
        title: 'Erro',
        description: 'Selecione um motivo para a parada',
        variant: 'destructive',
      });
      return;
    }

    if (!maquinaId) {
      toast({
        title: 'Erro',
        description: 'Máquina não identificada',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const dados: any = {
        maquinaId,
        motivoParadaId: motivoSelecionado,
        dataInicio: new Date().toISOString(),
        observacoes: observacoes || null,
      };

      if (opId) {
        dados.opId = parseInt(opId);
      }

      const response = await fetch('/api/paradas-maquina', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(dados),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao registrar parada');
      }

      toast({
        title: 'Sucesso',
        description: 'Parada registrada com sucesso',
      });

      router.push(`/apontamento/machine/${maquinaId}`);
      
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

  if (carregandoDados) {
    return (
      <div className="min-h-screen bg-gray-50">
        <MobileHeader user={{ nome: 'Operador', matricula: '123' }} title="Registrar Parada" showMenu={false} />
        <main className="p-4">
          <div className="flex items-center gap-3">
            <Link href={maquinaId ? `/apontamento/machine/${maquinaId}` : '/apontamento'}>
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <ArrowLeft className="h-6 w-6" />
              </Button>
            </Link>
            <h1 className="text-xl font-semibold">Carregando...</h1>
          </div>
        </main>
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <MobileHeader user={{ nome: 'Operador', matricula: '123' }} title="Registrar Parada" showMenu={false} />
      
      <main className="p-4 pb-20">
        <div className="flex items-center gap-3 mb-4">
          <Link href={maquinaId ? `/apontamento/machine/${maquinaId}` : '/apontamento'}>
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <ArrowLeft className="h-6 w-6" />
            </Button>
          </Link>
          <h1 className="text-xl font-semibold">Registrar Parada</h1>
        </div>

        <MobileCard>
          <div className="space-y-4">
            {/* Informações da máquina */}
            {maquina && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm font-medium">Máquina</p>
                <p className="text-sm">{maquina.nome}</p>
                <p className="text-xs text-gray-500">Código: {maquina.codigo}</p>
              </div>
            )}

            {/* Informações da OP (se veio de uma produção) */}
            {op && (
              <div className="bg-yellow-50 p-3 rounded-lg">
                <p className="text-sm font-medium">OP em produção</p>
                <p className="text-sm">OP {op.op}</p>
                <p className="text-xs text-gray-500">{op.produto}</p>
              </div>
            )}

            {/* Seleção de motivo */}
            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo da Parada *</Label>
              <Select value={motivoSelecionado} onValueChange={setMotivoSelecionado}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um motivo" />
                </SelectTrigger>
                <SelectContent>
                  {motivos.map((motivo) => (
                    <SelectItem key={motivo.id} value={motivo.id}>
                      {motivo.codigo} - {motivo.descricao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Observações */}
            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações (opcional)</Label>
              <Textarea
                id="observacoes"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Descreva o motivo da parada..."
                rows={3}
              />
            </div>

            {/* Botão */}
            <Button 
              className="w-full bg-yellow-600 hover:bg-yellow-700" 
              onClick={handleRegistrarParada}
              disabled={loading}
            >
              <Pause className="mr-2 h-4 w-4" />
              {loading ? 'Registrando...' : 'Registrar Parada'}
            </Button>
          </div>
        </MobileCard>
      </main>
      
      <MobileNav />
    </div>
  );
}

export default function ParadaPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50">
        <MobileHeader user={{ nome: 'Operador', matricula: '123' }} title="Registrar Parada" showMenu={false} />
        <main className="p-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <ArrowLeft className="h-6 w-6" />
            </Button>
            <h1 className="text-xl font-semibold">Carregando...</h1>
          </div>
        </main>
        <MobileNav />
      </div>
    }>
      <ParadaContent />
    </Suspense>
  );
}