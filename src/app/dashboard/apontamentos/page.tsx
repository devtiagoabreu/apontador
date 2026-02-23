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
  Eye,
  Edit,
  Trash2
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
import { Checkbox } from '@/components/ui/checkbox';

// INTERFACES
interface Apontamento {
  id: string;
  tipo: 'PRODUCAO' | 'PARADA';
  opId: number | null;
  maquinaId: string;
  operadorInicioId: string;
  operadorFimId: string | null;
  metragemProcessada: number | null;
  dataInicio: string;
  dataFim: string;
  status: 'EM_ANDAMENTO' | 'CONCLUIDO' | 'CANCELADO';
  motivoParadaId: string | null;
  observacoes: string | null;
  estagioId: string | null;
  isReprocesso: boolean;
  
  op?: {
    op: number;
    produto: string;
  } | null;
  maquina?: {
    nome: string;
    codigo: string;
  } | null;
  operadorInicio?: {
    nome: string;
    matricula: string;
  } | null;
  operadorFim?: {
    nome: string;
    matricula: string;
  } | null;
  motivoParada?: {
    descricao: string;
  } | null;
  estagio?: {
    id: string;
    nome: string;
    codigo: string;
    cor: string;
  } | null;
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

interface Estagio {
  id: string;
  codigo: string;
  nome: string;
  cor: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Filtros {
  tipo?: string;
  opId?: string;
  maquinaId?: string;
  estagioId?: string;
  operadorId?: string;
  dataInicio?: string;
  dataFim?: string;
  status?: string;
}

// SCHEMA DO FORMULÁRIO - FLEXÍVEL
const apontamentoSchema = z.object({
  tipo: z.enum(['PRODUCAO', 'PARADA']),
  maquinaId: z.string().min(1, 'Máquina é obrigatória'),
  operadorInicioId: z.string().min(1, 'Operador é obrigatório'),
  operadorFimId: z.string().optional(),
  dataInicio: z.string().min(1, 'Data início é obrigatória'),
  dataFim: z.string().min(1, 'Data fim é obrigatória'),
  status: z.enum(['EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO']),
  observacoes: z.string().optional(),
  opId: z.number().optional(),
  estagioId: z.string().optional(),
  metragemProcessada: z.number().optional(),
  isReprocesso: z.boolean().default(false),
  motivoParadaId: z.string().optional(),
});

// COLUNAS DA TABELA
const columns = [
  { 
    key: 'tipo' as const, 
    title: 'Tipo',
    format: (value: string) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        value === 'PRODUCAO' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
      }`}>
        {value === 'PRODUCAO' ? '🔨 Produção' : '⏸️ Parada'}
      </span>
    )
  },
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
    key: 'estagio' as const, 
    title: 'Estágio',
    format: (value: any) => {
      if (!value) return '-';
      return (
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: value.cor }} />
          <span>{value.nome}</span>
        </div>
      );
    }
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
    key: 'isReprocesso' as const, 
    title: 'Reprocesso',
    format: (value: boolean) => value ? '🔄 Sim' : '✅ Não'
  },
  { 
    key: 'motivoParada' as const, 
    title: 'Motivo Parada',
    format: (value: any) => value?.descricao || '-'
  },
];

export default function ApontamentosPage() {
  // States
  const [apontamentos, setApontamentos] = useState<Apontamento[]>([]);
  const [ops, setOps] = useState<OP[]>([]);
  const [maquinas, setMaquinas] = useState<Maquina[]>([]);
  const [operadores, setOperadores] = useState<Usuario[]>([]);
  const [motivosParada, setMotivosParada] = useState<MotivoParada[]>([]);
  const [estagios, setEstagios] = useState<Estagio[]>([]);
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
  const [formData, setFormData] = useState<any>({});

  // Carregar dados iniciais
  useEffect(() => {
    carregarDadosIniciais();
  }, []);

  useEffect(() => {
    carregarApontamentos(1);
  }, [filtros]);

  async function carregarDadosIniciais() {
    try {
      const [opsRes, maquinasRes, operadoresRes, motivosRes, estagiosRes] = await Promise.all([
        fetch('/api/ops?limit=1000'),
        fetch('/api/maquinas'),
        fetch('/api/usuarios?nivel=OPERADOR'),
        fetch('/api/motivos-parada'),
        fetch('/api/estagios?ativos=true'),
      ]);

      const opsData = await opsRes.json();
      const maquinasData = await maquinasRes.json();
      const operadoresData = await operadoresRes.json();
      const motivosData = await motivosRes.json();
      const estagiosData = await estagiosRes.json();

      setOps(opsData.data || opsData);
      setMaquinas(maquinasData);
      setOperadores(operadoresData);
      setMotivosParada(motivosData);
      setEstagios(estagiosData);
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

  // FUNÇÃO DE SALVAR - USANDO O FORMATO QUE FUNCIONOU
  async function handleSubmit(data: any) {
    try {
      // Preparar dados no formato correto
      const dadosParaEnviar: any = {
        tipo: data.tipo,
        maquinaId: data.maquinaId,
        operadorInicioId: data.operadorInicioId,
        dataInicio: data.dataInicio ? new Date(data.dataInicio).toISOString() : new Date().toISOString(),
        dataFim: data.dataFim ? new Date(data.dataFim).toISOString() : new Date().toISOString(),
        status: data.status,
        observacoes: data.observacoes || null,
      };

      // Adicionar campos opcionais
      if (data.operadorFimId) {
        dadosParaEnviar.operadorFimId = data.operadorFimId;
      }

      // Campos específicos por tipo
      if (data.tipo === 'PRODUCAO') {
        if (data.opId) {
          dadosParaEnviar.opId = Number(data.opId);
        }
        if (data.estagioId) {
          dadosParaEnviar.estagioId = data.estagioId;
        }
        if (data.metragemProcessada) {
          dadosParaEnviar.metragemProcessada = Number(data.metragemProcessada);
        }
        if (data.isReprocesso !== undefined) {
          dadosParaEnviar.isReprocesso = Boolean(data.isReprocesso);
        }
      }

      if (data.tipo === 'PARADA') {
        if (data.motivoParadaId) {
          dadosParaEnviar.motivoParadaId = data.motivoParadaId;
        }
        if (data.opId) {
          dadosParaEnviar.opId = Number(data.opId);
        }
      }

      console.log('📦 Enviando:', dadosParaEnviar);

      const url = editMode && selectedApontamento 
        ? `/api/apontamentos/${selectedApontamento.id}` 
        : '/api/apontamentos';
      
      const method = editMode ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dadosParaEnviar),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'Erro ao salvar');
      }

      toast({
        title: 'Sucesso',
        description: `Apontamento ${editMode ? 'atualizado' : 'criado'} com sucesso`,
      });

      setModalOpen(false);
      setSelectedApontamento(null);
      setFormData({});
      await carregarApontamentos(pagination.page);
    } catch (error) {
      console.error('❌ Erro:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao salvar',
        variant: 'destructive',
      });
    }
  }

  // Abrir modal de edição
  const openEditModal = (apontamento: Apontamento) => {
    setSelectedApontamento(apontamento);
    setFormData({
      tipo: apontamento.tipo,
      maquinaId: apontamento.maquinaId,
      operadorInicioId: apontamento.operadorInicioId,
      operadorFimId: apontamento.operadorFimId || '',
      dataInicio: apontamento.dataInicio.slice(0, 16),
      dataFim: apontamento.dataFim.slice(0, 16),
      status: apontamento.status,
      observacoes: apontamento.observacoes || '',
      opId: apontamento.opId,
      estagioId: apontamento.estagioId || '',
      metragemProcessada: apontamento.metragemProcessada,
      isReprocesso: apontamento.isReprocesso || false,
      motivoParadaId: apontamento.motivoParadaId || '',
    });
    setEditMode(true);
    setModalOpen(true);
  };

  // Novo apontamento
  const handleNovoApontamento = () => {
    const agora = new Date().toISOString().slice(0, 16);
    setEditMode(false);
    setSelectedApontamento(null);
    setFormData({
      tipo: 'PRODUCAO',
      maquinaId: '',
      operadorInicioId: '',
      operadorFimId: '',
      dataInicio: agora,
      dataFim: agora,
      status: 'EM_ANDAMENTO',
      observacoes: '',
      opId: undefined,
      estagioId: '',
      metragemProcessada: undefined,
      isReprocesso: false,
      motivoParadaId: '',
    });
    setModalOpen(true);
  };

  // CAMPOS DO FORMULÁRIO DINÂMICOS
  const getFormFields = () => {
    const tipo = formData?.tipo;
    
    // Campos base
    const baseFields = [
      { 
        name: 'tipo', 
        label: 'Tipo', 
        type: 'select' as const, 
        required: true,
        options: [
          { value: 'PRODUCAO', label: 'Produção' },
          { value: 'PARADA', label: 'Parada' },
        ]
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
        required: false,
        options: [
          { value: '', label: 'Nenhum' },
          ...operadores.map(op => ({ value: op.id, label: `${op.matricula} - ${op.nome}` }))
        ]
      },
      { name: 'dataInicio', label: 'Data Início', type: 'datetime-local' as const, required: true },
      { name: 'dataFim', label: 'Data Fim', type: 'datetime-local' as const, required: true },
      { 
        name: 'status', 
        label: 'Status', 
        type: 'select' as const,
        required: true,
        options: [
          { value: 'EM_ANDAMENTO', label: 'Em Andamento' },
          { value: 'CONCLUIDO', label: 'Concluído' },
          { value: 'CANCELADO', label: 'Cancelado' },
        ]
      },
      { name: 'observacoes', label: 'Observações', type: 'textarea' as const, required: false },
    ];

    // Campos para PRODUÇÃO (no topo)
    if (tipo === 'PRODUCAO') {
      return [
        { 
          name: 'opId', 
          label: 'OP', 
          type: 'select' as const, 
          required: true,
          options: ops.map(op => ({ value: op.op.toString(), label: `OP ${op.op} - ${op.produto.substring(0, 50)}` }))
        },
        { 
          name: 'estagioId', 
          label: 'Estágio', 
          type: 'select' as const, 
          required: true,
          options: estagios.map(e => ({ value: e.id, label: e.nome }))
        },
        ...baseFields,
        { name: 'metragemProcessada', label: 'Metragem Processada', type: 'number' as const, required: false },
        { name: 'isReprocesso', label: 'É Reprocesso?', type: 'switch' as const, required: false },
      ];
    }

    // Campos para PARADA
    if (tipo === 'PARADA') {
      return [
        ...baseFields,
        { 
          name: 'motivoParadaId', 
          label: 'Motivo de Parada', 
          type: 'select' as const, 
          required: true,
          options: motivosParada.map(m => ({ value: m.id, label: `${m.codigo} - ${m.descricao}` }))
        },
        { 
          name: 'opId', 
          label: 'OP Vinculada (opcional)', 
          type: 'select' as const, 
          required: false,
          options: [
            { value: '', label: 'Nenhuma' },
            ...ops.map(op => ({ value: op.op.toString(), label: `OP ${op.op} - ${op.produto.substring(0, 50)}` }))
          ]
        },
      ];
    }

    return baseFields;
  };

  return (
    <div className="space-y-6 p-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Apontamentos</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setFiltrosOpen(true)}>
            <Filter className="mr-2 h-4 w-4" /> Filtros
          </Button>
          <Button variant="outline" onClick={handleNovoApontamento}>
            <Plus className="mr-2 h-4 w-4" /> Novo Apontamento
          </Button>
          <Button variant="outline" onClick={() => carregarApontamentos(1)} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
          </Button>
        </div>
      </div>

      {/* Paginação */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Mostrando {apontamentos.length} de {pagination.total} apontamentos
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => carregarApontamentos(pagination.page - 1)} disabled={pagination.page <= 1 || loading}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">Página {pagination.page} de {pagination.totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => carregarApontamentos(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages || loading}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabela */}
      <DataTable
        data={apontamentos}
        columns={columns}
        onRowClick={(apontamento) => {
          setSelectedApontamento(apontamento);
          setDetailsOpen(true);
        }}
        onEdit={openEditModal}
        onDelete={async (apontamento) => {
          if (confirm('Tem certeza que deseja excluir este apontamento?')) {
            try {
              await fetch(`/api/apontamentos/${apontamento.id}`, { method: 'DELETE' });
              toast({ title: 'Sucesso', description: 'Apontamento excluído' });
              carregarApontamentos(pagination.page);
            } catch (error) {
              toast({ title: 'Erro', description: 'Erro ao excluir', variant: 'destructive' });
            }
          }
        }}
      />

      {/* Modal de Detalhes */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Apontamento</DialogTitle>
          </DialogHeader>
          {selectedApontamento && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Tipo</p>
                <p className="text-sm">{selectedApontamento.tipo === 'PRODUCAO' ? '🔨 Produção' : '⏸️ Parada'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">OP</p>
                <p className="text-sm">{selectedApontamento.op?.op || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Máquina</p>
                <p className="text-sm">{selectedApontamento.maquina?.nome} ({selectedApontamento.maquina?.codigo})</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Estágio</p>
                {selectedApontamento.estagio ? (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedApontamento.estagio.cor }} />
                    <span>{selectedApontamento.estagio.nome}</span>
                  </div>
                ) : '-'}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Operador (Início)</p>
                <p className="text-sm">{selectedApontamento.operadorInicio?.nome} - {selectedApontamento.operadorInicio?.matricula}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Operador (Fim)</p>
                <p className="text-sm">{selectedApontamento.operadorFim?.nome || '-'}</p>
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
                <p className="text-sm font-medium text-gray-500">Reprocesso</p>
                <p className="text-sm">{selectedApontamento.isReprocesso ? '🔄 Sim' : '✅ Não'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Status</p>
                <p className="text-sm">{selectedApontamento.status}</p>
              </div>
              {selectedApontamento.motivoParada && (
                <div className="col-span-2 bg-yellow-50 p-3 rounded-lg">
                  <p className="text-sm font-medium text-yellow-700">Motivo da Parada</p>
                  <p className="text-sm text-yellow-600">{selectedApontamento.motivoParada.descricao}</p>
                </div>
              )}
              {selectedApontamento.observacoes && (
                <div className="col-span-2">
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
              <Label htmlFor="filtroTipo">Tipo</Label>
              <Select 
                value={filtros.tipo || ''} 
                onValueChange={(value) => setFiltros(prev => ({ ...prev, tipo: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="PRODUCAO">Produção</SelectItem>
                  <SelectItem value="PARADA">Parada</SelectItem>
                </SelectContent>
              </Select>
            </div>

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
              <Label htmlFor="filtroEstagio">Estágio</Label>
              <Select 
                value={filtros.estagioId || ''} 
                onValueChange={(value) => setFiltros(prev => ({ ...prev, estagioId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os estágios" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  {estagios.map(e => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nome}
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

      {/* MODAL PRINCIPAL - FormModal */}
      <FormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedApontamento(null);
          setFormData({});
        }}
        onSubmit={handleSubmit}
        title={editMode ? 'Editar Apontamento' : 'Novo Apontamento'}
        fields={getFormFields()}
        initialData={formData}
        schema={apontamentoSchema}
      />
    </div>
  );
}