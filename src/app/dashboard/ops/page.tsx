'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { FormModal } from '@/components/ui/form-modal';
import { toast } from '@/components/ui/use-toast';
import { 
  Download, 
  RefreshCw, 
  Plus, 
  Eye, 
  Edit, 
  XCircle, 
  ChevronLeft, 
  ChevronRight,
  AlertTriangle
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
import { Textarea } from '@/components/ui/textarea';

interface OP {
  op: number;
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
  codMotivoCancelamento: string | null;
  motivoCancelamento: string | null;
  dataCancelamento: string | null;
  status: string;
  dataImportacao: string;
  dataUltimoApontamento: string | null;
}

interface Estagio {
  id: string;
  codigo: string;
  nome: string;
}

interface MotivoCancelamento {
  id: string;
  codigo: string;
  descricao: string;
}

// Schema para criação/edição de OP
const opSchema = z.object({
  op: z.number().int().positive('OP deve ser um número positivo'),
  produto: z.string().min(1, 'Produto é obrigatório'),
  qtdeProgramado: z.number().optional().nullable(),
  qtdeCarregado: z.number().optional().nullable(),
  qtdeProduzida: z.number().optional().nullable(),
  um: z.string().optional().nullable(),
  narrativa: z.string().optional().nullable(),
  obs: z.string().optional().nullable(),
  status: z.enum(['ABERTA', 'EM_ANDAMENTO', 'FINALIZADA', 'CANCELADA']),
  codEstagioAtual: z.string().optional().default('00'),
  estagioAtual: z.string().optional().default('NENHUM'),
});

const columns = [
  { 
    key: 'op' as const, 
    title: 'OP',
    format: (value: number) => <span className="font-mono font-medium">{value}</span>
  },
  { 
    key: 'produto' as const, 
    title: 'Produto',
    format: (value: string) => <span className="max-w-[200px] truncate block" title={value}>{value}</span>
  },
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

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function OpsPage() {
  const [ops, setOps] = useState<OP[]>([]);
  const [estagios, setEstagios] = useState<Estagio[]>([]);
  const [motivosCancelamento, setMotivosCancelamento] = useState<MotivoCancelamento[]>([]);
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
  const [modalOpen, setModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [motivoCancelamento, setMotivoCancelamento] = useState('');
  const [formData, setFormData] = useState<Partial<OP>>({});

  useEffect(() => {
    carregarOps(1);
    carregarEstagios();
    carregarMotivosCancelamento();
  }, []);

  async function carregarEstagios() {
    try {
      const response = await fetch('/api/estagios');
      const data = await response.json();
      setEstagios(data);
    } catch (error) {
      console.error('Erro ao carregar estágios:', error);
    }
  }

  async function carregarMotivosCancelamento() {
    try {
      const response = await fetch('/api/motivos-cancelamento');
      const data = await response.json();
      setMotivosCancelamento(data);
    } catch (error) {
      console.error('Erro ao carregar motivos de cancelamento:', error);
    }
  }

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

  async function handleCreateOp(data: any) {
    try {
      const response = await fetch('/api/ops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao criar OP');
      }

      toast({
        title: 'Sucesso',
        description: `OP ${data.op} criada com sucesso`,
      });

      setModalOpen(false);
      setEditMode(false);
      setFormData({});
      await carregarOps(1);
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao criar OP',
        variant: 'destructive',
      });
    }
  }

  async function handleUpdateOp(data: any) {
    if (!selectedOp) return;

    try {
      const response = await fetch(`/api/ops/${selectedOp.op}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao atualizar OP');
      }

      toast({
        title: 'Sucesso',
        description: `OP ${selectedOp.op} atualizada com sucesso`,
      });

      setModalOpen(false);
      setEditMode(false);
      setSelectedOp(null);
      setFormData({});
      await carregarOps(pagination.page);
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao atualizar OP',
        variant: 'destructive',
      });
    }
  }

  async function handleCancelOp() {
    if (!selectedOp || !motivoCancelamento) return;

    try {
      const response = await fetch(`/api/ops/${selectedOp.op}/cancelar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivoId: motivoCancelamento }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao cancelar OP');
      }

      toast({
        title: 'Sucesso',
        description: `OP ${selectedOp.op} cancelada com sucesso`,
      });

      setCancelModalOpen(false);
      setSelectedOp(null);
      setMotivoCancelamento('');
      await carregarOps(pagination.page);
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao cancelar OP',
        variant: 'destructive',
      });
    }
  }

  async function handleDeleteOp(op: OP) {
    if (!confirm(`Tem certeza que deseja excluir permanentemente a OP ${op.op}?`)) return;

    try {
      const response = await fetch(`/api/ops/${op.op}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao excluir OP');
      }

      toast({
        title: 'Sucesso',
        description: `OP ${op.op} excluída com sucesso`,
      });

      await carregarOps(1);
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao excluir OP',
        variant: 'destructive',
      });
    }
  }

  const openEditModal = (op: OP) => {
    setSelectedOp(op);
    setFormData({
      op: op.op,
      produto: op.produto,
      qtdeProgramado: op.qtdeProgramado,
      qtdeCarregado: op.qtdeCarregado,
      qtdeProduzida: op.qtdeProduzida,
      um: op.um,
      narrativa: op.narrativa,
      obs: op.obs,
      status: op.status,
      codEstagioAtual: op.codEstagioAtual,
      estagioAtual: op.estagioAtual,
    });
    setEditMode(true);
    setModalOpen(true);
  };

  const openCancelModal = (op: OP) => {
    setSelectedOp(op);
    setCancelModalOpen(true);
  };

  const formFields = [
    { name: 'op', label: 'Número da OP', type: 'number' as const, required: true },
    { name: 'produto', label: 'Produto', type: 'text' as const, required: true },
    { name: 'qtdeProgramado', label: 'Quantidade Programada', type: 'number' as const },
    { name: 'qtdeCarregado', label: 'Quantidade Carregada', type: 'number' as const },
    { name: 'qtdeProduzida', label: 'Quantidade Produzida', type: 'number' as const },
    { name: 'um', label: 'Unidade de Medida', type: 'text' as const },
    { name: 'narrativa', label: 'Narrativa', type: 'textarea' as const },
    { name: 'obs', label: 'Observações', type: 'textarea' as const },
    { 
      name: 'status', 
      label: 'Status', 
      type: 'select' as const,
      options: [
        { value: 'ABERTA', label: 'Aberta' },
        { value: 'EM_ANDAMENTO', label: 'Em Andamento' },
        { value: 'FINALIZADA', label: 'Finalizada' },
        { value: 'CANCELADA', label: 'Cancelada' },
      ]
    },
    { 
      name: 'codEstagioAtual', 
      label: 'Estágio Atual', 
      type: 'select' as const,
      options: estagios.map(e => ({ value: e.codigo, label: e.nome }))
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Ordens de Produção</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => {
              setEditMode(false);
              setSelectedOp(null);
              setFormData({});
              setModalOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova OP
          </Button>
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
        extraActions={(op) => (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                openEditModal(op);
              }}
              className="h-8 w-8"
              title="Editar OP"
            >
              <Edit className="h-4 w-4" />
            </Button>
            {op.status !== 'CANCELADA' && op.status !== 'FINALIZADA' && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  openCancelModal(op);
                }}
                className="h-8 w-8 text-red-600 hover:text-red-700"
                title="Cancelar OP"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      />

      {/* Modal de Detalhes */}
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

              {selectedOp.status === 'CANCELADA' && selectedOp.motivoCancelamento && (
                <div className="bg-red-50 p-3 rounded-lg">
                  <p className="text-sm font-medium text-red-700">Motivo do Cancelamento</p>
                  <p className="text-sm text-red-600">{selectedOp.motivoCancelamento}</p>
                  {selectedOp.dataCancelamento && (
                    <p className="text-xs text-red-500 mt-1">
                      Cancelado em: {formatDate(selectedOp.dataCancelamento)}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Criação/Edição */}
      <FormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditMode(false);
          setSelectedOp(null);
          setFormData({});
        }}
        onSubmit={editMode ? handleUpdateOp : handleCreateOp}
        title={editMode ? `Editar OP ${selectedOp?.op}` : 'Nova OP'}
        fields={formFields}
        initialData={formData}
        schema={opSchema}
      />

      {/* Modal de Cancelamento */}
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancelar OP {selectedOp?.op}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-yellow-50 p-3 rounded-lg flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-700">
                Esta ação não pode ser desfeita. A OP será movida para a coluna de finalizadas com status CANCELADA.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo do Cancelamento *</Label>
              <Select value={motivoCancelamento} onValueChange={setMotivoCancelamento}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um motivo" />
                </SelectTrigger>
                <SelectContent>
                  {motivosCancelamento.map((motivo) => (
                    <SelectItem key={motivo.id} value={motivo.id}>
                      {motivo.codigo} - {motivo.descricao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setCancelModalOpen(false)}>
              Voltar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleCancelOp}
              disabled={!motivoCancelamento}
            >
              Confirmar Cancelamento
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}