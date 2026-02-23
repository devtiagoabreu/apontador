'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { toast } from '@/components/ui/use-toast';
import { 
  Plus, 
  RefreshCw, 
  Filter,
  ChevronLeft, 
  ChevronRight
} from 'lucide-react';
import { formatDate, formatNumber } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

// Interfaces
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

// Tipo para o formulário (sem id)
interface FormData {
  tipo: string;
  maquinaId: string;
  operadorInicioId: string;
  operadorFimId: string;
  dataInicio: string;
  dataFim: string;
  status: string;
  observacoes: string;
  opId: string;
  estagioId: string;
  metragemProcessada: string;
  isReprocesso: string;
  motivoParadaId: string;
}

// Colunas da tabela
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
  
  // Form state
  const [formData, setFormData] = useState<FormData>({
    tipo: 'PRODUCAO',
    maquinaId: '',
    operadorInicioId: '',
    operadorFimId: '',
    dataInicio: '',
    dataFim: '',
    status: 'EM_ANDAMENTO',
    observacoes: '',
    opId: '',
    estagioId: '',
    metragemProcessada: '',
    isReprocesso: 'false',
    motivoParadaId: '',
  });

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

  // FUNÇÃO DE SALVAR
  async function handleSubmit() {
    try {
      // Construir objeto no formato que funcionou na API
      const dadosParaEnviar: any = {
        tipo: formData.tipo,
        maquinaId: formData.maquinaId,
        operadorInicioId: formData.operadorInicioId,
        dataInicio: formData.dataInicio ? new Date(formData.dataInicio).toISOString() : new Date().toISOString(),
        dataFim: formData.dataFim ? new Date(formData.dataFim).toISOString() : new Date().toISOString(),
        status: formData.status,
        observacoes: formData.observacoes || null,
      };

      // Adicionar campos opcionais
      if (formData.operadorFimId) {
        dadosParaEnviar.operadorFimId = formData.operadorFimId;
      }

      // Campos específicos por tipo
      if (formData.tipo === 'PRODUCAO') {
        if (formData.opId) {
          dadosParaEnviar.opId = parseInt(formData.opId);
        }
        if (formData.estagioId) {
          dadosParaEnviar.estagioId = formData.estagioId;
        }
        if (formData.metragemProcessada) {
          dadosParaEnviar.metragemProcessada = parseFloat(formData.metragemProcessada);
        }
        if (formData.isReprocesso) {
          dadosParaEnviar.isReprocesso = formData.isReprocesso === 'true';
        }
      }

      if (formData.tipo === 'PARADA') {
        if (formData.motivoParadaId) {
          dadosParaEnviar.motivoParadaId = formData.motivoParadaId;
        }
        if (formData.opId) {
          dadosParaEnviar.opId = parseInt(formData.opId);
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
      console.log('📦 Resposta:', responseData);

      if (!response.ok) {
        throw new Error(responseData.error || 'Erro ao salvar');
      }

      toast({
        title: 'Sucesso',
        description: `Apontamento ${editMode ? 'atualizado' : 'criado'} com sucesso`,
      });

      // Reset e fechar modal
      setModalOpen(false);
      setSelectedApontamento(null);
      setFormData({
        tipo: 'PRODUCAO',
        maquinaId: '',
        operadorInicioId: '',
        operadorFimId: '',
        dataInicio: '',
        dataFim: '',
        status: 'EM_ANDAMENTO',
        observacoes: '',
        opId: '',
        estagioId: '',
        metragemProcessada: '',
        isReprocesso: 'false',
        motivoParadaId: '',
      });
      
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
      opId: apontamento.opId ? apontamento.opId.toString() : '',
      estagioId: apontamento.estagioId || '',
      metragemProcessada: apontamento.metragemProcessada?.toString() || '',
      isReprocesso: apontamento.isReprocesso ? 'true' : 'false',
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
      opId: '',
      estagioId: '',
      metragemProcessada: '',
      isReprocesso: 'false',
      motivoParadaId: '',
    });
    setModalOpen(true);
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
              const response = await fetch(`/api/apontamentos/${apontamento.id}`, { method: 'DELETE' });
              if (!response.ok) throw new Error('Erro ao excluir');
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
          <DialogHeader><DialogTitle>Detalhes</DialogTitle></DialogHeader>
          {selectedApontamento && (
            <div className="grid grid-cols-2 gap-4">
              <div><p className="font-medium">Tipo</p><p>{selectedApontamento.tipo}</p></div>
              <div><p className="font-medium">OP</p><p>{selectedApontamento.op?.op || '-'}</p></div>
              <div><p className="font-medium">Máquina</p><p>{selectedApontamento.maquina?.nome}</p></div>
              <div><p className="font-medium">Estágio</p>
                {selectedApontamento.estagio ? (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedApontamento.estagio.cor }} />
                    <span>{selectedApontamento.estagio.nome}</span>
                  </div>
                ) : '-'}
              </div>
              <div><p className="font-medium">Início</p><p>{formatDate(selectedApontamento.dataInicio)}</p></div>
              <div><p className="font-medium">Fim</p><p>{formatDate(selectedApontamento.dataFim)}</p></div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Filtros */}
      <Dialog open={filtrosOpen} onOpenChange={setFiltrosOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Filtros</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div><Label>Tipo</Label>
              <Select value={filtros.tipo || ''} onValueChange={(v) => setFiltros(p => ({...p, tipo: v}))}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="PRODUCAO">Produção</SelectItem>
                  <SelectItem value="PARADA">Parada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL PRINCIPAL - Criação/Edição */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editMode ? 'Editar' : 'Novo'} Apontamento</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Tipo */}
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={formData.tipo} onValueChange={(v) => setFormData({...formData, tipo: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRODUCAO">Produção</SelectItem>
                  <SelectItem value="PARADA">Parada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Campos de PRODUÇÃO */}
            {formData.tipo === 'PRODUCAO' && (
              <div className="grid grid-cols-2 gap-4 border-b pb-4">
                <div className="space-y-2">
                  <Label>OP *</Label>
                  <Select value={formData.opId} onValueChange={(v) => setFormData({...formData, opId: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a OP" />
                    </SelectTrigger>
                    <SelectContent>
                      {ops.map(op => (
                        <SelectItem key={op.op} value={op.op.toString()}>
                          OP {op.op} - {op.produto.substring(0, 20)}...
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Estágio *</Label>
                  <Select value={formData.estagioId} onValueChange={(v) => setFormData({...formData, estagioId: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o estágio" />
                    </SelectTrigger>
                    <SelectContent>
                      {estagios.map(e => (
                        <SelectItem key={e.id} value={e.id}>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: e.cor }} />
                            <span>{e.nome}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Campos de PARADA */}
            {formData.tipo === 'PARADA' && (
              <div className="border-b pb-4">
                <div className="space-y-2">
                  <Label>Motivo da Parada *</Label>
                  <Select value={formData.motivoParadaId} onValueChange={(v) => setFormData({...formData, motivoParadaId: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o motivo" />
                    </SelectTrigger>
                    <SelectContent>
                      {motivosParada.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.descricao}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Campos comuns */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Máquina *</Label>
                <Select value={formData.maquinaId} onValueChange={(v) => setFormData({...formData, maquinaId: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a máquina" />
                  </SelectTrigger>
                  <SelectContent>
                    {maquinas.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.nome} ({m.codigo})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Operador (Início) *</Label>
                <Select value={formData.operadorInicioId} onValueChange={(v) => setFormData({...formData, operadorInicioId: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o operador" />
                  </SelectTrigger>
                  <SelectContent>
                    {operadores.map(o => (
                      <SelectItem key={o.id} value={o.id}>{o.nome} ({o.matricula})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Operador (Fim) - opcional</Label>
                <Select value={formData.operadorFimId} onValueChange={(v) => setFormData({...formData, operadorFimId: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Opcional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum</SelectItem>
                    {operadores.map(o => (
                      <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Data Início *</Label>
                <Input
                  type="datetime-local"
                  value={formData.dataInicio}
                  onChange={(e) => setFormData({...formData, dataInicio: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label>Data Fim *</Label>
                <Input
                  type="datetime-local"
                  value={formData.dataFim}
                  onChange={(e) => setFormData({...formData, dataFim: e.target.value})}
                />
                <p className="text-xs text-gray-500">
                  Para novo apontamento, use a mesma data de início
                </p>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EM_ANDAMENTO">Em Andamento</SelectItem>
                    <SelectItem value="CONCLUIDO">Concluído</SelectItem>
                    <SelectItem value="CANCELADO">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.tipo === 'PRODUCAO' && (
                <>
                  <div className="space-y-2">
                    <Label>Metragem Processada</Label>
                    <Input
                      type="number"
                      value={formData.metragemProcessada}
                      onChange={(e) => setFormData({...formData, metragemProcessada: e.target.value})}
                      placeholder="Metragem (opcional)"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="reprocesso"
                      checked={formData.isReprocesso === 'true'}
                      onChange={(e) => setFormData({...formData, isReprocesso: e.target.checked ? 'true' : 'false'})}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="reprocesso">É Reprocesso?</Label>
                  </div>
                </>
              )}
            </div>

            {/* Observações */}
            <div className="space-y-2">
              <Label>Observações</Label>
              <Input
                value={formData.observacoes}
                onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                placeholder="Observações (opcional)"
              />
            </div>
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              {editMode ? 'Atualizar' : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}