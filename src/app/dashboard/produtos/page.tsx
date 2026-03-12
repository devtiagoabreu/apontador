// src/app/dashboard/produtos/page.tsx (manter essa linha de comentário)
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/components/ui/use-toast';
import { 
  Plus, 
  Save, 
  X, 
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  FileSpreadsheet,
  Filter,
  RefreshCw,
  Pencil,
  Trash2,
  BarChart3
} from 'lucide-react';
import { formatNumber } from '@/lib/utils';

interface Produto {
  id: string;
  codigo: string;
  nome: string;
  um: string;
  nivel?: string;
  grupo?: string;
  sub?: string;
  item?: string;
  composicao: any;
  largura: number;
  gramaturaLinear: number;
  gramaturaM2: number;
  tipoTecido: 'PLANO' | 'MALHA' | 'NAO_TECIDO';
  ligamento: string;
  fiosUrdume: number;
  fiosTrama: number;
  classificacaoPeso: 'LEVE' | 'MEDIO' | 'PESADO';
  parametrosEficiencia: any;
  metaDiaria?: number;
  metaMensal?: number;
  ativo: boolean;
  createdAt: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

interface Column {
  key: keyof Produto;
  title: string;
  sortable?: boolean;
  format?: (value: any) => React.ReactNode;
}

const COLORS = {
  'LEVE': 'bg-green-100 text-green-800',
  'MEDIO': 'bg-yellow-100 text-yellow-800',
  'PESADO': 'bg-red-100 text-red-800'
};

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [produtosFiltrados, setProdutosFiltrados] = useState<Produto[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProduto, setSelectedProduto] = useState<Produto | null>(null);
  const [activeTab, setActiveTab] = useState('basico');
  const [formData, setFormData] = useState<Partial<Produto>>({});
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'codigo', direction: 'asc' });
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  });

  useEffect(() => {
    carregarProdutos();
  }, []);

  useEffect(() => {
    if (selectedProduto) {
      setFormData(selectedProduto);
    } else {
      setFormData({
        codigo: '',
        nome: '',
        um: 'M',
        composicao: {
          algodao: { percentual: 0, fio: '' },
          poliester: { percentual: 0, fio: '' },
          elastano: { percentual: 0, fio: '' },
          linho: { percentual: 0, fio: '' },
          viscoso: { percentual: 0, fio: '' },
          acrilico: { percentual: 0, fio: '' }
        },
        largura: 0,
        gramaturaLinear: 0,
        gramaturaM2: 0,
        tipoTecido: 'PLANO',
        ligamento: 'TELA',
        fiosUrdume: 0,
        fiosTrama: 0,
        classificacaoPeso: 'MEDIO',
        parametrosEficiencia: {
          preparacao: { tempoPadrao: 0, rendimento: 100, velocidade: 0 },
          tingimento: { tempoPadrao: 0, rendimento: 100, velocidade: 0 },
          alvejamento: { tempoPadrao: 0, rendimento: 100, velocidade: 0 },
          secagem: { tempoPadrao: 0, rendimento: 100, velocidade: 0 },
          estamparia: { tempoPadrao: 0, rendimento: 100, velocidade: 0 },
          acabamento: { tempoPadrao: 0, rendimento: 100, velocidade: 0 },
          revisao: { tempoPadrao: 0, rendimento: 100, velocidade: 0 }
        },
        ativo: true
      });
    }
  }, [selectedProduto]);

  // Filtrar e ordenar localmente
  useEffect(() => {
    let dadosFiltrados = [...produtos];
    
    // Filtro de pesquisa global
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      dadosFiltrados = dadosFiltrados.filter(p => 
        p.codigo.toLowerCase().includes(term) ||
        p.nome.toLowerCase().includes(term) ||
        (p.classificacaoPeso && p.classificacaoPeso.toLowerCase().includes(term))
      );
    }

    // Ordenação
    dadosFiltrados.sort((a, b) => {
      let aVal: any = a[sortConfig.key as keyof Produto];
      let bVal: any = b[sortConfig.key as keyof Produto];

      if (aVal === null || aVal === undefined) aVal = '';
      if (bVal === null || bVal === undefined) bVal = '';

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    setProdutosFiltrados(dadosFiltrados);
  }, [produtos, searchTerm, sortConfig]);

  async function carregarProdutos(page: number = pagination.page) {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
      });

      const response = await fetch(`/api/produtos?${params}`);
      const result = await response.json();
      
      setProdutos(result.data);
      setPagination(result.pagination);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os produtos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  function handleSort(key: string) {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  }

  function calcularGramaturaM2() {
    if (formData.gramaturaLinear && formData.largura && formData.largura > 0) {
      const gramaturaM2 = formData.gramaturaLinear / formData.largura;
      setFormData(prev => ({
        ...prev,
        gramaturaM2,
        classificacaoPeso: gramaturaM2 < 130 ? 'LEVE' : gramaturaM2 > 220 ? 'PESADO' : 'MEDIO'
      }));
    }
  }

  function calcularPercentualTotal() {
    if (!formData.composicao) return 0;
    return Object.values(formData.composicao).reduce((acc: number, item: any) => acc + (item.percentual || 0), 0);
  }

  async function handleSubmit() {
    try {
      // Validar percentuais
      const totalPercentual = calcularPercentualTotal();
      if (totalPercentual > 100) {
        toast({
          title: 'Erro',
          description: 'A soma dos percentuais não pode ultrapassar 100%',
          variant: 'destructive',
        });
        return;
      }

      const url = selectedProduto ? `/api/produtos/${selectedProduto.id}` : '/api/produtos';
      const method = selectedProduto ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao salvar');
      }

      toast({
        title: 'Sucesso',
        description: `Produto ${selectedProduto ? 'atualizado' : 'criado'} com sucesso`,
      });

      setModalOpen(false);
      setSelectedProduto(null);
      await carregarProdutos(1);
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Não foi possível salvar o produto',
        variant: 'destructive',
      });
    }
  }

  async function handleDelete(produto: Produto) {
    if (!confirm(`Tem certeza que deseja excluir o produto ${produto.nome}?`)) return;

    try {
      const response = await fetch(`/api/produtos/${produto.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao excluir');
      }

      toast({
        title: 'Sucesso',
        description: 'Produto excluído com sucesso',
      });

      await carregarProdutos(1);
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Não foi possível excluir o produto',
        variant: 'destructive',
      });
    }
  }

  function exportarCSV() {
    const headers = ['Código', 'Nome', 'UM', 'Tipo', 'Peso', 'Status'];
    const linhas = produtosFiltrados.map(p => [
      p.codigo,
      p.nome,
      p.um,
      p.tipoTecido,
      p.classificacaoPeso,
      p.ativo ? 'Ativo' : 'Inativo'
    ]);

    const csv = [headers.join(','), ...linhas.map(l => l.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `produtos_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }

  function exportarPDF() {
    window.print();
  }

  // 🔴 CORREÇÃO: Definir colunas com tipagem correta
  const columns: Column[] = [
    { key: 'codigo', title: 'Código', sortable: true },
    { key: 'nome', title: 'Nome', sortable: true },
    { key: 'um', title: 'UM', sortable: true },
    { key: 'tipoTecido', title: 'Tipo', sortable: true },
    { 
      key: 'classificacaoPeso', 
      title: 'Peso',
      sortable: true,
      format: (value: string) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${COLORS[value as keyof typeof COLORS] || 'bg-gray-100'}`}>
          {value}
        </span>
      )
    },
    {
      key: 'ativo',
      title: 'Status',
      sortable: true,
      format: (value: boolean) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {value ? 'Ativo' : 'Inativo'}
        </span>
      )
    },
    {
      key: 'createdAt',
      title: 'Criado em',
      sortable: true,
      format: (value: string) => new Date(value).toLocaleDateString('pt-BR')
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Produtos</h1>
        <div className="flex gap-2">
          {/* Barra de pesquisa */}
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

          <Button variant="outline" onClick={() => carregarProdutos(1)} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>

          <Button onClick={() => {
            setSelectedProduto(null);
            setModalOpen(true);
          }}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Produto
          </Button>
        </div>
      </div>

      {searchTerm && (
        <div className="bg-blue-50 p-2 rounded-lg flex items-center justify-between">
          <p className="text-sm text-blue-700">
            Pesquisando por: <span className="font-medium">"{searchTerm}"</span> - {produtosFiltrados.length} resultado(s)
          </p>
          <Button variant="ghost" size="sm" onClick={() => setSearchTerm('')}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Paginação */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Mostrando {produtosFiltrados.length} de {pagination.total} produtos
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => carregarProdutos(pagination.page - 1)}
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
            onClick={() => carregarProdutos(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages || loading}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabela com ordenação - CORRIGIDA */}
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
            {produtosFiltrados.map((produto) => (
              <tr key={produto.id} className="border-b hover:bg-gray-50">
                {columns.map((col) => {
                  const value = produto[col.key];
                  // 🔴 CORREÇÃO: Usar type assertion seguro
                  const displayValue = value === null || value === undefined ? '-' : String(value);
                  
                  return (
                    <td key={col.key} className="px-4 py-3 text-sm">
                      {col.format ? col.format(value) : displayValue}
                    </td>
                  );
                })}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedProduto(produto);
                        setModalOpen(true);
                      }}
                      className="h-8 w-8 text-blue-600"
                      title="Editar Produto"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(produto)}
                      className="h-8 w-8 text-red-600"
                      title="Excluir Produto"
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

      {/* Modal de Produto */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedProduto ? 'Editar Produto' : 'Novo Produto'}
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="basico">Básico</TabsTrigger>
                <TabsTrigger value="composicao">Composição</TabsTrigger>
                <TabsTrigger value="dimensoes">Dimensões</TabsTrigger>
                <TabsTrigger value="estrutura">Estrutura</TabsTrigger>
                <TabsTrigger value="eficiencia">Eficiência</TabsTrigger>
              </TabsList>

              <TabsContent value="basico" className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="codigo">Código *</Label>
                    <Input
                      id="codigo"
                      value={formData.codigo || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, codigo: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="um">Unidade Medida *</Label>
                    <Input
                      id="um"
                      value={formData.um || 'M'}
                      onChange={(e) => setFormData(prev => ({ ...prev, um: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    value={formData.nome || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="nivel">Nível</Label>
                    <Input
                      id="nivel"
                      value={formData.nivel || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, nivel: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="grupo">Grupo</Label>
                    <Input
                      id="grupo"
                      value={formData.grupo || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, grupo: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sub">Sub</Label>
                    <Input
                      id="sub"
                      value={formData.sub || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, sub: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="item">Item</Label>
                    <Input
                      id="item"
                      value={formData.item || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, item: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-4">
                  <Switch
                    id="ativo"
                    checked={formData.ativo}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ativo: checked }))}
                  />
                  <Label htmlFor="ativo">Produto Ativo</Label>
                </div>
              </TabsContent>

              <TabsContent value="composicao" className="space-y-4 py-4">
                <div className="bg-blue-50 p-3 rounded-lg mb-4">
                  <p className="text-sm text-blue-700">
                    Total: {calcularPercentualTotal()}% {calcularPercentualTotal() > 100 && '(⚠️ Ultrapassou 100%)'}
                  </p>
                </div>

                {['algodao', 'poliester', 'elastano', 'linho', 'viscoso', 'acrilico'].map((comp) => (
                  <Card key={comp}>
                    <CardHeader className="py-3">
                      <CardTitle className="text-base capitalize">{comp}</CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Percentual (%)</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={formData.composicao?.[comp as keyof typeof formData.composicao]?.percentual || 0}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              composicao: {
                                ...prev.composicao!,
                                [comp]: {
                                  ...prev.composicao?.[comp as keyof typeof prev.composicao],
                                  percentual: Number(e.target.value)
                                }
                              }
                            }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Tipo de Fio</Label>
                          <Input
                            value={formData.composicao?.[comp as keyof typeof formData.composicao]?.fio || ''}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              composicao: {
                                ...prev.composicao!,
                                [comp]: {
                                  ...prev.composicao?.[comp as keyof typeof prev.composicao],
                                  fio: e.target.value
                                }
                              }
                            }))}
                            placeholder="ex: 20/1"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="dimensoes" className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="largura">Largura (m)</Label>
                    <Input
                      id="largura"
                      type="number"
                      step="0.01"
                      value={formData.largura || 0}
                      onChange={(e) => setFormData(prev => ({ ...prev, largura: Number(e.target.value) }))}
                      onBlur={calcularGramaturaM2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gramaturaLinear">Gramatura Linear (g/m)</Label>
                    <Input
                      id="gramaturaLinear"
                      type="number"
                      step="0.1"
                      value={formData.gramaturaLinear || 0}
                      onChange={(e) => setFormData(prev => ({ ...prev, gramaturaLinear: Number(e.target.value) }))}
                      onBlur={calcularGramaturaM2}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Gramatura m² (g/m²)</Label>
                    <Input
                      type="number"
                      value={formData.gramaturaM2?.toFixed(2) || '0'}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Classificação</Label>
                    <Input
                      value={formData.classificacaoPeso || 'MEDIO'}
                      disabled
                      className="bg-gray-50 font-medium"
                    />
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg mt-4">
                  <p className="text-sm text-gray-600">
                    <strong>💡 Dica:</strong> Tecidos com gramatura {'<'}130 g/m² são considerados 
                    <span className="text-green-600 font-medium"> LEVES</span> (velocidade +20%), 
                    entre 130-220 g/m² <span className="text-yellow-600 font-medium"> MÉDIOS</span> (velocidade padrão) 
                    e {'>'}220 g/m² <span className="text-red-600 font-medium"> PESADOS</span> (velocidade -30%).
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="estrutura" className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tipoTecido">Tipo de Tecido</Label>
                    <select
                      id="tipoTecido"
                      className="w-full rounded-md border border-input bg-background px-3 py-2"
                      value={formData.tipoTecido || 'PLANO'}
                      onChange={(e) => setFormData(prev => ({ ...prev, tipoTecido: e.target.value as any }))}
                    >
                      <option value="PLANO">Plano</option>
                      <option value="MALHA">Malha</option>
                      <option value="NAO_TECIDO">Não Tecido</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ligamento">Ligamento</Label>
                    <Input
                      id="ligamento"
                      value={formData.ligamento || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, ligamento: e.target.value }))}
                      placeholder="ex: TELA, SARJA, SEDA"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fiosUrdume">Fios Urdume (fios/cm²)</Label>
                    <Input
                      id="fiosUrdume"
                      type="number"
                      value={formData.fiosUrdume || 0}
                      onChange={(e) => setFormData(prev => ({ ...prev, fiosUrdume: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fiosTrama">Fios Trama (fios/cm²)</Label>
                    <Input
                      id="fiosTrama"
                      type="number"
                      value={formData.fiosTrama || 0}
                      onChange={(e) => setFormData(prev => ({ ...prev, fiosTrama: Number(e.target.value) }))}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="eficiencia" className="space-y-4 py-4">
                {['preparacao', 'tingimento', 'alvejamento', 'secagem', 'estamparia', 'acabamento', 'revisao'].map((estagio) => (
                  <Card key={estagio}>
                    <CardHeader className="py-3">
                      <CardTitle className="text-base capitalize">{estagio}</CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Tempo Padrão (min/m)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={formData.parametrosEficiencia?.[estagio as keyof typeof formData.parametrosEficiencia]?.tempoPadrao || 0}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              parametrosEficiencia: {
                                ...prev.parametrosEficiencia!,
                                [estagio]: {
                                  ...prev.parametrosEficiencia?.[estagio as keyof typeof prev.parametrosEficiencia],
                                  tempoPadrao: Number(e.target.value)
                                }
                              }
                            }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Rendimento (%)</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={formData.parametrosEficiencia?.[estagio as keyof typeof formData.parametrosEficiencia]?.rendimento || 100}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              parametrosEficiencia: {
                                ...prev.parametrosEficiencia!,
                                [estagio]: {
                                  ...prev.parametrosEficiencia?.[estagio as keyof typeof prev.parametrosEficiencia],
                                  rendimento: Number(e.target.value)
                                }
                              }
                            }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Velocidade (m/min)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={formData.parametrosEficiencia?.[estagio as keyof typeof formData.parametrosEficiencia]?.velocidade || 0}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              parametrosEficiencia: {
                                ...prev.parametrosEficiencia!,
                                [estagio]: {
                                  ...prev.parametrosEficiencia?.[estagio as keyof typeof prev.parametrosEficiencia],
                                  velocidade: Number(e.target.value)
                                }
                              }
                            }))}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-3 pt-6 border-t mt-6">
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit}>
                <Save className="mr-2 h-4 w-4" />
                Salvar Produto
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}