// src/app/dashboard/producao-avulsa/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { FormModal } from '@/components/ui/form-modal';
import { toast } from '@/components/ui/use-toast';
import { 
  Search, Download, FileText, FileSpreadsheet, 
  RefreshCw, BarChart3, CheckCircle, Pencil, Trash2, Clock, Eye 
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription 
} from '@/components/ui/dialog';
import { formatDate, formatNumber } from '@/lib/utils';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

export default function ProducaoAvulsaAdminPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [modalEditOpen, setModalEditOpen] = useState(false);
  const [selectedProducao, setSelectedProducao] = useState<any>(null);
  const [sortConfig, setSortConfig] = useState({ key: 'data_inicio', direction: 'desc' });
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });

  async function carregarDados(page = 1) {
    setLoading(true);
    try {
      const res = await fetch(`/api/producoes-avulsas?page=${page}&limit=50`);
      const result = await res.json();
      setData(result.data || []);
      setPagination(result.pagination);
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha ao carregar produções', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { carregarDados(1); }, []);

  // Ordenação manual para simular o comportamento da tela de produções [4]
  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const dadosOrdenados = [...data].sort((a: any, b: any) => {
    const aVal = a[sortConfig.key] || '';
    const bVal = b[sortConfig.key] || '';
    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  // Definição das colunas conforme solicitado [5-7]
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
    { key: 'produto_codigo', title: 'OP (Produto)', sortable: true },
    { key: 'maquina_nome', title: 'Máquina', sortable: true },
    { key: 'estagio_nome', title: 'Estágio', sortable: true },
    { key: 'operador_inicio_nome', title: 'Operador', sortable: true },
    { key: 'data_inicio', title: 'Início', format: (val: string) => formatDate(val), sortable: true },
    { key: 'data_fim', title: 'Fim', format: (val: string) => val ? formatDate(val) : '-' },
  ];

  const handleExcluir = async (id: string) => {
    if (!confirm('Deseja excluir este registro permanentemente?')) return;
    try {
      const res = await fetch(`/api/producoes-avulsas/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast({ title: 'Sucesso', description: 'Registro excluído' });
        carregarDados();
      }
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha ao excluir', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold italic text-primary">Produção Avulsa</h1>
        <div className="flex gap-2">
          <Input 
            placeholder="Pesquisar..." 
            className="w-64" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Button onClick={() => carregarDados(1)} variant="outline">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <DataTable 
        data={dadosOrdenados.filter((i: any) => i.produto_codigo.toLowerCase().includes(searchTerm.toLowerCase()))} 
        columns={columns}
        onRowClick={(item) => {
          setSelectedProducao(item);
          setDetailsOpen(true);
        }}
        extraActions={(item: any) => (
          <div className="flex items-center gap-1">
            {!item.data_fim && (
              <Button size="icon" variant="ghost" className="text-green-600" title="Finalizar">
                <CheckCircle className="h-4 w-4" />
              </Button>
            )}
            <Button size="icon" variant="ghost" className="text-blue-600" title="Editar">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" className="text-red-600" onClick={() => handleExcluir(item.id)} title="Excluir">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      />

      {/* Modal de Detalhes Estilo Tela de Produções [8, 9] */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Produção Avulsa</DialogTitle>
          </DialogHeader>
          
          {selectedProducao && (
            <div className="grid grid-cols-2 gap-6 py-4">
              <div className="space-y-1">
                <p className="text-xs font-bold text-gray-400 uppercase">Produto / Portada</p>
                <p className="text-sm font-semibold text-primary">{selectedProducao.produto_codigo}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-gray-400 uppercase">Status</p>
                <p className="text-sm font-semibold">{selectedProducao.status}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-gray-400 uppercase">Máquina</p>
                <p className="text-sm font-semibold">{selectedProducao.maquina_nome}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-gray-400 uppercase">Estágio</p>
                <p className="text-sm font-semibold">{selectedProducao.estagio_nome}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-gray-400 uppercase">Operador Início</p>
                <p className="text-sm font-semibold">{selectedProducao.operador_inicio_nome}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-gray-400 uppercase">Metragem Final</p>
                <p className="text-sm font-semibold">{selectedProducao.metragem ? `${formatNumber(selectedProducao.metragem)} m` : 'Pendente'}</p>
              </div>
              <div className="space-y-1 border-t pt-2">
                <p className="text-xs font-bold text-gray-400 uppercase">Data Início</p>
                <p className="text-sm font-medium flex items-center gap-2"><Clock size={14}/> {formatDate(selectedProducao.data_inicio)}</p>
              </div>
              <div className="space-y-1 border-t pt-2">
                <p className="text-xs font-bold text-gray-400 uppercase">Data Fim</p>
                <p className="text-sm font-medium flex items-center gap-2"><CheckCircle size={14}/> {selectedProducao.data_fim ? formatDate(selectedProducao.data_fim) : 'Em aberto'}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}