'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { MobileCard } from '@/components/mobile/card';
import { MobileHeader } from '@/components/mobile/header';
import { MobileNav } from '@/components/mobile/nav';
import { ArrowLeft, History, CheckCircle, XCircle, Clock } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { formatDate } from '@/lib/utils';

interface ManutencaoHistorico {
  id: string;
  maquinaNome?: string;
  maquinaCodigo?: string;
  tipoNome?: string;
  atividadeNome?: string;
  periodicidade: string;
  dataInicio: string;
  dataFim?: string;
  status: string;
  observacoes?: string;
}

export default function HistoricoManutencaoPage() {
  const { data: session } = useSession();
  const [manutencoes, setManutencoes] = useState<ManutencaoHistorico[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    carregarHistorico();
  }, []);

  async function carregarHistorico() {
    try {
      // Histórico do operador logado (concluídas e canceladas)
      const operadorId = session?.user?.id || '';
      const response = await fetch(`/api/manutencoes?limit=50&operadorId=${operadorId}`);
      const data = await response.json();
      // Filtrar apenas as que não estão em andamento (histórico)
      setManutencoes((data || []).filter((m: ManutencaoHistorico) => m.status !== 'EM_ANDAMENTO'));
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o histórico',
        variant: 'destructive',
      });
    } finally {
      setCarregando(false);
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'CONCLUIDA':
        return (
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
            <CheckCircle className="h-3 w-3" aria-hidden="true" />
            Concluída
          </span>
        );
      case 'CANCELADA':
        return (
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
            <XCircle className="h-3 w-3" aria-hidden="true" />
            Cancelada
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-medium">
            <Clock className="h-3 w-3" aria-hidden="true" />
            {status}
          </span>
        );
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
          <h1 className="text-xl font-semibold">Histórico de Manutenções</h1>
        </div>

        {carregando ? (
          <p className="text-gray-500">Carregando histórico...</p>
        ) : manutencoes.length === 0 ? (
          <MobileCard>
            <div className="text-center py-4">
              <History className="h-10 w-10 text-gray-300 mx-auto mb-2" aria-hidden="true" />
              <p className="text-gray-500">Nenhuma manutenção registrada</p>
            </div>
          </MobileCard>
        ) : (
          <div className="space-y-3">
            {manutencoes.map((manutencao) => (
              <MobileCard key={manutencao.id}>
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{manutencao.maquinaNome}</p>
                      <p className="text-sm text-gray-600">{manutencao.maquinaCodigo}</p>
                    </div>
                    {getStatusBadge(manutencao.status)}
                  </div>

                  <div className="text-sm text-gray-600">
                    <p><strong>Tipo:</strong> {manutencao.tipoNome}</p>
                    <p><strong>Atividade:</strong> {manutencao.atividadeNome}</p>
                    <p><strong>Início:</strong> {formatDate(manutencao.dataInicio)}</p>
                    {manutencao.dataFim && (
                      <p><strong>Fim:</strong> {formatDate(manutencao.dataFim)}</p>
                    )}
                    {manutencao.observacoes && (
                      <p className="mt-1 italic text-gray-500">&quot;{manutencao.observacoes}&quot;</p>
                    )}
                  </div>
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