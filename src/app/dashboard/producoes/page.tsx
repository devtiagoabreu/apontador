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
  CheckCircle,
  Pencil,
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

// Interfaces
interface Producao {
  id: string;
  opId: number;
  maquinaId: string;
  operadorInicioId: string;
  operadorFimId: string | null;
  estagioId: string;
  dataInicio: string;
  dataFim: string | null;
  metragemProgramada: number | null;
  metragemProcessada: number | null;
  isReprocesso: boolean;
  observacoes: string | null;
  
  // Relacionamentos
  op?: {
    op: number;
    produto: string;
    programado: number | null;
    carregado: number | null;
    um: string;
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
  } | null;
  estagio?: {
    nome: string;
    codigo: string;
    cor: string;
  };
}

interface OP {
  op: number;
  produto: string;
  qtdeProgramado: number | null;
  qtdeCarregado: number | null;
  um: string;
  status: string;
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
  opId?: string;
  maquinaId?: string;
  estagioId?: string;
  operadorId?: string;
  ativas?: string;
  dataInicio?: string;
  dataFim?: string;
}

// Schema para iniciar produção
const iniciarProducaoSchema = z.object({
  opId: z.union([z.string(), z.number()])
    .transform(val => Number(val))
    .refine(val => !isNaN(val) && val > 0, 'OP é obrigatória'),
  
  maquinaId: z.string().min(1, 'Máquina é obrigatória'),
  operadorInicioId: z.string().min(1, 'Operador é obrigatório'),
  estagioId: z.string().min(1, 'Estágio é obrigatório'),
  isReprocesso: z.boolean().default(false),
  observacoes: z.string().optional(),
});

// Schema para finalizar produção
const finalizarProducaoSchema = z.object({
  metragemProcessada: z.union([z.string(), z.number()])
    .transform(val => Number(val))
    .refine(val => !isNaN(val) && val > 0, 'Metragem deve ser positiva'),
  
  observacoes: z.string().optional(),
});

// Schema para editar produção
const editarProducaoSchema = z.object({
  operadorFimId: z.string().optional(),
  metragemProcessada: z.union([z.string(), z.number()])
    .transform(val => Number(val))
    .optional(),
  observacoes: z.string().optional(),
  isReprocesso: z.boolean().optional(),
});

// Colunas da tabela - AGORA COM CARREGADO
const columns = [
  {
    key: 'dataFim' as const,
    title: 'Status',
    format: (value: string | null) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        !value ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
      }`}>
        {!value ? '⚙️ Em Andamento' : '✅ Finalizada'}
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
    format: (value: string | null) => value ? formatDate(value) : 'Em andamento'
  },
  {
    key: 'metragemProgramada' as const,
    title: 'Programado',
    format: (value: number) => value ? formatNumber(value) : '-'
  },
  {
    key: 'op' as const, // Usando a relação para acessar carregado
    title: 'Carregado',
    format: (value: any) => value?.carregado ? formatNumber(value.carregado) : '-'
  },
  {
    key: 'metragemProcessada' as const,
    title: 'Processado',
    format: (value: number) => value ? formatNumber(value) : '-'
  },
  {
    key: 'isReprocesso' as const,
    title: 'Reprocesso',
    format: (value: boolean) => value ? '🔄 Sim' : '✅ Não'
  },
];

export default function ProducoesPage() {
  // States
  const [producoes, setProducoes] = useState<Producao[]>([]);
  const [ops, setOps] = useState<OP[]>([]);
  const [maquinas, setMaquinas] = useState<Maquina[]>([]);
  const [operadores, setOperadores] = useState<Usuario[]>([]);
  const [estagios, setEstagios] = useState<Estagio[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  });
  const [filtros, setFiltros] = useState<Filtros>({});
  const [loading, setLoading] = useState(false);
  const [modalIniciarOpen, setModalIniciarOpen] = useState(false);
  const [modalFinalizarOpen, setModalFinalizarOpen] = useState(false);
  const [modalEditarOpen, setModalEditarOpen] = useState(false);
  const [filtrosOpen, setFiltrosOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedProducao, setSelectedProducao] = useState<Producao | null>(null);
  const [formData, setFormData] = useState<any>({});

  // Carregar dados iniciais
  useEffect(() => {
    carregarDados();
  }, []);

  useEffect(() => {
    carregarProducoes(1);
  }, [filtros]);

  async function carregarDados() {
    try {
      const [opsRes, maquinasRes, operadoresRes, estagiosRes] = await Promise.all([
        fetch('/api/ops?limit=1000'),
        fetch('/api/maquinas'),
        fetch('/api/usuarios?nivel=OPERADOR'),
        fetch('/api/estagios?ativos=true'),
      ]);

      const opsData = await opsRes.json();
      const maquinasData = await maquinasRes.json();
      const operadoresData = await operadoresRes.json();
      const estagiosData = await estagiosRes.json();

      setOps(opsData.data || opsData);
      setMaquinas(maquinasData);
      setOperadores(operadoresData);
      setEstagios(estagiosData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  }

  async function carregarProducoes(page: number = pagination.page) {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        ...filtros,
      });

      const response = await fetch(`/api/producoes?${params}`);
      const result = await response.json();
      
      setProducoes(result.data);
      setPagination(result.pagination);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as produções',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleIniciarProducao(data: any) {
    try {
      console.log('📦 Iniciando produção:', data);
      
      const response = await fetch('/api/producoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      let responseData;
      try {
        responseData = await response.json();
      } catch (e) {
        responseData = { error: 'Resposta inválida do servidor' };
      }
      
      console.log('📦 Resposta:', { status: response.status, data: responseData });

      if (!response.ok && response.status !== 201) {
        throw new Error(responseData.error || `Erro ${response.status}`);
      }

      toast({
        title: 'Sucesso',
        description: 'Produção iniciada com sucesso',
      });

      setModalIniciarOpen(false);
      setFormData({});
      await carregarProducoes(1);
      
    } catch (error) {
      console.error('❌ Erro:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao iniciar',
        variant: 'destructive',
      });
    }
  }

  async function handleFinalizarProducao(data: any) {
    if (!selectedProducao) return;

    try {
      console.log('📦 Finalizando produção:', data);
      
      const response = await fetch(`/api/producoes/${selectedProducao.id}/finalizar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const responseData = await response.json();
      console.log('📦 Resposta:', responseData);

      if (!response.ok) {
        throw new Error(responseData.error || 'Erro ao finalizar');
      }

      toast({
        title: 'Sucesso',
        description: 'Produção finalizada com sucesso',
      });

      setModalFinalizarOpen(false);
      setSelectedProducao(null);
      setFormData({});
      await carregarProducoes(pagination.page);
    } catch (error) {
      console.error('❌ Erro:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao finalizar',
        variant: 'destructive',
      });
    }
  }

  async function handleEditarProducao(data: any) {
    if (!selectedProducao) return;

    try {
      console.log('📦 Editando produção:', data);
      
      const response = await fetch(`/api/producoes/${selectedProducao.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const responseData = await response.json();
      console.log('📦 Resposta:', responseData);

      if (!response.ok) {
        throw new Error(responseData.error || 'Erro ao editar');
      }

      toast({
        title: 'Sucesso',
        description: 'Produção editada com sucesso',
      });

      setModalEditarOpen(false);
      setSelectedProducao(null);
      setFormData({});
      await carregarProducoes(pagination.page);
    } catch (error) {
      console.error('❌ Erro:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao editar',
        variant: 'destructive',
      });
    }
  }

  async function handleDeletarProducao(producao: Producao) {
    if (!confirm(`Tem certeza que deseja excluir a produção da OP ${producao.op?.op}?`)) return;

    try {
      const response = await fetch(`/api/producoes/${producao.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao excluir');
      }

      toast({
        title: 'Sucesso',
        description: 'Produção excluída com sucesso',
      });

      await carregarProducoes(pagination.page);
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao excluir',
        variant: 'destructive',
      });
    }
  }

  // Campos para iniciar produção
  const camposIniciar = [
    {
      name: 'opId',
      label: 'OP',
      type: 'select' as const,
      required: true,
      options: ops
        .filter(op => {
          if (op.status === 'CANCELADA' || op.status === 'FINALIZADA') return false;
          if (op.status === 'ABERTA') return true;
          if (op.status === 'EM_ANDAMENTO') {
            const ultimoApontamento = producoes
              .filter(p => p.opId === op.op)
              .sort((a, b) => new Date(b.dataFim || 0).getTime() - new Date(a.dataFim || 0).getTime())[0];
            return ultimoApontamento?.dataFim !== null;
          }
          return false;
        })
        .map(op => ({ 
          value: op.op.toString(), 
          label: `OP ${op.op} - ${op.produto.substring(0, 30)} (Carregado: ${op.qtdeCarregado || 0} ${op.um})` 
        }))
    },
    {
      name: 'maquinaId',
      label: 'Máquina',
      type: 'select' as const,
      required: true,
      options: maquinas
        .filter(m => m.status === 'DISPONIVEL')
        .map(m => ({ 
          value: m.id, 
          label: `${m.codigo} - ${m.nome}` 
        }))
    },
    {
      name: 'operadorInicioId',
      label: 'Operador',
      type: 'select' as const,
      required: true,
      options: operadores.map(o => ({ 
        value: o.id, 
        label: `${o.matricula} - ${o.nome}` 
      }))
    },
    {
      name: 'estagioId',
      label: 'Estágio',
      type: 'select' as const,
      required: true,
      options: estagios.map(e => ({ 
        value: e.id, 
        label: e.nome 
      }))
    },
    {
      name: 'isReprocesso',
      label: 'É Reprocesso?',
      type: 'switch' as const,
      required: false,
    },
    {
      name: 'observacoes',
      label: 'Observações',
      type: 'textarea' as const,
      required: false,
    },
  ];

  // Campos para finalizar produção
  const camposFinalizar = [
    {
      name: 'metragemProcessada',
      label: 'Metragem Processada neste Estágio',
      type: 'number' as const,
      required: true,
    },
    {
      name: 'observacoes',
      label: 'Observações',
      type: 'textarea' as const,
      required: false,
    },
  ];

  // Campos para editar produção
  const camposEditar = [
    {
      name: 'operadorFimId',
      label: 'Operador (Fim)',
      type: 'select' as const,
      required: false,
      options: [
        { value: '', label: 'Nenhum' },
        ...operadores.map(o => ({ 
          value: o.id, 
          label: `${o.matricula} - ${o.nome}` 
        }))
      ]
    },
    {
      name: 'metragemProcessada',
      label: 'Metragem Processada',
      type: 'number' as const,
      required: false,
    },
    {
      name: 'observacoes',
      label: 'Observações',
      type: 'textarea' as const,
      required: false,
    },
    {
      name: 'isReprocesso',
      label: 'É Reprocesso?',
      type: 'switch' as const,
      required: false,
    },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Produções</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setFiltrosOpen(true)}>
            <Filter className="mr-2 h-4 w-4" /> Filtros
          </Button>
          <Button variant="outline" onClick={() => carregarProducoes(1)} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
          </Button>
          <Button onClick={() => setModalIniciarOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Nova Produção
          </Button>
        </div>
      </div>

      {/* Paginação */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Mostrando {producoes.length} de {pagination.total} produções
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => carregarProducoes(pagination.page - 1)}
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
            onClick={() => carregarProducoes(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages || loading}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabela - AGORA COM COLUNA CARREGADO */}
      <DataTable
        data={producoes}
        columns={columns}
        onRowClick={(producao) => {
          setSelectedProducao(producao);
          setDetailsOpen(true);
        }}
        extraActions={(producao) => (
          <div className="flex items-center gap-1">
            {!producao.dataFim && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setSelectedProducao(producao);
                  setModalFinalizarOpen(true);
                }}
                className="h-8 w-8 text-green-600"
                title="Finalizar Produção"
              >
                <CheckCircle className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setSelectedProducao(producao);
                setFormData({
                  operadorFimId: producao.operadorFimId || '',
                  metragemProcessada: producao.metragemProcessada,
                  observacoes: producao.observacoes || '',
                  isReprocesso: producao.isReprocesso,
                });
                setModalEditarOpen(true);
              }}
              className="h-8 w-8 text-blue-600"
              title="Editar Produção"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDeletarProducao(producao)}
              className="h-8 w-8 text-red-600"
              title="Excluir Produção"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      />

      {/* Modal de Iniciar Produção */}
      <FormModal
        open={modalIniciarOpen}
        onClose={() => {
          setModalIniciarOpen(false);
          setFormData({});
        }}
        onSubmit={handleIniciarProducao}
        title="Iniciar Nova Produção"
        fields={camposIniciar}
        initialData={{}}
        schema={iniciarProducaoSchema}
      />

      {/* Modal de Finalizar Produção */}
      <FormModal
        open={modalFinalizarOpen}
        onClose={() => {
          setModalFinalizarOpen(false);
          setSelectedProducao(null);
          setFormData({});
        }}
        onSubmit={handleFinalizarProducao}
        title="Finalizar Produção"
        fields={camposFinalizar}
        initialData={selectedProducao ? {
          metragemProcessada: selectedProducao.op?.carregado || 0,
        } : {}}
        schema={finalizarProducaoSchema}
      />

      {/* Modal de Editar Produção */}
      <FormModal
        open={modalEditarOpen}
        onClose={() => {
          setModalEditarOpen(false);
          setSelectedProducao(null);
          setFormData({});
        }}
        onSubmit={handleEditarProducao}
        title="Editar Produção"
        fields={camposEditar}
        initialData={formData}
        schema={editarProducaoSchema}
      />

      {/* Modal de Detalhes */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Produção</DialogTitle>
          </DialogHeader>
          {selectedProducao && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">OP</p>
                  <p className="text-sm">OP {selectedProducao.op?.op}</p>
                  <p className="text-xs text-gray-400">{selectedProducao.op?.produto}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Máquina</p>
                  <p className="text-sm">{selectedProducao.maquina?.nome}</p>
                  <p className="text-xs text-gray-400">{selectedProducao.maquina?.codigo}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Estágio</p>
                  {selectedProducao.estagio && (
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedProducao.estagio.cor }} />
                      <p className="text-sm">{selectedProducao.estagio.nome}</p>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Status</p>
                  <p className="text-sm">{!selectedProducao.dataFim ? 'Em Andamento' : 'Finalizada'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Operador (Início)</p>
                  <p className="text-sm">{selectedProducao.operadorInicio?.nome}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Operador (Fim)</p>
                  <p className="text-sm">{selectedProducao.operadorFim?.nome || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Data Início</p>
                  <p className="text-sm">{formatDate(selectedProducao.dataInicio)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Data Fim</p>
                  <p className="text-sm">{selectedProducao.dataFim ? formatDate(selectedProducao.dataFim) : '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Programado</p>
                  <p className="text-sm">{selectedProducao.metragemProgramada} {selectedProducao.op?.um}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Carregado</p>
                  <p className="text-sm">{selectedProducao.op?.carregado} {selectedProducao.op?.um}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Processado</p>
                  <p className="text-sm">{selectedProducao.metragemProcessada || '-'} {selectedProducao.op?.um}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Reprocesso</p>
                  <p className="text-sm">{selectedProducao.isReprocesso ? 'Sim' : 'Não'}</p>
                </div>
              </div>
              {selectedProducao.observacoes && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Observações</p>
                  <p className="text-sm">{selectedProducao.observacoes}</p>
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
              <Label>Status</Label>
              <Select 
                value={filtros.ativas || ''} 
                onValueChange={(value) => setFiltros(prev => ({ ...prev, ativas: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="true">Em Andamento</SelectItem>
                  <SelectItem value="false">Finalizadas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>OP</Label>
              <Select 
                value={filtros.opId || ''} 
                onValueChange={(value) => setFiltros(prev => ({ ...prev, opId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
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
              <Label>Máquina</Label>
              <Select 
                value={filtros.maquinaId || ''} 
                onValueChange={(value) => setFiltros(prev => ({ ...prev, maquinaId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
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
              <Label>Estágio</Label>
              <Select 
                value={filtros.estagioId || ''} 
                onValueChange={(value) => setFiltros(prev => ({ ...prev, estagioId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
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
              <Label>Operador</Label>
              <Select 
                value={filtros.operadorId || ''} 
                onValueChange={(value) => setFiltros(prev => ({ ...prev, operadorId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
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
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => { setFiltros({}); setFiltrosOpen(false); }}>
              Limpar
            </Button>
            <Button onClick={() => setFiltrosOpen(false)}>
              Aplicar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}