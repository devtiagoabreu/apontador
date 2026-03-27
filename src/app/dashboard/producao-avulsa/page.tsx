// src/app/dashboard/producao-avulsa/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { toast } from '@/components/ui/use-toast';
import { 
  Search, Download, FileText, FileSpreadsheet, 
  RefreshCw, BarChart3 
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription 
} from '@/components/ui/dialog';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { formatDate, formatNumber } from '@/lib/utils';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

export default function ProducaoAvulsaAdminPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [relatorioOpen, setRelatorioOpen] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });

  // 1. Busca os dados na API (mantendo o endpoint plural que é o padrão do backend)
  async function carregarDados(page = 1) {
    setLoading(true);
    try {
      const res = await fetch(`/api/producoes-avulsas?page=${page}&limit=50`);
      const result = await res.json();
      setData(result.data || []);
      setPagination(result.pagination);
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha ao carregar produções avulsas', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { carregarDados(1); }, []);

  // 2. Colunas padronizadas conforme o DataTable do sistema [7, 8]
  const columns = [
    {
      key: 'status' as const,
      title: 'Status',
      format: (val: string) => (
        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
          val === 'EM_ANDAMENTO' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
        }`}>
          {val === 'EM_ANDAMENTO' ? 'PRODUZINDO' : 'FINALIZADO'}
        </span>
      )
    },
    { key: 'produto_codigo', title: 'Cód. Produto' },
    { key: 'produto_nome', title: 'Produto' },
    { key: 'maquina_nome', title: 'Máquina' },
    { key: 'estagio_nome', title: 'Estágio' },
    { key: 'operador_inicio_nome', title: 'Operador' },
    { 
      key: 'data_inicio', 
      title: 'Início', 
      format: (val: string) => formatDate(val) 
    },
    { 
      key: 'metragem', 
      title: 'Produzido', 
      format: (val: number) => val ? `${formatNumber(val)} m` : '-' 
    }
  ];

  const exportarCSV = () => {
    const headers = ['Produto', 'Máquina', 'Estágio', 'Operador', 'Início', 'Fim', 'Metragem'];
    const rows = data.map((p: any) => [
      p.produto_codigo, p.maquina_nome, p.estagio_nome, p.operador_inicio_nome,
      formatDate(p.data_inicio), p.data_fim ? formatDate(p.data_fim) : 'Ativo', p.metragem || 0
    ]);
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `producao_avulsa_${new Date().getTime()}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold italic text-primary">Produção Avulsa</h1>
        
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Pesquisar..." 
              className="pl-10 w-64" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Exportar</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={exportarCSV}><FileSpreadsheet className="mr-2 h-4 w-4" /> Excel (CSV)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.print()}><FileText className="mr-2 h-4 w-4" /> PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" onClick={() => setRelatorioOpen(true)}>
            <BarChart3 className="mr-2 h-4 w-4" /> Relatório Lean
          </Button>

          <Button variant="outline" onClick={() => carregarDados(1)} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <DataTable 
        data={data.filter((i: any) => i.produto_codigo.toLowerCase().includes(searchTerm.toLowerCase()))} 
        columns={columns} 
      />

      <Dialog open={relatorioOpen} onOpenChange={setRelatorioOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Análise de Produtividade Avulsa</DialogTitle>
            <DialogDescription>Volume de metros processados sem Ordem de Produção</DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-3 gap-4 py-4">
             <div className="bg-blue-50 p-4 rounded-lg text-center border border-blue-100">
                <p className="text-xs text-blue-600 font-bold uppercase">Total Registros</p>
                <p className="text-2xl font-black">{data.length}</p>
             </div>
             <div className="bg-green-50 p-4 rounded-lg text-center border border-green-100">
                <p className="text-xs text-green-600 font-bold uppercase">Total Geral (m)</p>
                <p className="text-2xl font-black">
                  {formatNumber(data.reduce((acc, curr: any) => acc + Number(curr.metragem || 0), 0))}
                </p>
             </div>
             <div className="bg-purple-50 p-4 rounded-lg text-center border border-purple-100">
                <p className="text-xs text-purple-600 font-bold uppercase">Ativos agora</p>
                <p className="text-2xl font-black">
                  {data.filter((i: any) => i.status === 'EM_ANDAMENTO').length}
                </p>
             </div>
          </div>

          <div className="h-72 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="produto_codigo" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip cursor={{fill: '#f3f4f6'}} />
                <Bar dataKey="metragem" fill="#3b82f6" radius={9} name="Metros" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}