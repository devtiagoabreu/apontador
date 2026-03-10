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
  Trash2,
  Download,
  BarChart3,
  FileText,
  FileSpreadsheet,
  Search,
  X
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  search?: string;
}

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

interface RelatorioLean {
  totalProducoes: number;
  totalMetragem: number;
  tempoTotal: number;
  eficienciaMedia: number;
  producoesPorEstagio: { nome: string; cor: string; quantidade: number; metragem: number }[];
  producoesPorMaquina: { nome: string; quantidade: number; metragem: number }[];
  producoesPorOperador: { nome: string; quantidade: number; metragem: number }[];
  producoesPorDia: { data: string; quantidade: number; metragem: number }[];
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

// Cores para gráficos
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function ProducoesPage() {
  // States
  const [producoes, setProducoes] = useState<Producao[]>([]);
  const [producoesFiltradas, setProducoesFiltradas] = useState<Producao[]>([]);
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
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'dataInicio', direction: 'desc' });
  const [loading, setLoading] = useState(false);
  const [modalIniciarOpen, setModalIniciarOpen] = useState(false);
  const [modalFinalizarOpen, setModalFinalizarOpen] = useState(false);
  const [modalEditarOpen, setModalEditarOpen] = useState(false);
  const [filtrosOpen, setFiltrosOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [relatorioOpen, setRelatorioOpen] = useState(false);
  const [selectedProducao, setSelectedProducao] = useState<Producao | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [relatorio, setRelatorio] = useState<RelatorioLean | null>(null);

  // Carregar dados iniciais
  useEffect(() => {
    carregarDados();
  }, []);

  useEffect(() => {
    carregarProducoes(1);
  }, [filtros]);

  // Filtrar e ordenar localmente quando os dados mudam
  useEffect(() => {
    let dadosFiltrados = [...producoes];
    
    // Filtro de pesquisa global
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      dadosFiltrados = dadosFiltrados.filter(p => 
        p.op?.op.toString().includes(term) ||
        p.op?.produto.toLowerCase().includes(term) ||
        p.maquina?.nome.toLowerCase().includes(term) ||
        p.estagio?.nome.toLowerCase().includes(term) ||
        p.operadorInicio?.nome.toLowerCase().includes(term)
      );
    }

    // Ordenação
    dadosFiltrados.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortConfig.key) {
        case 'op':
          aVal = a.op?.op;
          bVal = b.op?.op;
          break;
        case 'maquina':
          aVal = a.maquina?.nome;
          bVal = b.maquina?.nome;
          break;
        case 'estagio':
          aVal = a.estagio?.nome;
          bVal = b.estagio?.nome;
          break;
        case 'operadorInicio':
          aVal = a.operadorInicio?.nome;
          bVal = b.operadorInicio?.nome;
          break;
        case 'metragemProgramada':
          aVal = a.metragemProgramada;
          bVal = b.metragemProgramada;
          break;
        case 'metragemProcessada':
          aVal = a.metragemProcessada;
          bVal = b.metragemProcessada;
          break;
        default:
          aVal = a[sortConfig.key as keyof Producao];
          bVal = b[sortConfig.key as keyof Producao];
      }

      if (aVal === null || aVal === undefined) aVal = '';
      if (bVal === null || bVal === undefined) bVal = '';

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    setProducoesFiltradas(dadosFiltrados);
  }, [producoes, searchTerm, sortConfig]);

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

  // Gerar relatório lean com os dados filtrados
  function gerarRelatorio() {
    const dados = producoesFiltradas;
    
    // Totais
    const totalProducoes = dados.length;
    const totalMetragem = dados.reduce((acc, p) => acc + (p.metragemProcessada || 0), 0);
    
    // Calcular tempo total em minutos
    const tempoTotal = dados.reduce((acc, p) => {
      if (p.dataFim && p.dataInicio) {
        const inicio = new Date(p.dataInicio).getTime();
        const fim = new Date(p.dataFim).getTime();
        return acc + (fim - inicio) / (1000 * 60);
      }
      return acc;
    }, 0);

    // Eficiência média (metragem por minuto)
    const eficienciaMedia = tempoTotal > 0 ? (totalMetragem / tempoTotal) * 60 : 0;

    // Produções por estágio
    const producoesPorEstagio = estagios.map(estagio => {
      const producoesEstagio = dados.filter(p => p.estagioId === estagio.id);
      return {
        nome: estagio.nome,
        cor: estagio.cor,
        quantidade: producoesEstagio.length,
        metragem: producoesEstagio.reduce((acc, p) => acc + (p.metragemProcessada || 0), 0),
      };
    }).filter(e => e.quantidade > 0);

    // Produções por máquina
    const producoesPorMaquina = maquinas.map(maquina => {
      const producoesMaquina = dados.filter(p => p.maquinaId === maquina.id);
      return {
        nome: maquina.nome,
        quantidade: producoesMaquina.length,
        metragem: producoesMaquina.reduce((acc, p) => acc + (p.metragemProcessada || 0), 0),
      };
    }).filter(m => m.quantidade > 0);

    // Produções por operador
    const producoesPorOperador = operadores.map(operador => {
      const producoesOperador = dados.filter(p => p.operadorInicioId === operador.id);
      return {
        nome: operador.nome,
        quantidade: producoesOperador.length,
        metragem: producoesOperador.reduce((acc, p) => acc + (p.metragemProcessada || 0), 0),
      };
    }).filter(o => o.quantidade > 0);

    // Produções por dia
    const producoesPorDiaMap = new Map();
    dados.forEach(p => {
      if (p.dataFim) {
        const data = p.dataFim.split('T')[0];
        if (!producoesPorDiaMap.has(data)) {
          producoesPorDiaMap.set(data, { quantidade: 0, metragem: 0 });
        }
        const item = producoesPorDiaMap.get(data);
        item.quantidade++;
        item.metragem += p.metragemProcessada || 0;
      }
    });
    
    const producoesPorDia = Array.from(producoesPorDiaMap.entries())
      .map(([data, valores]) => ({
        data,
        quantidade: valores.quantidade,
        metragem: valores.metragem,
      }))
      .sort((a, b) => a.data.localeCompare(b.data));

    setRelatorio({
      totalProducoes,
      totalMetragem,
      tempoTotal,
      eficienciaMedia,
      producoesPorEstagio,
      producoesPorMaquina,
      producoesPorOperador,
      producoesPorDia,
    });

    setRelatorioOpen(true);
  }

  // Exportar para Excel (CSV)
  function exportarCSV() {
    const headers = ['OP', 'Produto', 'Máquina', 'Estágio', 'Operador', 'Início', 'Fim', 'Programado', 'Carregado', 'Processado', 'Reprocesso'];
    const linhas = producoesFiltradas.map(p => [
      p.op?.op,
      p.op?.produto,
      p.maquina?.nome,
      p.estagio?.nome,
      p.operadorInicio?.nome,
      formatDate(p.dataInicio),
      p.dataFim ? formatDate(p.dataFim) : 'Em andamento',
      p.metragemProgramada,
      p.op?.carregado,
      p.metragemProcessada,
      p.isReprocesso ? 'Sim' : 'Não',
    ]);

    const csv = [headers.join(','), ...linhas.map(l => l.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `producoes_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }

  // Exportar para PDF (via window.print)
  function exportarPDF() {
    window.print();
  }

  // Funções CRUD
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

  // Função para ordenar colunas
  function handleSort(key: string) {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  }

  // Colunas da tabela - COM SORT CLICÁVEL
  const columns = [
    {
      key: 'dataFim' as const,
      title: 'Status',
      sortable: false,
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
      sortable: true,
      format: (value: any) => value?.op || '-'
    },
    {
      key: 'maquina' as const,
      title: 'Máquina',
      sortable: true,
      format: (value: any) => value?.nome || '-'
    },
    {
      key: 'estagio' as const,
      title: 'Estágio',
      sortable: true,
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
      sortable: true,
      format: (value: any) => value?.nome || '-'
    },
    {
      key: 'dataInicio' as const,
      title: 'Início',
      sortable: true,
      format: (value: string) => formatDate(value)
    },
    {
      key: 'dataFim' as const,
      title: 'Fim',
      sortable: true,
      format: (value: string | null) => value ? formatDate(value) : 'Em andamento'
    },
    {
      key: 'metragemProgramada' as const,
      title: 'Programado',
      sortable: true,
      format: (value: number) => value ? formatNumber(value) : '-'
    },
    {
      key: 'op' as const,
      title: 'Carregado',
      sortable: true,
      format: (value: any) => value?.carregado ? formatNumber(value.carregado) : '-'
    },
    {
      key: 'metragemProcessada' as const,
      title: 'Processado',
      sortable: true,
      format: (value: number) => value ? formatNumber(value) : '-'
    },
    {
      key: 'isReprocesso' as const,
      title: 'Reprocesso',
      sortable: true,
      format: (value: boolean) => value ? '🔄 Sim' : '✅ Não'
    },
  ];

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
          {/* Barra de pesquisa rápida */}
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

          {/* Menu de exportação */}
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

          {/* Botão de relatório lean */}
          <Button variant="outline" onClick={gerarRelatorio} disabled={producoesFiltradas.length === 0}>
            <BarChart3 className="mr-2 h-4 w-4" /> Relatório Lean
          </Button>

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

      {/* Informações de filtro */}
      {searchTerm && (
        <div className="bg-blue-50 p-2 rounded-lg flex items-center justify-between">
          <p className="text-sm text-blue-700">
            Pesquisando por: <span className="font-medium">"{searchTerm}"</span> - {producoesFiltradas.length} resultado(s)
          </p>
          <Button variant="ghost" size="sm" onClick={() => setSearchTerm('')}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Paginação */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Mostrando {producoesFiltradas.length} de {pagination.total} produções
          {producoesFiltradas.length !== producoes.length && (
            <span className="ml-2 text-blue-600">(filtrados)</span>
          )}
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

      {/* Tabela com ordenação clicável */}
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
            {producoesFiltradas.map((producao) => (
              <tr
                key={producao.id}
                className="border-b hover:bg-gray-50 cursor-pointer"
                onClick={() => {
                  setSelectedProducao(producao);
                  setDetailsOpen(true);
                }}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-sm">
                    {col.format(producao[col.key as keyof Producao] as any)}
                  </td>
                ))}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
            {/* Filtro de Período */}
            <div className="space-y-2">
              <Label>Período</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Data Início</Label>
                  <Input
                    type="date"
                    value={filtros.dataInicio || ''}
                    onChange={(e) => setFiltros(prev => ({ ...prev, dataInicio: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Data Fim</Label>
                  <Input
                    type="date"
                    value={filtros.dataFim || ''}
                    onChange={(e) => setFiltros(prev => ({ ...prev, dataFim: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select 
                value={filtros.ativas === undefined ? '' : filtros.ativas} 
                onValueChange={(value) => setFiltros(prev => ({ ...prev, ativas: value || undefined }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="true">Em Andamento</SelectItem>
                  <SelectItem value="false">Finalizadas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>OP</Label>
              <Select 
                value={filtros.opId || ''} 
                onValueChange={(value) => setFiltros(prev => ({ ...prev, opId: value || undefined }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
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
                onValueChange={(value) => setFiltros(prev => ({ ...prev, maquinaId: value || undefined }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
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
                onValueChange={(value) => setFiltros(prev => ({ ...prev, estagioId: value || undefined }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
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
                onValueChange={(value) => setFiltros(prev => ({ ...prev, operadorId: value || undefined }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
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
            <Button variant="outline" onClick={() => { 
              setFiltros({}); 
              setFiltrosOpen(false);
              carregarProducoes(1);
            }}>
              Limpar
            </Button>
            <Button onClick={() => setFiltrosOpen(false)}>
              Aplicar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Relatório Lean */}
      <Dialog open={relatorioOpen} onOpenChange={setRelatorioOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Relatório Lean - Produções</DialogTitle>
            <DialogDescription>
              Análise baseada nos {producoesFiltradas.length} registros filtrados
            </DialogDescription>
          </DialogHeader>

          {relatorio && (
            <div className="space-y-8 py-4">
              {/* Cards de resumo */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-600 font-medium">Total Produções</p>
                  <p className="text-3xl font-bold">{relatorio.totalProducoes}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-600 font-medium">Metragem Total</p>
                  <p className="text-3xl font-bold">{formatNumber(relatorio.totalMetragem)} m</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-purple-600 font-medium">Tempo Total</p>
                  <p className="text-3xl font-bold">{Math.round(relatorio.tempoTotal)} min</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <p className="text-sm text-orange-600 font-medium">Eficiência Média</p>
                  <p className="text-3xl font-bold">{Math.round(relatorio.eficienciaMedia)} m/h</p>
                </div>
              </div>

              <Tabs defaultValue="estagios">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="estagios">Por Estágio</TabsTrigger>
                  <TabsTrigger value="maquinas">Por Máquina</TabsTrigger>
                  <TabsTrigger value="operadores">Por Operador</TabsTrigger>
                  <TabsTrigger value="dias">Por Dia</TabsTrigger>
                </TabsList>

                <TabsContent value="estagios" className="mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={relatorio.producoesPorEstagio}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={(entry) => `${entry.nome}: ${entry.quantidade}`}
                            outerRadius={80}
                            dataKey="quantidade"
                          >
                            {relatorio.producoesPorEstagio.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.cor || COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={relatorio.producoesPorEstagio}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="nome" angle={-45} textAnchor="end" height={80} />
                          <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" />
                          <YAxis yAxisId="right" orientation="right" stroke="#10b981" />
                          <Tooltip />
                          <Legend />
                          <Bar yAxisId="left" dataKey="quantidade" fill="#3b82f6" name="Quantidade" />
                          <Bar yAxisId="right" dataKey="metragem" fill="#10b981" name="Metragem (m)" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="maquinas" className="mt-4">
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={relatorio.producoesPorMaquina} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="nome" type="category" width={150} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="quantidade" fill="#3b82f6" name="Quantidade" />
                        <Bar dataKey="metragem" fill="#10b981" name="Metragem (m)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </TabsContent>

                <TabsContent value="operadores" className="mt-4">
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={relatorio.producoesPorOperador} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="nome" type="category" width={150} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="quantidade" fill="#f59e0b" name="Quantidade" />
                        <Bar dataKey="metragem" fill="#10b981" name="Metragem (m)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </TabsContent>

                <TabsContent value="dias" className="mt-4">
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={relatorio.producoesPorDia}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="data" angle={-45} textAnchor="end" height={80} />
                        <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" />
                        <YAxis yAxisId="right" orientation="right" stroke="#10b981" />
                        <Tooltip />
                        <Legend />
                        <Bar yAxisId="left" dataKey="quantidade" fill="#3b82f6" name="Quantidade" />
                        <Bar yAxisId="right" dataKey="metragem" fill="#10b981" name="Metragem (m)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}