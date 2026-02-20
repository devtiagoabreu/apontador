'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { toast } from '@/components/ui/use-toast';
import { Download, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDate, formatNumber } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface OP {
  op: number;
  produto: string;
  // ... outros campos
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function OpsPage() {
  const [ops, setOps] = useState<OP[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  });
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selectedOp, setSelectedOp] = useState<OP | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    carregarOps(1);
  }, []);

  async function carregarOps(page: number = pagination.page) {
    setLoading(true);
    try {
      const response = await fetch(`/api/ops?page=${page}&limit=${pagination.limit}`);
      const result = await response.json();
      
      setOps(result.data);
      setPagination(result.pagination);
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

      // Voltar para primeira página após importar
      await carregarOps(1);
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
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => carregarOps(1)} 
            disabled={loading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
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
      </div>

      {/* Info e Paginação */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Mostrando {ops.length} de {pagination.total} OPs
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => carregarOps(pagination.page - 1)}
            disabled={pagination.page <= 1 || loading}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <span className="text-sm">
            Página {pagination.page} de {pagination.totalPages}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => carregarOps(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages || loading}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <DataTable
        data={ops}
        columns={columns}
        onRowClick={(op) => {
          setSelectedOp(op);
          setDetailsOpen(true);
        }}
      />

      {/* Modal de detalhes (igual antes) */}
    </div>
  );
}