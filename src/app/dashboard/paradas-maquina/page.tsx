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

// Interfaces
interface Parada {
  id: string;
  maquinaId: string;
  operadorId: string;
  motivoParadaId: string;
  observacoes: string | null;
  dataInicio: string;
  dataFim: string | null;
  opId: number | null;
  
  // Relacionamentos (opcionais)
  maquinaNome?: string;
  maquinaCodigo?: string;
  operadorNome?: string;
  operadorMatricula?: string;
  motivoDescricao?: string;
  motivoCodigo?: string;
  opNumero?: number;
  opProduto?: string;
}

interface Maquina {
  id: string;        // ← UUID
  nome: string;
  codigo: string;
  status: string;
}

interface Usuario {
  id: string;        // ← UUID
  nome: string;
  matricula: string;
}

interface MotivoParada {
  id: string;        // ← UUID
  codigo: string;
  descricao: string;
}

interface OP {
  op: number;        // ← Número da OP (não é UUID)
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

// Colunas da tabela
const columns = [
  {
    key: 'dataFim' as const,
    title: 'Status',
    format: (value: string | null) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        !value ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
      }`}>
        {!value ? '⏸️ Em Parada' : '✅ Finalizada'}
      </span>
    )
  },
  {
    key: 'maquinaNome' as const,
    title: 'Máquina',
    format: (value: string) => value || '-'
  },
  {
    key: 'motivoDescricao' as const,
    title: 'Motivo',
    format: (value: string) => value || '-'
  },
  {
    key: 'operadorNome' as const,
    title: 'Operador',
    format: (value: string) => value || '-'
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
    key: 'opNumero' as const,
    title: 'OP Vinculada',
    format: (value: number) => value ? `OP ${value}` : '-'
  },
];

export default function ParadasMaquinaPage() {
  // States
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

  // Carregar dados iniciais (TODOS OS UUIDs)
  useEffect(() => {
    carregarDados();
  }, []);

  useEffect(() => {
    carregarParadas(1);
  }, []);

  async function carregarDados() {
    try {
      console.log('🔄 Carregando dados para comboboxes...');
      
      const [maquinasRes, operadoresRes, motivosRes, opsRes] = await Promise.all([
        fetch('/api/maquinas'),
        fetch('/api/usuarios?nivel=OPERADOR'),
        fetch('/api/motivos-parada'),
        fetch('/api/ops?limit=1000'),
      ]);

      const maquinasData = await maquinasRes.json();
      const operadoresData = await operadoresRes.json();
      const motivosData = await motivosRes.json();
      const opsData = await opsRes.json();

      console.log('✅ Máquinas carregadas:', maquinasData.length, 'itens');
      console.log('✅ Operadores carregados:', operadoresData.length, 'itens');
      console.log('✅ Motivos carregados:', motivosData.length, 'itens');
      console.log('✅ OPs carregadas:', opsData.data?.length || opsData.length, 'itens');

      setMaquinas(maquinasData);
      setOperadores(operadoresData);
      setMotivos(motivosData);
      setOps(opsData.data || opsData);
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados para o formulário',
        variant: 'destructive',
      });
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
      
      // Transformar os dados para o formato esperado pelo componente
      const dadosFormatados = result.data.map((item: any) => ({
        id: item.id,
        maquinaId: item.maquinaId,
        operadorId: item.operadorId,
        motivoParadaId: item.motivoParadaId,
        observacoes: item.observacoes,
        dataInicio: item.dataInicio,
        dataFim: item.dataFim,
        opId: item.opId,
        // Campos do join
        maquinaNome: item.maquina?.nome,
        maquinaCodigo: item.maquina?.codigo,
        operadorNome: item.operador?.nome,
        operadorMatricula: item.operador?.matricula,
        motivoDescricao: item.motivo?.descricao,
        motivoCodigo: item.motivo?.codigo,
        opNumero: item.op?.op,
        opProduto: item.op?.produto,
      }));
      
      setParadas(dadosFormatados);
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
      console.log('📦 Enviando dados do formulário:', data);

      // Validar se os UUIDs são válidos
      if (!data.maquinaId || !data.operadorId || !data.motivoParadaId) {
        toast({
          title: 'Erro',
          description: 'Todos os campos obrigatórios devem ser preenchidos',
          variant: 'destructive',
        });
        return;
      }

      const dadosParaEnviar = {
        maquinaId: data.maquinaId,        // ← UUID real
        operadorId: data.operadorId,      // ← UUID real
        motivoParadaId: data.motivoParadaId, // ← UUID real
        dataInicio: new Date(data.dataInicio).toISOString(),
        observacoes: data.observacoes || null,
        opId: data.opId ? parseInt(data.opId) : null,
      };

      console.log('📦 Dados preparados para API:', dadosParaEnviar);

      const response = await fetch('/api/paradas-maquina', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dadosParaEnviar),
      });

      const responseData = await response.json();
      console.log('📦 Resposta da API:', responseData);

      if (!response.ok) {
        throw new Error(responseData.error || 'Erro ao salvar');
      }

      toast({
        title: 'Sucesso',
        description: 'Parada registrada com sucesso',
      });

      setModalOpen(false);
      setFormData({});
      await carregarParadas(1);
    } catch (error) {
      console.error('❌ Erro:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao salvar',
        variant: 'destructive',
      });
    }
  }

  async function handleFinalizarParada(parada: Parada) {
    try {
      const response = await fetch(`/api/paradas-maquina/${parada.id}/finalizar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataFim: new Date().toISOString(),
        }),
      });

      if (!response.ok) throw new Error('Erro ao finalizar');

      toast({
        title: 'Sucesso',
        description: 'Parada finalizada com sucesso',
      });

      await carregarParadas(pagination.page);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao finalizar parada',
        variant: 'destructive',
      });
    }
  }

  // CAMPOS DO FORMULÁRIO COM TODOS OS UUIDs
  const formFields = [
    {
      name: 'maquinaId',
      label: 'Máquina',
      type: 'select' as const,
      required: true,
      options: maquinas.map(m => ({ 
        value: m.id,        // ← UUID real da máquina
        label: `${m.codigo} - ${m.nome}` 
      }))
    },
    {
      name: 'operadorId',
      label: 'Operador',
      type: 'select' as const,
      required: true,
      options: operadores.map(o => ({ 
        value: o.id,         // ← UUID real do operador
        label: `${o.matricula} - ${o.nome}` 
      }))
    },
    {
      name: 'motivoParadaId',
      label: 'Motivo da Parada',
      type: 'select' as const,
      required: true,
      options: motivos.map(m => ({ 
        value: m.id,         // ← UUID real do motivo
        label: `${m.codigo} - ${m.descricao}` 
      }))
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
        ...ops.map(op => ({ 
          value: op.op.toString(),  // ← Número da OP (não é UUID)
          label: `OP ${op.op} - ${op.produto.substring(0, 30)}` 
        }))
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
      {/* Cabeçalho */}
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

      {/* Paginação */}
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

      {/* Tabela */}
      <DataTable
        data={paradas}
        columns={columns}
        onRowClick={(parada) => {
          setSelectedParada(parada);
        }}
        extraActions={(parada) => !parada.dataFim ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleFinalizarParada(parada)}
            className="h-8 w-8 text-green-600"
            title="Finalizar Parada"
          >
            <Play className="h-4 w-4" />
          </Button>
        ) : null}
      />

      {/* Modal com formulário */}
      <FormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedParada(null);
          setFormData({});
        }}
        onSubmit={handleSubmit}
        title="Nova Parada"
        fields={formFields}
        initialData={{}}
        schema={paradaSchema}
      />
    </div>
  );
}