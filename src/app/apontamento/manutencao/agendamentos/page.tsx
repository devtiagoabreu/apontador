'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { MobileCard } from '@/components/mobile/card';
import { MobileHeader } from '@/components/mobile/header';
import { MobileNav } from '@/components/mobile/nav';
import { ArrowLeft, CalendarDays, Play, XCircle, Clock } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { formatDate } from '@/lib/utils';

interface Agendamento {
  id: string;
  maquinaId: string;
  maquinaNome?: string;
  maquinaCodigo?: string;
  tipoNome?: string;
  atividadeNome?: string;
  periodicidade: string;
  dataPrevista: string;
  status: string;
}

export default function AgendamentosPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [cancelandoId, setCancelandoId] = useState<string | null>(null);

  useEffect(() => {
    carregarAgendamentos();
  }, []);

  async function carregarAgendamentos() {
    try {
      const response = await fetch('/api/agendamentos-manutencao?status=AGENDADO');
      const data = await response.json();
      setAgendamentos(data || []);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os agendamentos',
        variant: 'destructive',
      });
    } finally {
      setCarregando(false);
    }
  }

  function handleIniciar(agendamentoId: string) {
    router.push(`/apontamento/manutencao/iniciar?agendamento=${agendamentoId}`);
  }

  async function handleCancelar(agendamentoId: string) {
    setCancelandoId(agendamentoId);
  }

  async function confirmarCancelamento(agendamentoId: string) {
    try {
      const response = await fetch(`/api/agendamentos-manutencao/${agendamentoId}/cancelar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ observacoes: 'Cancelado pelo operador' }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao cancelar');
      }

      toast({ title: 'Sucesso', description: 'Agendamento cancelado' });
      setCancelandoId(null);
      carregarAgendamentos();
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao cancelar',
        variant: 'destructive',
      });
    }
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
          <h1 className="text-xl font-semibold">Agendamentos</h1>
        </div>

        {carregando ? (
          <p className="text-gray-500">Carregando agendamentos...</p>
        ) : agendamentos.length === 0 ? (
          <MobileCard>
            <div className="text-center py-4">
              <CalendarDays className="h-10 w-10 text-gray-300 mx-auto mb-2" aria-hidden="true" />
              <p className="text-gray-500">Nenhum agendamento pendente</p>
            </div>
          </MobileCard>
        ) : (
          <div className="space-y-3">
            {agendamentos.map((agendamento) => (
              <MobileCard key={agendamento.id}>
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{agendamento.maquinaNome}</p>
                      <p className="text-sm text-gray-600">{agendamento.maquinaCodigo}</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                      <Clock className="h-3 w-3" aria-hidden="true" />
                      {agendamento.periodicidade === 'PERIODICA' ? 'Periódica' : 'Eventual'}
                    </div>
                  </div>

                  <div className="text-sm text-gray-600">
                    <p><strong>Tipo:</strong> {agendamento.tipoNome}</p>
                    <p><strong>Atividade:</strong> {agendamento.atividadeNome}</p>
                    <p><strong>Data prevista:</strong> {formatDate(agendamento.dataPrevista)}</p>
                  </div>

                  {cancelandoId === agendamento.id ? (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setCancelandoId(null)}
                      >
                        Voltar
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1"
                        onClick={() => confirmarCancelamento(agendamento.id)}
                      >
                        Confirmar
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        className="flex-1"
                        onClick={() => handleIniciar(agendamento.id)}
                      >
                        <Play className="mr-2 h-4 w-4" aria-hidden="true" />
                        Iniciar
                      </Button>
                      <Button
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => handleCancelar(agendamento.id)}
                        aria-label={`Cancelar agendamento ${agendamento.maquinaNome}`}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </MobileCard>
            ))}
          </div>
        )}
      </main>

      <MobileNav />
    </div>
  );
}