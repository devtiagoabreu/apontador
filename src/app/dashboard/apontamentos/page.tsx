'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { FormModal } from '@/components/ui/form-modal';
import { toast } from '@/components/ui/use-toast';
import { 
  Plus, 
  RefreshCw, 
  Filter,
  ChevronLeft, 
  ChevronRight,
  Calendar
} from 'lucide-react';
import { formatDate, formatNumber } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { z } from 'zod';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface Apontamento {
  id: string;
  opId: number;
  maquinaId: string;
  operadorInicioId: string;
  operadorFimId?: string;
  metragemProcessada?: number;
  dataInicio: string;
  dataFim: string;
  status: 'EM_ANDAMENTO' | 'CONCLUIDO' | 'CANCELADO';
  motivoParadaId?: string;
  inicioParada?: string;
  fimParada?: string;
  observacoes?: string;
  createdAt: string;
  updatedAt: string;
  
  // Relacionamentos (join)
  op?: {
    op: number;
    produto: string;
  };
  maquina?: {
    nome: string;
    codigo: string;
  };
  operadorInicio?: {
    nome: string;
    matricula: string;
  };
  operadorFim?: {
    nome: string;
    matricula: string;
  };
  motivoParada?: {
    descricao: string;
  };
}

interface OP {
  op: number;
  produto: string;
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
  nivel: string;
}

interface MotivoParada {
  id: string;
  codigo: string;
  descricao: string;
}

// Schema base para o FormModal (ZodObject)
const apontamentoBaseSchema = z.object({
  opId: z.number().int().positive('OP é obrigatória'),
  maquinaId: z.string().min(1, 'Máquina é obrigatória'),
  operadorInicioId: z.string().min(1, 'Operador é obrigatório'),
  operadorFimId: z.string().optional(),
  metragemProcessada: z.number().optional(),
  dataInicio: z.string().min(1, 'Data início é obrigatória'),
  dataFim: z.string().min(1, 'Data fim é obrigatória'),
  status: z.enum(['EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO']),
  motivoParadaId: z.string().optional(),
  inicioParada: z.string().optional(),
  fimParada: z.string().optional(),
  observacoes: z.string().optional(),
});

// Schema com validação (para o handleSubmit)
const apontamentoSchema = apontamentoBaseSchema.refine((data) => {
  if (data.dataFim < data.dataInicio) {
    return false;
  }
  return true;
}, {
  message: 'Data fim não pode ser menor que data início',
  path: ['dataFim'],
});

const columns = [
  { 
    key: 'op' as const, 
    title: 'OP',
    format: (value: any) => value?.op || '-'
  },
  { 
    key: 'maquina' as const, 
    title: 'Máquina',
    format: (value: any) => value?.nome || '-'
  },
  { 
    key: 'operadorInicio' as const, 
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
    format: (value: string) => formatDate(value)
  },
  { 
    key: 'metragemProcessada' as const, 
    title: 'Metragem',
    format: (value: number) => value ? `${formatNumber(value)} m` : '-'
  },
  {
    key: 'status' as const,
    title: 'Status',
    format: (value: string) => {
      const colors = {
        'EM_ANDAMENTO': 'bg-yellow-100 text-yellow-800',
        'CONCLUIDO': 'bg-green-100 text-green-800',
        'CANCELADO': 'bg-red-100 text-red-800',
      };
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[value as keyof typeof colors] || 'bg-gray-100'}`}>
          {value.replace('_', ' ')}
        </span>
      );
    }
  },
  { 
    key: 'motivoParada' as const, 
    title: 'Motivo Parada',
    format: (value: any) => value?.descricao || '-'
  },
];

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Filtros {
  opId?: string;
  maquinaId?: string;
  operadorId?: string;
  dataInicio?: string;
  dataFim?: string;
  status?: string;
}

export default function ApontamentosPage() {
  const [apontamentos, setApontamentos] = useState<Apontamento[]>([]);
  const [ops, setOps] = useState<OP[]>([]);
  const [maquinas, setMaquinas] = useState<Maquina[]>([]);
  const [operadores, setOperadores] = useState<Usuario[]>([]);
  const [motivosParada, setMotivosParada] = useState<MotivoParada[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  });
  const [filtros, setFiltros] = useState<Filtros>({});
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [filtrosOpen, setFiltrosOpen] = useState(false);
  const [selectedApontamento, setSelectedApontamento] = useState<Apontamento | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<Partial<Apontamento>>({});

  useEffect(() => {
    carregarDadosIniciais();
  }, []);

  useEffect(() => {
    carregarApontamentos(1);
  }, [filtros]);

  async function carregarDadosIniciais() {
    try {
      const [opsRes, maquinasRes, operadoresRes, motivosRes] = await Promise.all([
        fetch('/api/ops?limit=1000'),
        fetch('/api/maquinas'),
        fetch('/api/usuarios?nivel=OPERADOR'),
        fetch('/api/motivos-parada'),
      ]);

      const opsData = await opsRes.json();
      const maquinasData = await maquinasRes.json();
      const operadoresData = await operadoresRes.json();
      const motivosData = await motivosRes.json();

      setOps(opsData.data || opsData);
      setMaquinas(maquinasData);
      setOperadores(operadoresData);
      setMotivosParada(motivosData);
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error);
    }
  }

  async function carregarApontamentos(page: number = pagination.page) {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        ...filtros,
      });

      const response = await fetch(`/api/apontamentos?${params}`);
      const result = await response.json();
      
      setApontamentos(result.data);
      setPagination(result.pagination);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os apontamentos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateApontamento(data: any) {
    try {
      const response = await fetch('/api/apontamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao criar apontamento');
      }

      toast({
        title: 'Sucesso',
        description: 'Apontamento criado com sucesso',
      });

      setModalOpen(false);
      setFormData({});
      await carregarApontamentos(1);
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao criar apontamento',
        variant: 'destructive',
      });
    }
  }

  async function handleUpdateApontamento(data: any) {
    if (!selectedApontamento) return;

    try {
      const response = await fetch(`/api/apontamentos/${selectedApontamento.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao atualizar apontamento');
      }

      toast({
        title: 'Sucesso',
        description: 'Apontamento atualizado com sucesso',
      });

      setModalOpen(false);
      setEditMode(false);
      setSelectedApontamento(null);
      setFormData({});
      await carregarApontamentos(pagination.page);
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao atualizar apontamento',
        variant: 'destructive',
      });
    }
  }

  async function handleDeleteApontamento(apontamento: Apontamento) {
    if (!confirm(`Tem certeza que deseja excluir este apontamento?`)) return;

    try {
      const response = await fetch(`/api/apontamentos/${apontamento.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao excluir apontamento');
      }

      toast({
        title: 'Sucesso',
        description: 'Apontamento excluído com sucesso',
      });

      await carregarApontamentos(pagination.page);
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao excluir apontamento',
        variant: 'destructive',
      });
    }
  }

  const openEditModal = (apontamento: Apontamento) => {
    setSelectedApontamento(apontamento);
    setFormData({
      opId: apontamento.opId,
      maquinaId: apontamento.maquinaId,
      operadorInicioId: apontamento.operadorInicioId,
      operadorFimId: apontamento.operadorFimId,
      metragemProcessada: apontamento.metragemProcessada,
      dataInicio: apontamento.dataInicio.slice(0, 16),
      dataFim: apontamento.dataFim.slice(0, 16),
      status: apontamento.status,
      motivoParadaId: apontamento.motivoParadaId,
      inicioParada: apontamento.inicioParada?.slice(0, 16),
      fimParada: apontamento.fimParada?.slice(0, 16),
      observacoes: apontamento.observacoes,
    });
    setEditMode(true);
    setModalOpen(true);
  };

  const formFields = [
    { 
      name: 'opId', 
      label: 'OP', 
      type: 'select' as const, 
      required: true,
      options: ops.map(op => ({ value: op.op.toString(), label: `OP ${op.op} - ${op.produto.substring(0, 30)}` }))
    },
    { 
      name: 'maquinaId', 
      label: 'Máquina', 
      type: 'select' as const, 
      required: true,
      options: maquinas.map(m => ({ value: m.id, label: `${m.codigo} - ${m.nome}` }))
    },
    { 
      name: 'operadorInicioId', 
      label: 'Operador (Início)', 
      type: 'select' as const, 
      required: true,
      options: operadores.map(op => ({ value: op.id, label: `${op.matricula} - ${op.nome}` }))
    },
    { 
      name: 'operadorFimId', 
      label: 'Operador (Fim)', 
      type: 'select' as const, 
      options: operadores.map(op => ({ value: op.id, label: `${op.matricula} - ${op.nome}` }))
    },
    { name: 'dataInicio', label: 'Data Início', type: 'datetime-local' as const, required: true },
    { name: 'dataFim', label: 'Data Fim', type: 'datetime-local' as const, required: true },
    { name: 'metragemProcessada', label: 'Metragem Processada', type: 'number' as const },
    { 
      name: 'status', 
      label: 'Status', 
      type: 'select' as const,
      options: [
        { value: 'EM_ANDAMENTO', label: 'Em Andamento' },
        { value: 'CONCLUIDO', label: 'Concluído' },
        { value: 'CANCELADO', label: 'Cancelado' },
      ]
    },
    { 
      name: 'motivoParadaId', 
      label: 'Motivo de Parada', 
      type: 'select' as const,
      options: motivosParada.map(m => ({ value: m.id, label: `${m.codigo} - ${m.descricao}` }))
    },
    { name: 'inicioParada', label: 'Início da Parada', type: 'datetime-local' as const },
    { name: 'fimParada', label: 'Fim da Parada', type: 'datetime-local' as const },
    { name: 'observacoes', label: 'Observações', type: 'textarea' as const },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Apontamentos</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => setFiltrosOpen(true)}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filtros
          </Button>
          <Button 
            variant="outline"
            onClick={() => {
              setEditMode(false);
              setSelectedApontamento(null);
              setFormData({});
              setModalOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Apontamento
          </Button>
          <Button 
            variant="outline"
            onClick={() => carregarApontamentos(1)} 
            disabled={loading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Info e Paginação */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Mostrando {apontamentos.length} de {pagination.total} apontamentos
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => carregarApontamentos(pagination.page - 1)}
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
            onClick={() => carregarApontamentos(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages || loading}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <DataTable
        data={apontamentos}
        columns={columns}
        onRowClick={(apontamento) => {
          setSelectedApontamento(apontamento);
          setDetailsOpen(true);
        }}
        onEdit={openEditModal}
        onDelete={handleDeleteApontamento}
      />

      {/* Modal de Detalhes */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Apontamento</DialogTitle>
          </DialogHeader>
          
          {selectedApontamento && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">OP</p>
                  <p className="text-sm">OP {selectedApontamento.op?.op} - {selectedApontamento.op?.produto}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Máquina</p>
                  <p className="text-sm">{selectedApontamento.maquina?.nome} ({selectedApontamento.maquina?.codigo})</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Operador (Início)</p>
                  <p className="text-sm">{selectedApontamento.operadorInicio?.nome} - {selectedApontamento.operadorInicio?.matricula}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Operador (Fim)</p>
                  <p className="text-sm">{selectedApontamento.operadorFim?.nome || '-'} {selectedApontamento.operadorFim?.matricula}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Data Início</p>
                  <p className="text-sm">{formatDate(selectedApontamento.dataInicio)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Data Fim</p>
                  <p className="text-sm">{formatDate(selectedApontamento.dataFim)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Metragem</p>
                  <p className="text-sm">{selectedApontamento.metragemProcessada ? `${formatNumber(selectedApontamento.metragemProcessada)} m` : '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Status</p>
                  <p className="text-sm">{selectedApontamento.status}</p>
                </div>
              </div>

              {selectedApontamento.motivoParada && (
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <p className="text-sm font-medium text-yellow-700">Parada</p>
                  <p className="text-sm text-yellow-600">{selectedApontamento.motivoParada.descricao}</p>
                  {selectedApontamento.inicioParada && (
                    <p className="text-xs text-yellow-500 mt-1">
                      {formatDate(selectedApontamento.inicioParada)} - {selectedApontamento.fimParada ? formatDate(selectedApontamento.fimParada) : 'Em andamento'}
                    </p>
                  )}
                </div>
              )}

              {selectedApontamento.observacoes && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Observações</p>
                  <p className="text-sm">{selectedApontamento.observacoes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Filtros */}
      <Dialog open={filtrosOpen} onOpenChange={setFiltrosOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Filtros</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="filtroOp">OP</Label>
              <Select 
                value={filtros.opId || ''} 
                onValueChange={(value) => setFiltros(prev => ({ ...prev, opId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas as OPs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas</SelectItem>
                  {ops.map(op => (
                    <SelectItem key={op.op} value={op.op.toString()}>
                      OP {op.op}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filtroMaquina">Máquina</Label>
              <Select 
                value={filtros.maquinaId || ''} 
                onValueChange={(value) => setFiltros(prev => ({ ...prev, maquinaId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas as máquinas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas</SelectItem>
                  {maquinas.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filtroOperador">Operador</Label>
              <Select 
                value={filtros.operadorId || ''} 
                onValueChange={(value) => setFiltros(prev => ({ ...prev, operadorId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os operadores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  {operadores.map(op => (
                    <SelectItem key={op.id} value={op.id}>
                      {op.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filtroStatus">Status</Label>
              <Select 
                value={filtros.status || ''} 
                onValueChange={(value) => setFiltros(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="EM_ANDAMENTO">Em Andamento</SelectItem>
                  <SelectItem value="CONCLUIDO">Concluído</SelectItem>
                  <SelectItem value="CANCELADO">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="dataInicio">Data Início</Label>
                <Input
                  id="dataInicio"
                  type="date"
                  value={filtros.dataInicio || ''}
                  onChange={(e) => setFiltros(prev => ({ ...prev, dataInicio: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dataFim">Data Fim</Label>
                <Input
                  id="dataFim"
                  type="date"
                  value={filtros.dataFim || ''}
                  onChange={(e) => setFiltros(prev => ({ ...prev, dataFim: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => {
              setFiltros({});
              setFiltrosOpen(false);
            }}>
              Limpar
            </Button>
            <Button onClick={() => setFiltrosOpen(false)}>
              Aplicar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Criação/Edição - USANDO O SCHEMA BASE */}
      <FormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditMode(false);
          setSelectedApontamento(null);
          setFormData({});
        }}
        onSubmit={editMode ? handleUpdateApontamento : handleCreateApontamento}
        title={editMode ? 'Editar Apontamento' : 'Novo Apontamento'}
        fields={formFields}
        initialData={formData}
        schema={apontamentoBaseSchema} // ✅ USANDO O SCHEMA BASE
      />
    </div>
  );
}