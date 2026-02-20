'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { toast } from '@/components/ui/use-toast';
import { Download, RefreshCw } from 'lucide-react';
import { formatDate, formatNumber } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface OP {
  op: number; // Esta é a chave primária, não 'id'
  produto: string;
  depositoFinal: string | null;
  pecasVinculadas: string | null;
  qtdeProgramado: number | null;
  qtdeCarregado: number | null;
  qtdeProduzida: number | null;
  calculoQuebra: number | null;
  obs: string | null;
  um: string | null;
  narrativa: string | null;
  nivel: string | null;
  grupo: string | null;
  sub: string | null;
  item: string | null;
  codEstagioAtual: string;
  estagioAtual: string;
  codMaquinaAtual: string;
  maquinaAtual: string;
  status: string;
  dataImportacao: string;
  dataUltimoApontamento: string | null;
}

// Adaptar as colunas para usar 'op' como identificador
const columns = [
  { key: 'op' as const, title: 'OP' },
  { key: 'produto' as const, title: 'Produto' },
  { 
    key: 'qtdeProgramado' as const, 
    title: 'Programado',
    format: (value: number) => value ? formatNumber(value) : '-'
  },
  { 
    key: 'qtdeCarregado' as const, 
    title: 'Carregado',
    format: (value: number) => value ? formatNumber(value) : '-'
  },
  { 
    key: 'qtdeProduzida' as const, 
    title: 'Produzido',
    format: (value: number) => value ? formatNumber(value) : '-'
  },
  {
    key: 'estagioAtual' as const,
    title: 'Estágio',
  },
  {
    key: 'maquinaAtual' as const,
    title: 'Máquina',
  },
  {
    key: 'status' as const,
    title: 'Status',
    format: (value: string) => {
      const colors = {
        'ABERTA': 'bg-blue-100 text-blue-800',
        'EM_ANDAMENTO': 'bg-yellow-100 text-yellow-800',
        'FINALIZADA': 'bg-green-100 text-green-800',
        'CANCELADA': 'bg-red-100 text-red-800',
      };
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[value as keyof typeof colors] || 'bg-gray-100'}`}>
          {value.replace('_', ' ')}
        </span>
      );
    }
  },
  {
    key: 'dataImportacao' as const,
    title: 'Importação',
    format: (value: string) => formatDate(value)
  },
];

export default function OpsPage() {
  const [ops, setOps] = useState<OP[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selectedOp, setSelectedOp] = useState<OP | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    carregarOps();
  }, []);

  async function carregarOps() {
    setLoading(true);
    try {
      const response = await fetch('/api/ops');
      const data = await response.json();
      setOps(data);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as OPs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function importarOps() {
    setImporting(true);
    try {
      const response = await fetch('/api/systextil/importar', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao importar');
      }

      toast({
        title: 'Sucesso',
        description: `${data.importadas} OPs importadas com sucesso!`,
      });

      carregarOps();
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao importar OPs',
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Ordens de Produção</h1>
        <Button 
          onClick={importarOps} 
          disabled={importing}
        >
          {importing ? (
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          {importing ? 'Importando...' : 'Importar do Systêxtil'}
        </Button>
      </div>

      {/* Usar o DataTable com a opção de não ter ações de editar/excluir */}
      <DataTable
        data={ops}
        columns={columns}
        onRowClick={(op) => {
          setSelectedOp(op);
          setDetailsOpen(true);
        }}
      />

      {/* Modal de detalhes da OP */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da OP {selectedOp?.op}</DialogTitle>
          </DialogHeader>
          
          {selectedOp && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Produto</p>
                  <p className="text-sm">{selectedOp.produto}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Narrativa</p>
                  <p className="text-sm">{selectedOp.narrativa || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Quantidade Programada</p>
                  <p className="text-sm">{formatNumber(selectedOp.qtdeProgramado || 0)} {selectedOp.um}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Quantidade Produzida</p>
                  <p className="text-sm">{formatNumber(selectedOp.qtdeProduzida || 0)} {selectedOp.um}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Estágio Atual</p>
                  <p className="text-sm">{selectedOp.estagioAtual}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Máquina Atual</p>
                  <p className="text-sm">{selectedOp.maquinaAtual}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Status</p>
                  <p className="text-sm">{selectedOp.status}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Importada em</p>
                  <p className="text-sm">{formatDate(selectedOp.dataImportacao)}</p>
                </div>
              </div>

              {selectedOp.obs && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Observações</p>
                  <p className="text-sm">{selectedOp.obs}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}