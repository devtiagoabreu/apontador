'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { MobileCard } from '@/components/mobile/card';
import { MobileHeader } from '@/components/mobile/header';
import { MobileNav } from '@/components/mobile/nav';
import { QrCode, CalendarDays, History, Wrench, CheckCircle, Clock } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface ManutencaoAtiva {
  id: string;
  maquinaNome?: string;
  maquinaCodigo?: string;
  tipoNome?: string;
  atividadeNome?: string;
  dataInicio: string;
}

interface AgendamentoInfo {
  total: number;
  atrasados: number;
}

interface ManutencaoHistorico {
  id: string;
  maquinaNome?: string;
  tipoNome?: string;
  status: string;
  dataInicio: string;
}

export default function ManutencaoHomePage() {
  const { data: session } = useSession();
  const [emAndamento, setEmAndamento] = useState<ManutencaoAtiva[]>([]);
  const [agendamentosInfo, setAgendamentosInfo] = useState<AgendamentoInfo>({ total: 0, atrasados: 0 });
  const [historico, setHistorico] = useState<ManutencaoHistorico[]>([]);
  const [carregando, setCarregando] = useState(true);

  const nome = session?.user?.nome?.split(' ')[0] ?? '';

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    try {
      const operadorId = session?.user?.id || '';
      const [ativasRes, agendRes, histRes] = await Promise.all([
        fetch(`/api/manutencoes?status=EM_ANDAMENTO&operadorId=${operadorId}`),
        fetch('/api/agendamentos-manutencao?status=AGENDADO'),
        fetch(`/api/manutencoes?limit=5&operadorId=${operadorId}`),
      ]);

      const ativasData = await ativasRes.json();
      const agendData = await agendRes.json();
      const histData = await histRes.json();

      setEmAndamento(ativasData || []);

      // Calcular agendamentos de hoje e atrasados
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const total = (agendData || []).length;
      const atrasados = (agendData || []).filter((a: any) => {
        const prevista = new Date(a.dataPrevista);
        prevista.setHours(0, 0, 0, 0);
        return prevista < hoje;
      }).length;
      setAgendamentosInfo({ total, atrasados });

      // Filtrar apenas os últimos 5 do histórico (concluídas/canceladas)
      setHistorico((histData || []).filter((m: ManutencaoHistorico) => m.status !== 'EM_ANDAMENTO').slice(0, 5));
    } catch (error) {
      console.error('Erro ao carregar dados da home:', error);
    } finally {
      setCarregando(false);
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
        <header>
          <p className="text-sm text-gray-500">O que vamos manter hoje?</p>
          <h1 className="text-2xl font-bold text-gray-800">Olá, {nome}!</h1>
        </header>

        {/* Ação primária: Ler QR Code */}
        <section aria-label="Ação principal" className="mt-4">
          <Link href="/apontamento/leitor" className="block">
            <Button className="w-full h-16 text-lg" size="lg">
              <QrCode className="mr-2 h-6 w-6" aria-hidden="true" />
              Ler QR Code
            </Button>
          </Link>
        </section>

        {/* Atalho Agendamentos */}
        <section aria-label="Agendamentos" className="mt-4">
          <Link href="/apontamento/manutencao/agendamentos" className="block">
            <MobileCard className="hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <CalendarDays className="h-8 w-8 text-primary flex-shrink-0" aria-hidden="true" />
                <div className="flex-1">
                  <p className="font-semibold">Agendamentos</p>
                  <p className="text-sm text-gray-500">
                    {carregando ? 'Carregando...' : (
                      agendamentosInfo.total === 0
                        ? 'Nenhum agendamento pendente'
                        : `${agendamentosInfo.total} pendente${agendamentosInfo.total > 1 ? 's' : ''}${
                            agendamentosInfo.atrasados > 0
                              ? ` (${agendamentosInfo.atrasados} atrasado${agendamentosInfo.atrasados > 1 ? 's' : ''})`
                              : ''
                          }`
                    )}
                  </p>
                </div>
                {agendamentosInfo.atrasados > 0 && (
                  <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
                    <Clock className="h-3 w-3" aria-hidden="true" />
                    {agendamentosInfo.atrasados}
                  </span>
                )}
              </div>
            </MobileCard>
          </Link>
        </section>

        {/* Em andamento */}
        <section aria-label="Em andamento" className="mt-4">
          <MobileCard>
            <div className="flex items-center gap-2 mb-2">
              <Wrench className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 className="font-semibold">Em andamento</h2>
            </div>
            {carregando ? (
              <p className="text-sm text-gray-500">Carregando...</p>
            ) : emAndamento.length === 0 ? (
              <p className="text-sm text-gray-500">
                Nenhuma manutenção em andamento no momento.
              </p>
            ) : (
              <div className="space-y-2">
                {emAndamento.map((m) => (
                  <div key={m.id} className="bg-blue-50 rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{m.maquinaNome}</p>
                      <p className="text-xs text-gray-500">{m.tipoNome} · {m.atividadeNome}</p>
                    </div>
                    <Link href={`/apontamento/manutencao/finalizar?id=${m.id}`}>
                      <Button size="sm" className="bg-green-600 hover:bg-green-700">
                        <CheckCircle className="mr-1 h-4 w-4" aria-hidden="true" />
                        Finalizar
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </MobileCard>
        </section>

        {/* Histórico recente */}
        <section aria-label="Histórico recente" className="mt-4">
          <Link href="/apontamento/manutencao/historico" className="block">
            <MobileCard className="hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <History className="h-8 w-8 text-primary flex-shrink-0" aria-hidden="true" />
                <div className="flex-1">
                  <p className="font-semibold">Histórico recente</p>
                  <p className="text-sm text-gray-500">
                    {carregando ? 'Carregando...' : (
                      historico.length === 0
                        ? 'Nenhuma manutenção registrada'
                        : `${historico.length} última${historico.length > 1 ? 's' : ''}`
                    )}
                  </p>
                </div>
              </div>
            </MobileCard>
          </Link>
        </section>
      </main>

      <MobileNav />
    </div>
  );
}