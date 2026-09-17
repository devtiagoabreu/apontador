'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { MobileCard } from '@/components/mobile/card';
import { MobileHeader } from '@/components/mobile/header';
import { MobileNav } from '@/components/mobile/nav';
import { ArrowLeft, CheckCircle, CalendarDays } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Suspense } from 'react';
import { formatDate } from '@/lib/utils';
import { sugerirDataProximaManutencao } from '@/lib/manutencao';

interface Manutencao {
  id: string;
  maquinaNome?: string;
  maquinaCodigo?: string;
  tipoNome?: string;
  atividadeNome?: string;
  periodicidade: string;
  dataInicio: string;
  observacoes?: string;
  status: string;
  tipoIntervaloEmDias?: number | null;
}

function FinalizarContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const manutencaoId = searchParams.get('id');
  const { data: session } = useSession();

  const [loading, setLoading] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [manutencao, setManutencao] = useState<Manutencao | null>(null);
  const [observacoes, setObservacoes] = useState('');
  const [desejaAgendar, setDesejaAgendar] = useState<'sim' | 'nao'>('nao');
  const [dataPrevista, setDataPrevista] = useState('');

  useEffect(() => {
    if (manutencaoId) {
      carregarManutencao();
    }
  }, [manutencaoId]);

  async function carregarManutencao() {
    try {
      const response = await fetch(`/api/manutencoes/${manutencaoId}`);
      const data = await response.json();
      if (!response.ok) {
        toast({ title: 'Erro', description: data.error || 'Manutenção não encontrada', variant: 'destructive' });
        router.push('/apontamento/manutencao');
        return;
      }
      setManutencao(data);

      // Sugerir data prevista: intervalo do tipo (se definido), senão +7 dias
      const sugestao = sugerirDataProximaManutencao(new Date(), data.tipoIntervaloEmDias);
      setDataPrevista(
        sugestao ??
          (() => {
            const padrao = new Date();
            padrao.setDate(padrao.getDate() + 7);
            return padrao.toISOString().split('T')[0];
          })()
      );
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar a manutenção',
        variant: 'destructive',
      });
    } finally {
      setCarregando(false);
    }
  }

  async function handleFinalizar() {
    setLoading(true);
    try {
      const body: any = {};
      if (observacoes.trim()) {
        body.observacoes = observacoes.trim();
      }

      if (desejaAgendar === 'sim') {
        if (!dataPrevista) {
          toast({ title: 'Erro', description: 'Informe a data da próxima manutenção', variant: 'destructive' });
          setLoading(false);
          return;
        }
        // Validar que a data não é no passado
        const dataSel = new Date(dataPrevista);
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        if (dataSel < hoje) {
          toast({ title: 'Erro', description: 'A data prevista não pode ser no passado', variant: 'destructive' });
          setLoading(false);
          return;
        }
        body.agendar = { sim: true, dataPrevista: dataSel.toISOString() };
      } else {
        body.agendar = { sim: false };
      }

      const response = await fetch(`/api/manutencoes/${manutencaoId}/finalizar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao finalizar');
      }

      toast({ title: 'Sucesso', description: 'Manutenção finalizada com sucesso' });
      router.push('/apontamento/manutencao');
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
          <Link href="/apontamento/manutencao">
            <Button variant="ghost" size="icon" className="h-10 w-10" aria-label="Voltar">
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
      <MobileHeader
        user={{
          nome: session?.user?.nome || '',
          matricula: session?.user?.matricula || '',
          nivel: session?.user?.nivel,
        }}
      />

      <main className="p-4 pb-20">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/apontamento/manutencao">
            <Button variant="ghost" size="icon" className="h-10 w-10" aria-label="Voltar">
              <ArrowLeft className="h-6 w-6" />
            </Button>
          </Link>
          <h1 className="text-xl font-semibold">Finalizar Manutenção</h1>
        </div>

        <MobileCard>
          <div className="space-y-4">
            {/* Informações da manutenção */}
            <div className="bg-blue-50 p-3 rounded-lg space-y-1">
              <p className="text-xs text-gray-500 uppercase font-medium">Máquina</p>
              <p className="font-semibold text-lg">{manutencao?.maquinaNome}</p>
              <p className="text-sm text-gray-600">{manutencao?.maquinaCodigo}</p>
            </div>

            <div className="bg-purple-50 p-3 rounded-lg space-y-1">
              <p className="text-xs text-gray-500 uppercase font-medium">Detalhes</p>
              <p className="text-sm font-medium">Tipo: {manutencao?.tipoNome}</p>
              <p className="text-sm font-medium">Atividade: {manutencao?.atividadeNome}</p>
              <p className="text-sm font-medium">Periodicidade: {manutencao?.periodicidade === 'PERIODICA' ? 'Periódica' : 'Eventual'}</p>
            </div>

            <div className="bg-green-50 p-3 rounded-lg space-y-1">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-green-600" aria-hidden="true" />
                <p className="text-sm font-medium">Início</p>
              </div>
              <p className="text-sm text-gray-600">{formatDate(manutencao?.dataInicio || '')}</p>
            </div>

            {/* Observações */}
            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Observações sobre a manutenção (opcional)"
                rows={3}
              />
            </div>

            {/* Agendar próxima manutenção */}
            <div className="space-y-2">
              <Label>Deseja agendar a próxima manutenção?</Label>
              <RadioGroup
                value={desejaAgendar}
                onValueChange={(value) => setDesejaAgendar(value as 'sim' | 'nao')}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="sim" id="sim" />
                  <Label htmlFor="sim">Sim</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="nao" id="nao" />
                  <Label htmlFor="nao">Não</Label>
                </div>
              </RadioGroup>
            </div>

            {desejaAgendar === 'sim' && (
              <div className="space-y-2">
                <Label htmlFor="dataPrevista">Data prevista da próxima manutenção</Label>
                <Input
                  id="dataPrevista"
                  type="date"
                  value={dataPrevista}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setDataPrevista(e.target.value)}
                />
              </div>
            )}

            {/* Botão */}
            <Button
              className="w-full h-14 text-lg bg-green-600 hover:bg-green-700"
              onClick={handleFinalizar}
              disabled={loading}
            >
              <CheckCircle className="mr-2 h-5 w-5" aria-hidden="true" />
              {loading ? 'Finalizando...' : 'Finalizar Manutenção'}
            </Button>
          </div>
        </MobileCard>
      </main>

      <MobileNav />
    </div>
  );
}

export default function FinalizarManutencaoPage() {
  return (
    <Suspense fallback={
      <div className="p-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-10 w-10" aria-label="Voltar">
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