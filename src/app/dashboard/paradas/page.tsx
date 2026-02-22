'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { toast } from '@/components/ui/use-toast';
import { Plus, Play } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';

interface Parada {
  id: string;
  maquinaId: string;
  opId?: number;
  motivoParadaId: string;
  observacoes?: string;
  inicioParada: string;
  fimParada?: string;
  maquina?: {
    nome: string;
    codigo: string;
  };
  motivo?: {
    descricao: string;
  };
  op?: {
    op: number;
    produto: string;
  };
}

const columns = [
  { 
    key: 'maquina' as const, 
    title: 'Máquina',
    format: (value: any) => value?.nome || '-'
  },
  { 
    key: 'motivo' as const, 
    title: 'Motivo',
    format: (value: any) => value?.descricao || '-'
  },
  { 
    key: 'inicioParada' as const, 
    title: 'Início',
    format: (value: string) => formatDate(value)
  },
  { 
    key: 'op' as const, 
    title: 'OP Vinculada',
    format: (value: any) => value ? `OP ${value.op}` : '-'
  },
  { 
    key: 'observacoes' as const, 
    title: 'Observações',
    format: (value: string) => value || '-'
  },
];

export default function ParadasPage() {
  const [paradas, setParadas] = useState<Parada[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    carregarParadas();
  }, []);

  async function carregarParadas() {
    setLoading(true);
    try {
      const response = await fetch('/api/paradas?ativas=true');
      const data = await response.json();
      setParadas(data);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as paradas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function finalizarParada(id: string) {
    try {
      const response = await fetch(`/api/paradas/${id}/finalizar`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Erro ao finalizar');

      toast({
        title: 'Sucesso',
        description: 'Parada finalizada com sucesso',
      });

      carregarParadas();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao finalizar parada',
        variant: 'destructive',
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Paradas de Máquina</h1>
        <Link href="/dashboard/paradas/nova">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nova Parada
          </Button>
        </Link>
      </div>

      <DataTable
        data={paradas}
        columns={columns}
        onRowClick={(parada) => {
          // Abrir detalhes
        }}
        extraActions={(parada) => (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => finalizarParada(parada.id)}
            className="h-8 w-8 text-green-600"
            title="Finalizar Parada"
          >
            <Play className="h-4 w-4" />
          </Button>
        )}
      />
    </div>
  );
}