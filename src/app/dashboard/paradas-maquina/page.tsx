'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { FormModal } from '@/components/ui/form-modal';
import { toast } from '@/components/ui/use-toast';
import { 
  Plus, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight,
  Play
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Parada {
  id: string;
  maquinaId: string;
  operadorId: string;
  motivoParadaId: string;
  observacoes: string | null;
  dataInicio: string;
  dataFim: string | null;
  opId: number | null;
  maquina?: {
    nome: string;
    codigo: string;
  };
  operador?: {
    nome: string;
    matricula: string;
  };
  motivo?: {
    descricao: string;
    codigo: string;
  };
  op?: {
    op: number;
    produto: string;
  } | null;
}

interface Maquina {
  id: string;
  nome: string;
  codigo: string;
  status: string;
}

interface Usuario {
  id: string;
  nome: string;
  matricula: string;
}

interface MotivoParada {
  id: string;
  codigo: string;
  descricao: string;
}

interface OP {
  op: number;
  produto: string;
}

// Schema para o formulário
const paradaSchema = z.object({
  maquinaId: z.string().min(1, 'Máquina é obrigatória'),
  operadorId: z.string().min(1, 'Operador é obrigatório'),
  motivoParadaId: z.string().min(1, 'Motivo é obrigatório'),
  dataInicio: z.string().min(1, 'Data início é obrigatória'),
  observacoes: z.string().optional(),
  opId: z.string().optional(),
});

const columns = [
  {
    key: 'status' as const,
    title: 'Status',
    format: (value: any, row: Parada) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        !row.dataFim ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
      }`}>
        {!row.dataFim ? '⏸️ Em Parada' : '✅ Finalizada'}
      </span>
    )
  },
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
    key: 'operador' as const,
    title: 'Operador',
    format: (value: any) => value?.nome || '-'
  },
  {
    key: 'dataInicio' as const,
    title: 'Início',
    format: (value: string) => formatDate(value)
  },
  {
    key: 'dataFim' as const,
    title: 'Fim',
    format: (value: string | null) => value ? formatDate(value) : 'Em andamento'
  },
  {
    key: 'op' as const,
    title: 'OP Vinculada',
    format: (value: any) => value ? `OP ${value.op}` : '-'
  },
];

export default function ParadasMaquinaPage() {
  const [paradas, setParadas] = useState<Parada[]>([]);
  const [maquinas, setMaquinas] = useState<Maquina[]>([]);
  const [operadores, setOperadores] = useState<Usuario[]>([]);
  const [motivos, setMotivos] = useState<MotivoParada[]>([]);
  const [ops, setOps] = useState<OP[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  });
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedParada, setSelectedParada] = useState<Parada | null>(null);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    carregarDados();
  }, []);

  useEffect(() => {
    carregarParadas(1);
  }, []);

  async function carregarDados() {
    try {
      const [maquinasRes, operadoresRes, motivosRes, opsRes] = await Promise.all([
        fetch('/api/maquinas'),
        fetch('/api/usuarios?nivel=OPERADOR'),
        fetch('/api/motivos-parada'),
        fetch('/api/ops?limit=1000'),
      ]);

      setMaquinas(await maquinasRes.json());
      setOperadores(await operadoresRes.json());
      setMotivos(await motivosRes.json());
      
      const opsData = await opsRes.json();
      setOps(opsData.data || opsData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  }

  async function carregarParadas(page: number = pagination.page) {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
      });

      const response = await fetch(`/api/paradas-maquina?${params}`);
      const result = await response.json();
      
      setParadas(result.data);
      setPagination(result.pagination);
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

  async function handleSubmit(data: any) {
    try {
      const url = selectedParada 
        ? `/api/paradas-maquina/${selectedParada.id}/finalizar`
        : '/api/paradas-maquina';
      
      const method = selectedParada ? 'POST' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Erro ao salvar');

      toast({
        title: 'Sucesso',
        description: selectedParada 
          ? 'Parada finalizada com sucesso' 
          : 'Parada registrada com sucesso',
      });

      setModalOpen(false);
      setSelectedParada(null);
      setFormData({});
      await carregarParadas(1);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao salvar',
        variant: 'destructive',
      });
    }
  }

  const formFields = [
    {
      name: 'maquinaId',
      label: 'Máquina',
      type: 'select' as const,
      required: true,
      options: maquinas.map(m => ({ value: m.id, label: `${m.codigo} - ${m.nome}` }))
    },
    {
      name: 'operadorId',
      label: 'Operador',
      type: 'select' as const,
      required: true,
      options: operadores.map(o => ({ value: o.id, label: `${o.matricula} - ${o.nome}` }))
    },
    {
      name: 'motivoParadaId',
      label: 'Motivo da Parada',
      type: 'select' as const,
      required: true,
      options: motivos.map(m => ({ value: m.id, label: `${m.codigo} - ${m.descricao}` }))
    },
    {
      name: 'dataInicio',
      label: 'Data Início',
      type: 'datetime-local' as const,
      required: true,
    },
    {
      name: 'opId',
      label: 'OP Vinculada (opcional)',
      type: 'select' as const,
      required: false,
      options: [
        { value: '', label: 'Nenhuma' },
        ...ops.map(op => ({ value: op.op.toString(), label: `OP ${op.op} - ${op.produto.substring(0, 30)}` }))
      ]
    },
    {
      name: 'observacoes',
      label: 'Observações',
      type: 'textarea' as const,
      required: false,
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Paradas de Máquina</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => carregarParadas(1)} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
          </Button>
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Nova Parada
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Mostrando {paradas.length} de {pagination.total} paradas
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => carregarParadas(pagination.page - 1)}
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
            onClick={() => carregarParadas(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages || loading}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <DataTable
        data={paradas}
        columns={columns}
        onRowClick={(parada) => {
          setSelectedParada(parada);
          // Abrir modal de detalhes (opcional)
        }}
        extraActions={(parada) => !parada.dataFim ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setSelectedParada(parada);
              setModalOpen(true);
            }}
            className="h-8 w-8 text-green-600"
            title="Finalizar Parada"
          >
            <Play className="h-4 w-4" />
          </Button>
        ) : null}
      />

      <FormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedParada(null);
          setFormData({});
        }}
        onSubmit={handleSubmit}
        title={selectedParada ? 'Finalizar Parada' : 'Nova Parada'}
        fields={formFields}
        initialData={selectedParada ? { 
          ...selectedParada,
          dataFim: new Date().toISOString().slice(0, 16)
        } : {}}
        schema={paradaSchema}
      />
    </div>
  );
}