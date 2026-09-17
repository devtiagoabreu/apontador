// src/app/dashboard/manutencao/historico/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { toast } from '@/components/ui/use-toast';
import { Eye, RefreshCw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { formatDate } from '@/lib/utils';

interface Manutencao {
  id: string;
  maquinaId: string;
  maquinaNome?: string;
  maquinaCodigo?: string;
  tipoManutencaoId: string;
  tipoNome?: string;
  atividadeManutencaoId: string;
  atividadeNome?: string;
  periodicidade: string;
  dataInicio: string;
  dataFim?: string;
  observacoes?: string;
  status: string;
  operadorInicioId: string;
  operadorInicioNome?: string;
  agendamentoId?: string;
}

function statusBadge(status: string) {
  const config: Record<string, string> = {
    EM_ANDAMENTO: 'bg-yellow-100 text-yellow-800',
    CONCLUIDA: 'bg-green-100 text-green-800',
    CANCELADA: 'bg-red-100 text-red-800',
  };
  const labels: Record<string, string> = {
    EM_ANDAMENTO: 'Em Andamento',
    CONCLUIDA: 'Concluída',
    CANCELADA: 'Cancelada',
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config[status] || 'bg-gray-100 text-gray-800'}`}>
      {labels[status] || status}
    </span>
  );
}

export default function HistoricoManutencaoPage() {
  const [manutencoes, setManutencoes] = useState<Manutencao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [detalhe, setDetalhe] = useState<Manutencao | null>(null);
  const [detalheOpen, setDetalheOpen] = useState(false);

  const carregarHistorico = useCallback(async () => {
    try {
      const response = await fetch('/api/manutencoes?limit=200');
      const data = await response.json();
      setManutencoes(data || []);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o histórico',
        variant: 'destructive',
      });
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarHistorico();
  }, [carregarHistorico]);

  const columns = [
    { key: 'maquinaNome' as const, title: 'Máquina' },
    { key: 'tipoNome' as const, title: 'Tipo' },
    { key: 'atividadeNome' as const, title: 'Atividade' },
    { key: 'operadorInicioNome' as const, title: 'Operador' },
    {
      key: 'dataInicio' as const,
      title: 'Início',
      format: (value: string) => formatDate(value),
    },
    {
      key: 'dataFim' as const,
      title: 'Fim',
      format: (value?: string) => (value ? formatDate(value) : '—'),
    },
    {
      key: 'status' as const,
      title: 'Status',
      format: (value: string) => statusBadge(value),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Histórico de Manutenções</h1>
        <Button variant="outline" onClick={carregarHistorico}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Atualizar
        </Button>
      </div>

      <DataTable
        data={manutencoes}
        columns={columns}
        onRowClick={(item) => {
          setDetalhe(item);
          setDetalheOpen(true);
        }}
        extraActions={(item) => (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Ver detalhes"
            title="Ver detalhes"
            onClick={() => {
              setDetalhe(item);
              setDetalheOpen(true);
            }}
            className="h-8 w-8"
          >
            <Eye className="h-4 w-4" />
          </Button>
        )}
      />

      {/* Dialog detalhes */}
      <Dialog open={detalheOpen} onOpenChange={setDetalheOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes da Manutenção</DialogTitle>
            <DialogDescription>
              {detalhe?.maquinaNome} ({detalhe?.maquinaCodigo})
            </DialogDescription>
          </DialogHeader>
          {detalhe && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Tipo:</span>
                <span className="font-medium">{detalhe.tipoNome}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Atividade:</span>
                <span className="font-medium">{detalhe.atividadeNome}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Periodicidade:</span>
                <span className="font-medium">
                  {detalhe.periodicidade === 'PERIODICA' ? 'Periódica' : 'Eventual'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Início:</span>
                <span className="font-medium">{formatDate(detalhe.dataInicio)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Fim:</span>
                <span className="font-medium">{detalhe.dataFim ? formatDate(detalhe.dataFim) : '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Operador:</span>
                <span className="font-medium">{detalhe.operadorInicioNome}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Status:</span>
                {statusBadge(detalhe.status)}
              </div>
              {detalhe.observacoes && (
                <div>
                  <p className="text-gray-500">Observações:</p>
                  <p className="font-medium">{detalhe.observacoes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}