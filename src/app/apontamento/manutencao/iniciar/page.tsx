'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { MobileCard } from '@/components/mobile/card';
import { MobileHeader } from '@/components/mobile/header';
import { MobileNav } from '@/components/mobile/nav';
import { ArrowLeft, Play, Wrench, CalendarDays } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Suspense } from 'react';
import { formatDate } from '@/lib/utils';

interface Maquina {
  id: string;
  nome: string;
  codigo: string;
  status: string;
  ativo: boolean;
}

interface TipoManutencao {
  id: string;
  codigo: string;
  nome: string;
  ativo: boolean;
}

interface AtividadeManutencao {
  id: string;
  codigo: string;
  nome: string;
  ativo: boolean;
}

interface Agendamento {
  id: string;
  maquinaId: string;
  maquinaNome?: string;
  maquinaCodigo?: string;
  tipoManutencaoId: string;
  tipoNome?: string;
  atividadeManutencaoId: string;
  atividadeNome?: string;
  periodicidade: string;
  dataPrevista: string;
  status: string;
}

function IniciarContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const machineId = searchParams.get('machine');
  const agendamentoId = searchParams.get('agendamento');
  const { data: session } = useSession();

  const [loading, setLoading] = useState(false);
  const [carregando, setCarregando] = useState(true);

  // Modo QR: máquina fixa vinda do QR
  const [maquina, setMaquina] = useState<Maquina | null>(null);

  // Catálogos
  const [tipos, setTipos] = useState<TipoManutencao[]>([]);
  const [atividades, setAtividades] = useState<AtividadeManutencao[]>([]);

  // Modo agendamento: dados pré-preenchidos
  const [agendamento, setAgendamento] = useState<Agendamento | null>(null);

  // Campos do formulário
  const [tipoId, setTipoId] = useState('');
  const [atividadeId, setAtividadeId] = useState('');
  const [periodicidade, setPeriodicidade] = useState<'EVENTUAL' | 'PERIODICA'>('EVENTUAL');

  const ehPorAgendamento = !!agendamentoId;

  useEffect(() => {
    carregarDados();
  }, [machineId, agendamentoId]);

  async function carregarDados() {
    try {
      // Sempre carregar catálogos
      const [tiposRes, atividadesRes] = await Promise.all([
        fetch('/api/tipos-manutencao'),
        fetch('/api/atividades-manutencao'),
      ]);
      const tiposData = await tiposRes.json();
      const atividadesData = await atividadesRes.json();

      setTipos((tiposData || []).filter((t: TipoManutencao) => t.ativo));
      setAtividades((atividadesData || []).filter((a: AtividadeManutencao) => a.ativo));

      if (agendamentoId) {
        // Modo agendamento: buscar agendamento (pré-preenchido e somente leitura)
        const agRes = await fetch(`/api/agendamentos-manutencao/${agendamentoId}`);
        const agData = await agRes.json();
        if (!agRes.ok) {
          toast({ title: 'Erro', description: agData.error || 'Agendamento não encontrado', variant: 'destructive' });
          router.push('/apontamento/manutencao/agendamentos');
          return;
        }
        setAgendamento(agData);
        setTipoId(agData.tipoManutencaoId);
        setAtividadeId(agData.atividadeManutencaoId);
        setPeriodicidade(agData.periodicidade === 'PERIODICA' ? 'PERIODICA' : 'EVENTUAL');
      } else if (machineId) {
        // Modo QR: buscar máquina
        const maqRes = await fetch(`/api/maquinas/${machineId}`);
        const maqData = await maqRes.json();
        if (!maqRes.ok) {
          toast({ title: 'Erro', description: maqData.error || 'Máquina não encontrada', variant: 'destructive' });
          router.push('/apontamento/manutencao');
          return;
        }
        setMaquina(maqData);
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados',
        variant: 'destructive',
      });
    } finally {
      setCarregando(false);
    }
  }

  async function handleIniciar() {
    if (ehPorAgendamento) {
      // Iniciar a partir de agendamento (dados pré-preenchidos)
      setLoading(true);
      try {
        const response = await fetch(`/api/agendamentos-manutencao/${agendamentoId}/iniciar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Erro ao iniciar');
        }

        toast({ title: 'Sucesso', description: 'Manutenção iniciada com sucesso' });
        router.push('/apontamento/manutencao');
      } catch (error) {
        toast({
          title: 'Erro',
          description: error instanceof Error ? error.message : 'Erro ao iniciar',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
      return;
    }

    // Modo QR: validar campos
    if (!tipoId || !atividadeId) {
      toast({ title: 'Erro', description: 'Selecione o tipo e a atividade', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/manutencoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maquinaId: machineId,
          tipoManutencaoId: tipoId,
          atividadeManutencaoId: atividadeId,
          periodicidade,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao iniciar');
      }

      toast({ title: 'Sucesso', description: 'Manutenção iniciada com sucesso' });
      router.push('/apontamento/manutencao');
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
          <Link href={ehPorAgendamento ? '/apontamento/manutencao/agendamentos' : '/apontamento/manutencao'}>
            <Button variant="ghost" size="icon" className="h-10 w-10" aria-label="Voltar">
              <ArrowLeft className="h-6 w-6" />
            </Button>
          </Link>
          <h1 className="text-xl font-semibold">{ehPorAgendamento ? 'Iniciar por Agendamento' : 'Iniciar Manutenção'}</h1>
        </div>

        <MobileCard>
          <div className="space-y-4">
            {/* Máquina */}
            <div className="bg-blue-50 p-3 rounded-lg space-y-1">
              <p className="text-xs text-gray-500 uppercase font-medium">Máquina</p>
              <p className="font-semibold text-lg">
                {ehPorAgendamento ? agendamento?.maquinaNome : maquina?.nome}
              </p>
              <p className="text-sm text-gray-600">
                {ehPorAgendamento ? agendamento?.maquinaCodigo : maquina?.codigo}
                {!ehPorAgendamento && maquina?.status === 'EM_MANUTENCAO' && (
                  <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                    Em manutenção
                  </span>
                )}
              </p>
            </div>

            {ehPorAgendamento && (
              <div className="bg-purple-50 p-3 rounded-lg space-y-1">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-purple-600" aria-hidden="true" />
                  <p className="text-sm font-medium">Data prevista</p>
                </div>
                <p className="text-sm text-gray-600">{formatDate(agendamento?.dataPrevista || '')}</p>
              </div>
            )}

            {ehPorAgendamento ? (
              <>
                {/* Dados somente leitura do agendamento */}
                <div className="space-y-2">
                  <Label htmlFor="tipo-readonly">Tipo de manutenção</Label>
                  <p id="tipo-readonly" className="text-sm font-medium bg-gray-50 rounded-lg p-3 border border-gray-200">
                    {agendamento?.tipoNome}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="atividade-readonly">Atividade</Label>
                  <p id="atividade-readonly" className="text-sm font-medium bg-gray-50 rounded-lg p-3 border border-gray-200">
                    {agendamento?.atividadeNome}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="periodicidade-readonly">Periodicidade</Label>
                  <p id="periodicidade-readonly" className="text-sm font-medium bg-gray-50 rounded-lg p-3 border border-gray-200">
                    {agendamento?.periodicidade === 'PERIODICA' ? 'Periódica' : 'Eventual'}
                  </p>
                </div>
                <p className="text-xs text-gray-500">
                  Os dados vêm do agendamento. Para ajustar, cancele e crie manualmente.
                </p>
              </>
            ) : (
              <>
                {/* Tipo */}
                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo de manutenção</Label>
                  <Select value={tipoId} onValueChange={setTipoId}>
                    <SelectTrigger id="tipo">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {tipos.map((tipo) => (
                        <SelectItem key={tipo.id} value={tipo.id}>
                          {tipo.codigo} - {tipo.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Atividade */}
                <div className="space-y-2">
                  <Label htmlFor="atividade">Atividade</Label>
                  <Select value={atividadeId} onValueChange={setAtividadeId}>
                    <SelectTrigger id="atividade">
                      <SelectValue placeholder="Selecione a atividade" />
                    </SelectTrigger>
                    <SelectContent>
                      {atividades.map((atividade) => (
                        <SelectItem key={atividade.id} value={atividade.id}>
                          {atividade.codigo} - {atividade.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Periodicidade */}
                <div className="space-y-2">
                  <Label>Periodicidade</Label>
                  <RadioGroup value={periodicidade} onValueChange={(value) => setPeriodicidade(value as 'EVENTUAL' | 'PERIODICA')}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="EVENTUAL" id="eventual" />
                      <Label htmlFor="eventual">Eventual</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="PERIODICA" id="periodica" />
                      <Label htmlFor="periodica">Periódica</Label>
                    </div>
                  </RadioGroup>
                </div>
              </>
            )}

            {/* Botão */}
            <Button
              className="w-full h-14 text-lg"
              onClick={handleIniciar}
              disabled={loading}
            >
              <Play className="mr-2 h-5 w-5" aria-hidden="true" />
              {loading ? 'Iniciando...' : 'Iniciar Manutenção'}
            </Button>
          </div>
        </MobileCard>
      </main>

      <MobileNav />
    </div>
  );
}

export default function IniciarManutencaoPage() {
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
      <IniciarContent />
    </Suspense>
  );
}