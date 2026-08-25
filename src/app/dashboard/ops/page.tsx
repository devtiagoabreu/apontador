// src/app/dashboard/ops/page.tsx
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
  XCircle, 
  ChevronLeft, 
  ChevronRight,
  AlertTriangle,
  Search,
  X,
  Filter,
  BarChart3,
  FileText,
  FileSpreadsheet,
  Pencil,
  Trash2,
  Settings2,
} from 'lucide-react';
import { formatDate, formatNumber } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

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

interface Maquina {
  id: string;
  codigo: string;
  nome: string;
}

interface MotivoCancelamento {
  id: string;
  codigo: string;
  descricao: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Filtros {
  status?: string;
  op?: string;
  produto?: string;
  dataInicio?: string;
  dataFim?: string;
}

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

interface RelatorioOps {
  totalOps: number;
  abertas: number;
  andamento: number;
  finalizadas: number;
  canceladas: number;
  totalProgramado: number;
  totalCarregado: number;
  totalProduzido: number;
  eficienciaMedia: number;
  opsPorEstagio: { nome: string; quantidade: number }[];
  opsPorStatus: { nome: string; quantidade: number }[];
}

// Schema para criação/edição de OP - CORRIGIDO PARA ACEITAR STRINGS
const opSchema = z.object({
  op: z.union([z.string(), z.number()])
    .transform(val => {
      if (typeof val === 'string') {
        // Remove pontos de milhar e substitui vírgula por ponto
        const cleaned = val.replace(/\./g, '').replace(',', '.');
        return Number(cleaned);
      }
      return Number(val);
    })
    .refine(val => !isNaN(val) && val > 0, 'OP deve ser um número positivo')
    .optional(),
  
  produto: z.string().min(1).optional(),
  
  qtdeProgramado: z.union([z.string(), z.number()])
    .transform(val => {
      if (val === null || val === undefined || val === '') return null;
      if (typeof val === 'string') {
        // Remove pontos de milhar e substitui vírgula por ponto
        const cleaned = val.replace(/\./g, '').replace(',', '.');
        const num = Number(cleaned);
        return isNaN(num) ? null : num;
      }
      return Number(val);
    })
    .optional()
    .nullable(),
  
  qtdeCarregado: z.union([z.string(), z.number()])
    .transform(val => {
      if (val === null || val === undefined || val === '') return null;
      if (typeof val === 'string') {
        const cleaned = val.replace(/\./g, '').replace(',', '.');
        const num = Number(cleaned);
        return isNaN(num) ? null : num;
      }
      return Number(val);
    })
    .optional()
    .nullable(),
  
  qtdeProduzida: z.union([z.string(), z.number()])
    .transform(val => {
      if (val === null || val === undefined || val === '') return null;
      if (typeof val === 'string') {
        const cleaned = val.replace(/\./g, '').replace(',', '.');
        const num = Number(cleaned);
        return isNaN(num) ? null : num;
      }
      return Number(val);
    })
    .optional()
    .nullable(),
  
  calculoQuebra: z.union([z.string(), z.number()])
    .transform(val => {
      if (val === null || val === undefined || val === '') return null;
      if (typeof val === 'string') {
        const cleaned = val.replace(/\./g, '').replace(',', '.');
        const num = Number(cleaned);
        return isNaN(num) ? null : num;
      }
      return Number(val);
    })
    .optional()
    .nullable(),
  
  um: z.string().optional().nullable(),
  narrativa: z.string().optional().nullable(),
  obs: z.string().optional().nullable(),
  
  status: z.enum(['ABERTA', 'EM_ANDAMENTO', 'FINALIZADA', 'CANCELADA']).optional(),
  
  codEstagioAtual: z.string().optional(),
  estagioAtual: z.string().optional(),
  codMaquinaAtual: z.string().optional(),
  maquinaAtual: z.string().optional(),
  
  depositoFinal: z.string().optional().nullable(),
  pecasVinculadas: z.string().optional().nullable(),
  nivel: z.string().optional().nullable(),
  grupo: z.string().optional().nullable(),
  sub: z.string().optional().nullable(),
  item: z.string().optional().nullable(),
});

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function OpsPage() {
  const [ops, setOps] = useState<OP[]>([]);
  const [opsFiltradas, setOpsFiltradas] = useState<OP[]>([]);
  const [estagios, setEstagios] = useState<Estagio[]>([]);
  const [maquinas, setMaquinas] = useState<Maquina[]>([]);
  const [motivosCancelamento, setMotivosCancelamento] = useState<MotivoCancelamento[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  });
  const [filtros, setFiltros] = useState<Filtros>({});
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'op', direction: 'desc' });
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selectedOp, setSelectedOp] = useState<OP | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [filtrosOpen, setFiltrosOpen] = useState(false);
  const [relatorioOpen, setRelatorioOpen] = useState(false);
  const [motivoCancelamento, setMotivoCancelamento] = useState('');
  const [formData, setFormData] = useState<Partial<OP>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [relatorio, setRelatorio] = useState<RelatorioOps | null>(null);

  // Estados para os selects
  const [estagioSelecionado, setEstagioSelecionado] = useState<string>('');
  const [maquinaSelecionada, setMaquinaSelecionada] = useState<string>('');

  // Estados para modal de importação
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [sistemas, setSistemas] = useState<any[]>([]);
  const [sistemaSelecionado, setSistemaSelecionado] = useState('');
  const [apiSelecionada, setApiSelecionada] = useState('');

  useEffect(() => {
    carregarOps(1);
    carregarEstagios();
    carregarMaquinas();
    carregarMotivosCancelamento();
    carregarSistemas();
  }, []);

  useEffect(() => {
    carregarOps(1);
  }, [filtros]);

  // Filtrar e ordenar localmente
  useEffect(() => {
    let dadosFiltrados = [...ops];
    
    // Filtro de pesquisa global
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      dadosFiltrados = dadosFiltrados.filter(op => 
        op.op.toString().includes(term) ||
        op.produto.toLowerCase().includes(term) ||
        (op.estagioAtual && op.estagioAtual.toLowerCase().includes(term)) ||
        (op.maquinaAtual && op.maquinaAtual.toLowerCase().includes(term)) ||
        op.status.toLowerCase().includes(term) ||
        (op.narrativa && op.narrativa.toLowerCase().includes(term))
      );
    }

    // Ordenação
    dadosFiltrados.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortConfig.key) {
        case 'op':
          aVal = a.op;
          bVal = b.op;
          break;
        case 'produto':
          aVal = a.produto;
          bVal = b.produto;
          break;
        case 'qtdeProgramado':
          aVal = a.qtdeProgramado;
          bVal = b.qtdeProgramado;
          break;
        case 'qtdeCarregado':
          aVal = a.qtdeCarregado;
          bVal = b.qtdeCarregado;
          break;
        case 'qtdeProduzida':
          aVal = a.qtdeProduzida;
          bVal = b.qtdeProduzida;
          break;
        case 'estagioAtual':
          aVal = a.estagioAtual;
          bVal = b.estagioAtual;
          break;
        case 'maquinaAtual':
          aVal = a.maquinaAtual;
          bVal = b.maquinaAtual;
          break;
        case 'status':
          const statusOrder = { 'ABERTA': 1, 'EM_ANDAMENTO': 2, 'FINALIZADA': 3, 'CANCELADA': 4 };
          aVal = statusOrder[a.status as keyof typeof statusOrder] || 5;
          bVal = statusOrder[b.status as keyof typeof statusOrder] || 5;
          break;
        default:
          aVal = a[sortConfig.key as keyof OP];
          bVal = b[sortConfig.key as keyof OP];
      }

      if (aVal === null || aVal === undefined) aVal = '';
      if (bVal === null || bVal === undefined) bVal = '';

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    setOpsFiltradas(dadosFiltrados);
  }, [ops, searchTerm, sortConfig]);

  async function carregarEstagios() {
    try {
      const response = await fetch('/api/estagios');
      const data = await response.json();
      setEstagios(data);
    } catch (error) {
      console.error('Erro ao carregar estágios:', error);
    }
  }

  async function carregarMaquinas() {
    try {
      const response = await fetch('/api/maquinas');
      const data = await response.json();
      setMaquinas(data);
    } catch (error) {
      console.error('Erro ao carregar máquinas:', error);
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

  async function carregarSistemas() {
    try {
      const response = await fetch('/api/sistemas-integracao');
      const data = await response.json();
      setSistemas(data.filter((s: any) => s.ativa));
    } catch (error) {
      console.error('Erro ao carregar sistemas:', error);
    }
  }

  async function carregarOps(page: number = pagination.page) {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
      });

      if (filtros.status && filtros.status !== 'todos') {
        params.append('status', filtros.status);
      }

      console.log('📦 Enviando filtros:', Object.fromEntries(params));

      const response = await fetch(`/api/ops?${params}`);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Erro ao carregar');
      }

      setOps(result.data);
      setPagination(result.pagination);
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Não foi possível carregar as OPs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function importarOps(sistemaId?: string, apiId?: string) {
    setImporting(true);
    setImportModalOpen(false);
    try {
      const body: any = {};
      if (sistemaId) body.sistema_id = sistemaId;
      if (apiId) body.api_id = apiId;

      const response = await fetch('/api/systextil/importar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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

  function gerarRelatorio() {
    const dados = opsFiltradas;
    
    const totalOps = dados.length;
    const abertas = dados.filter(op => op.status === 'ABERTA').length;
    const andamento = dados.filter(op => op.status === 'EM_ANDAMENTO').length;
    const finalizadas = dados.filter(op => op.status === 'FINALIZADA').length;
    const canceladas = dados.filter(op => op.status === 'CANCELADA').length;
    
    const totalProgramado = dados.reduce((acc, op) => acc + (op.qtdeProgramado || 0), 0);
    const totalCarregado = dados.reduce((acc, op) => acc + (op.qtdeCarregado || 0), 0);
    const totalProduzido = dados.reduce((acc, op) => acc + (op.qtdeProduzida || 0), 0);
    
    const eficienciaMedia = totalProgramado > 0 ? (totalProduzido / totalProgramado) * 100 : 0;

    const opsPorEstagio = estagios.map(estagio => {
      const quantidade = dados.filter(op => op.codEstagioAtual === estagio.codigo).length;
      return {
        nome: estagio.nome,
        quantidade,
      };
    }).filter(e => e.quantidade > 0);

    const opsPorStatus = [
      { nome: 'Abertas', quantidade: abertas },
      { nome: 'Em Andamento', quantidade: andamento },
      { nome: 'Finalizadas', quantidade: finalizadas },
      { nome: 'Canceladas', quantidade: canceladas },
    ].filter(s => s.quantidade > 0);

    setRelatorio({
      totalOps,
      abertas,
      andamento,
      finalizadas,
      canceladas,
      totalProgramado,
      totalCarregado,
      totalProduzido,
      eficienciaMedia,
      opsPorEstagio,
      opsPorStatus,
    });

    setRelatorioOpen(true);
  }

  function exportarCSV() {
    const headers = ['OP', 'Produto', 'Programado', 'Carregado', 'Produzido', 'Último Estágio', 'Última Máquina', 'Status', 'Importação'];
    const linhas = opsFiltradas.map(op => [
      op.op,
      op.produto,
      op.qtdeProgramado,
      op.qtdeCarregado,
      op.qtdeProduzida,
      op.estagioAtual,
      op.maquinaAtual,
      op.status,
      formatDate(op.dataImportacao),
    ]);

    const csv = [headers.join(','), ...linhas.map(l => l.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ops_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }

  function exportarPDF() {
    window.print();
  }

  async function handleCreateOp(data: any) {
    try {
      console.log('📦 Criando OP com dados:', data);
      
      const response = await fetch('/api/ops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'Erro ao criar OP');
      }

      toast({
        title: 'Sucesso',
        description: `OP ${data.op} criada com sucesso`,
      });

      setModalOpen(false);
      setFormData({});
      setEstagioSelecionado('');
      setMaquinaSelecionada('');
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
      console.log('📦 Atualizando OP com dados:', data);
      
      const response = await fetch(`/api/ops/${selectedOp.op}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'Erro ao atualizar OP');
      }

      toast({
        title: 'Sucesso',
        description: `OP ${selectedOp.op} atualizada com sucesso`,
      });

      setEditModalOpen(false);
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

  // 🔴 FUNÇÃO DE DELETAR CORRIGIDA - Verifica se há produções vinculadas
  async function handleDeleteOp(op: OP) {
    // Primeiro, verificar se existem produções vinculadas
    try {
      const response = await fetch(`/api/producoes?opId=${op.op}&limit=1`);
      const data = await response.json();
      
      if (data.data && data.data.length > 0) {
        toast({
          title: 'Não é possível excluir',
          description: `Esta OP possui ${data.pagination?.total || 'produções'} vinculadas. Cancele ou finalize as produções primeiro.`,
          variant: 'destructive',
        });
        return;
      }
    } catch (error) {
      console.error('Erro ao verificar produções:', error);
    }

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
      codMaquinaAtual: op.codMaquinaAtual,
      maquinaAtual: op.maquinaAtual,
      depositoFinal: op.depositoFinal,
      pecasVinculadas: op.pecasVinculadas,
      calculoQuebra: op.calculoQuebra,
      nivel: op.nivel,
      grupo: op.grupo,
      sub: op.sub,
      item: op.item,
    });
    
    setEstagioSelecionado(op.codEstagioAtual);
    setMaquinaSelecionada(op.codMaquinaAtual);
    
    setEditModalOpen(true);
  };

  const openCancelModal = (op: OP) => {
    setSelectedOp(op);
    setCancelModalOpen(true);
  };

  const handleEstagioChange = (codigo: string) => {
    setEstagioSelecionado(codigo);
    
    const estagio = estagios.find(e => e.codigo === codigo);
    if (estagio) {
      setFormData({
        ...formData,
        codEstagioAtual: codigo,
        estagioAtual: estagio.nome,
      });
    }
  };

  const handleMaquinaChange = (codigo: string) => {
    setMaquinaSelecionada(codigo);
    
    const maquina = maquinas.find(m => m.codigo === codigo);
    if (maquina) {
      setFormData({
        ...formData,
        codMaquinaAtual: codigo,
        maquinaAtual: maquina.nome,
      });
    }
  };

  function handleSort(key: string) {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  }

  function prepararDadosEdicao(op: OP) {
    return {
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
      codMaquinaAtual: op.codMaquinaAtual,
      maquinaAtual: op.maquinaAtual,
      depositoFinal: op.depositoFinal,
      pecasVinculadas: op.pecasVinculadas,
      calculoQuebra: op.calculoQuebra,
      nivel: op.nivel,
      grupo: op.grupo,
      sub: op.sub,
      item: op.item,
    };
  }

  const columns = [
    { 
      key: 'op' as const, 
      title: 'OP',
      sortable: true,
      format: (value: number) => <span className="font-mono font-medium">{value}</span>
    },
    { 
      key: 'produto' as const, 
      title: 'Produto',
      sortable: true,
      format: (value: string) => <span className="max-w-[200px] truncate block" title={value}>{value}</span>
    },
    { 
      key: 'qtdeProgramado' as const, 
      title: 'Programado',
      sortable: true,
      format: (value: number) => value ? formatNumber(value) : '-'
    },
    { 
      key: 'qtdeCarregado' as const, 
      title: 'Carregado',
      sortable: true,
      format: (value: number) => value ? formatNumber(value) : '-'
    },
    { 
      key: 'qtdeProduzida' as const, 
      title: 'Produzido',
      sortable: true,
      format: (value: number) => value ? formatNumber(value) : '-'
    },
    {
      key: 'estagioAtual' as const,
      title: 'Estágio',
      sortable: true,
    },
    {
      key: 'maquinaAtual' as const,
      title: 'Máquina',
      sortable: true,
    },
    {
      key: 'status' as const,
      title: 'Status',
      sortable: true,
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
      sortable: true,
      format: (value: string) => formatDate(value)
    },
  ];

  // 🔴 CAMPOS CORRIGIDOS - Máquina agora é select
  const camposOp = [
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
      label: 'Código do Estágio', 
      type: 'select' as const,
      options: estagios.map(e => ({ value: e.codigo, label: `${e.codigo} - ${e.nome}` }))
    },
    { 
      name: 'estagioAtual', 
      label: 'Estágio Atual', 
      type: 'text' as const,
    },
    // 🔴 Código da Máquina agora é select
    { 
      name: 'codMaquinaAtual', 
      label: 'Código da Máquina', 
      type: 'select' as const,
      options: maquinas.map(m => ({ value: m.codigo, label: `${m.codigo} - ${m.nome}` }))
    },
    // 🔴 Este campo será preenchido automaticamente
    { 
      name: 'maquinaAtual', 
      label: 'Máquina Atual', 
      type: 'text' as const,
    },
    { name: 'depositoFinal', label: 'Depósito Final', type: 'text' as const },
    { name: 'pecasVinculadas', label: 'Peças Vinculadas', type: 'text' as const },
    { name: 'calculoQuebra', label: 'Cálculo Quebra', type: 'number' as const },
    { name: 'nivel', label: 'Nível', type: 'text' as const },
    { name: 'grupo', label: 'Grupo', type: 'text' as const },
    { name: 'sub', label: 'Sub', type: 'text' as const },
    { name: 'item', label: 'Item', type: 'text' as const },
  ];

  const estagiosOrdenados = [...estagios].sort((a, b) => {
    return parseInt(a.codigo) - parseInt(b.codigo);
  });

  const maquinasOrdenadas = [...maquinas].sort((a, b) => {
    return parseInt(a.codigo) - parseInt(b.codigo);
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Ordens de Produção</h1>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Pesquisar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-10 w-64"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
              >
                <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" /> Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportarCSV}>
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel (CSV)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportarPDF}>
                <FileText className="mr-2 h-4 w-4" /> PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" onClick={gerarRelatorio} disabled={opsFiltradas.length === 0}>
            <BarChart3 className="mr-2 h-4 w-4" /> Relatório
          </Button>

          <Button variant="outline" onClick={() => setFiltrosOpen(true)}>
            <Filter className="mr-2 h-4 w-4" /> Filtros
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
            onClick={() => {
              if (sistemas.length === 0) {
                toast({ title: 'Aviso', description: 'Nenhum sistema de integração configurado. Cadastre em Configurações.', variant: 'warning' });
                return;
              }
              setSistemaSelecionado('');
              setApiSelecionada('');
              setImportModalOpen(true);
            }}
            disabled={importing}
          >
            {importing ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {importing ? 'Importando...' : 'Importar'}
          </Button>

          <Button 
            variant="default"
            onClick={() => {
              setSelectedOp(null);
              setFormData({});
              setEstagioSelecionado('');
              setMaquinaSelecionada('');
              setModalOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova OP
          </Button>
        </div>
      </div>

      {searchTerm && (
        <div className="bg-blue-50 p-2 rounded-lg flex items-center justify-between">
          <p className="text-sm text-blue-700">
            Pesquisando por: <span className="font-medium">"{searchTerm}"</span> - {opsFiltradas.length} resultado(s)
          </p>
          <Button variant="ghost" size="sm" onClick={() => setSearchTerm('')}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Mostrando {opsFiltradas.length} de {pagination.total} OPs
          {opsFiltradas.length !== ops.length && (
            <span className="ml-2 text-blue-600">(filtrados)</span>
          )}
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

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left text-sm font-medium text-gray-600 ${
                    col.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                  }`}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {col.title}
                    {sortConfig.key === col.key && (
                      <span className="text-xs">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {opsFiltradas.map((op) => (
              <tr
                key={op.op}
                className="border-b hover:bg-gray-50 cursor-pointer"
                onClick={() => {
                  setSelectedOp(op);
                  setDetailsOpen(true);
                }}
              >
                {columns.map((col) => {
                  const value = op[col.key as keyof OP];
                  const displayValue = value === null || value === undefined ? '-' : String(value);
                  
                  return (
                    <td key={col.key} className="px-4 py-3 text-sm">
                      {col.format ? (col.format as any)(value) : displayValue}
                    </td>
                  );
                })}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditModal(op)}
                      className="h-8 w-8 text-blue-600"
                      title="Editar OP"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {op.status !== 'CANCELADA' && op.status !== 'FINALIZADA' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openCancelModal(op)}
                        className="h-8 w-8 text-red-600 hover:text-red-700"
                        title="Cancelar OP"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteOp(op)}
                      className="h-8 w-8 text-red-600"
                      title="Excluir OP"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
                  <p className="text-sm">{selectedOp.estagioAtual} ({selectedOp.codEstagioAtual})</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Máquina Atual</p>
                  <p className="text-sm">{selectedOp.maquinaAtual} ({selectedOp.codMaquinaAtual})</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Status</p>
                  <p className="text-sm">{selectedOp.status}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Importada em</p>
                  <p className="text-sm">{formatDate(selectedOp.dataImportacao)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Depósito Final</p>
                  <p className="text-sm">{selectedOp.depositoFinal || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Peças Vinculadas</p>
                  <p className="text-sm">{selectedOp.pecasVinculadas || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Nível/Grupo/Sub/Item</p>
                  <p className="text-sm">{selectedOp.nivel || '-'}/{selectedOp.grupo || '-'}/{selectedOp.sub || '-'}/{selectedOp.item || '-'}</p>
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

      <FormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setFormData({});
          setEstagioSelecionado('');
          setMaquinaSelecionada('');
        }}
        onSubmit={handleCreateOp}
        title="Nova OP"
        fields={camposOp}
        initialData={{}}
        schema={opSchema}
      />

      <FormModal
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedOp(null);
          setFormData({});
          setEstagioSelecionado('');
          setMaquinaSelecionada('');
        }}
        onSubmit={handleUpdateOp}
        title={`Editar OP ${selectedOp?.op}`}
        fields={camposOp}
        initialData={selectedOp ? prepararDadosEdicao(selectedOp) : {}}
        schema={opSchema}
      />

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

      <Dialog open={filtrosOpen} onOpenChange={setFiltrosOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Filtros</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select 
                value={filtros.status || 'todos'} 
                onValueChange={(value) => {
                  if (value === 'todos') {
                    const { status, ...rest } = filtros;
                    setFiltros(rest);
                  } else {
                    setFiltros(prev => ({ ...prev, status: value }));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="ABERTA">Aberta</SelectItem>
                  <SelectItem value="EM_ANDAMENTO">Em Andamento</SelectItem>
                  <SelectItem value="FINALIZADA">Finalizada</SelectItem>
                  <SelectItem value="CANCELADA">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => { 
              setFiltros({}); 
              setFiltrosOpen(false);
              carregarOps(1);
            }}>
              Limpar
            </Button>
            <Button onClick={() => {
              setFiltrosOpen(false);
              carregarOps(1);
            }}>
              Aplicar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={relatorioOpen} onOpenChange={setRelatorioOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Relatório de OPs</DialogTitle>
            <DialogDescription>
              Análise baseada nos {opsFiltradas.length} registros filtrados
            </DialogDescription>
          </DialogHeader>

          {relatorio && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-600 font-medium">Total OPs</p>
                  <p className="text-3xl font-bold">{relatorio.totalOps}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-600 font-medium">Programado</p>
                  <p className="text-3xl font-bold">{formatNumber(relatorio.totalProgramado)}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-purple-600 font-medium">Produzido</p>
                  <p className="text-3xl font-bold">{formatNumber(relatorio.totalProduzido)}</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <p className="text-sm text-orange-600 font-medium">Eficiência</p>
                  <p className="text-3xl font-bold">{relatorio.eficienciaMedia.toFixed(1)}%</p>
                </div>
              </div>

              <Tabs defaultValue="status">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="status">Por Status</TabsTrigger>
                  <TabsTrigger value="estagio">Por Estágio</TabsTrigger>
                </TabsList>

                <TabsContent value="status" className="mt-4">
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={relatorio.opsPorStatus}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry) => `${entry.nome}: ${entry.quantidade}`}
                          outerRadius={80}
                          dataKey="quantidade"
                        >
                          {relatorio.opsPorStatus.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </TabsContent>

                <TabsContent value="estagio" className="mt-4">
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={relatorio.opsPorEstagio}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="nome" angle={-45} textAnchor="end" height={80} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="quantidade" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Importação */}
      <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Importar Dados</DialogTitle>
            <DialogDescription>Selecione o sistema e o endpoint para importar</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Sistema de Integração</Label>
              <select
                value={sistemaSelecionado}
                onChange={(e) => {
                  setSistemaSelecionado(e.target.value);
                  setApiSelecionada('');
                }}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Selecione...</option>
                {sistemas.map((s) => (
                  <option key={s.id} value={s.id}>{s.nome}</option>
                ))}
              </select>
            </div>

            {sistemaSelecionado && (
              <div className="space-y-2">
                <Label>Endpoint</Label>
                <select
                  value={apiSelecionada}
                  onChange={(e) => setApiSelecionada(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Usar endpoint ativo padrão</option>
                  {sistemas
                    .find((s) => s.id === sistemaSelecionado)
                    ?.apis?.filter((a: any) => a.ativa)
                    .map((a: any) => (
                      <option key={a.id} value={a.id}>{a.nome} ({a.metodo})</option>
                    ))}
                </select>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setImportModalOpen(false)}>Cancelar</Button>
            <Button
              disabled={!sistemaSelecionado || importing}
              onClick={() => importarOps(sistemaSelecionado, apiSelecionada || undefined)}
            >
              {importing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              {importing ? 'Importando...' : 'Importar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}