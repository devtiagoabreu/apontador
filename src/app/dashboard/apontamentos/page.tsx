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

// Interfaces (manter iguais)
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
  const [debugResponse, setDebugResponse] = useState<any>(null);
  const [debugStatus, setDebugStatus] = useState<number | null>(null);

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

  async function handleSubmit() {
    setDebugResponse(null);
    setDebugStatus(null);

    try {
      // Construir objeto com os dados atuais do formulário
      const dadosParaEnviar: any = {
        tipo: formData.tipo,
        maquinaId: formData.maquinaId,
        operadorInicioId: formData.operadorInicioId,
        dataInicio: formData.dataInicio ? new Date(formData.dataInicio).toISOString() : new Date().toISOString(),
        dataFim: formData.dataFim ? new Date(formData.dataFim).toISOString() : new Date().toISOString(),
        status: formData.status || 'EM_ANDAMENTO',
        observacoes: formData.observacoes || null,
      };

      if (formData.operadorFimId) {
        dadosParaEnviar.operadorFimId = formData.operadorFimId;
      }

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
        if (formData.isReprocesso !== undefined) {
          dadosParaEnviar.isReprocesso = formData.isReprocesso === 'true' || formData.isReprocesso === true;
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

      console.log('📦 Dados a serem enviados:', JSON.stringify(dadosParaEnviar, null, 2));

      const url = editMode && selectedApontamento 
        ? `/api/apontamentos/${selectedApontamento.id}` 
        : '/api/apontamentos';
      
      const method = editMode ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dadosParaEnviar),
      });

      setDebugStatus(response.status);

      const responseText = await response.text();
      let responseJson;
      try {
        responseJson = JSON.parse(responseText);
      } catch {
        responseJson = { raw: responseText };
      }

      setDebugResponse(responseJson);

      if (!response.ok) {
        throw new Error(responseJson.error || 'Erro ao salvar');
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
      console.error('Erro:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao salvar',
        variant: 'destructive',
      });
    }
  }

  const openEditModal = (apontamento: Apontamento) => {
    console.log('Editando:', apontamento);
    
    const dados = {
      id: apontamento.id,
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
    };
    
    setSelectedApontamento(apontamento);
    setFormData(dados);
    setEditMode(true);
    setModalOpen(true);
  };

  const handleNovoApontamento = () => {
    const agora = new Date().toISOString().slice(0, 16);
    
    setEditMode(false);
    setSelectedApontamento(null);
    setFormData({ 
      tipo: 'PRODUCAO',
      dataInicio: agora,
      dataFim: agora,
      status: 'EM_ANDAMENTO',
      isReprocesso: 'false'
    });
    setModalOpen(true);
  };

  return (
    <div className="space-y-6 p-6">
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
              const response = await fetch(`/api/apontamentos/${apontamento.id}`, { 
                method: 'DELETE' 
              });
              
              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Erro ao excluir');
              }
              
              toast({ 
                title: 'Sucesso', 
                description: 'Apontamento excluído com sucesso' 
              });
              
              carregarApontamentos(pagination.page);
            } catch (error) {
              toast({ 
                title: 'Erro', 
                description: error instanceof Error ? error.message : 'Erro ao excluir', 
                variant: 'destructive' 
              });
            }
          }
        }}
      />

      {/* Modal de Detalhes (simplificado) */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Detalhes</DialogTitle></DialogHeader>
          {selectedApontamento && (
            <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-xs">
              {JSON.stringify(selectedApontamento, null, 2)}
            </pre>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Filtros (simplificado) */}
      <Dialog open={filtrosOpen} onOpenChange={setFiltrosOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Filtros</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
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
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => { setFiltros({}); setFiltrosOpen(false); }}>Limpar</Button>
            <Button onClick={() => setFiltrosOpen(false)}>Aplicar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Criação/Edição - VERSÃO DE DIAGNÓSTICO */}
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

            {/* Máquina */}
            <div className="space-y-2">
              <Label>Máquina</Label>
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

            {/* Operador Início */}
            <div className="space-y-2">
              <Label>Operador (Início)</Label>
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

            {/* Operador Fim */}
            <div className="space-y-2">
              <Label>Operador (Fim) - opcional</Label>
              <Select value={formData.operadorFimId || ''} onValueChange={(v) => setFormData({...formData, operadorFimId: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o operador (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum</SelectItem>
                  {operadores.map(o => (
                    <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Data Início */}
            <div className="space-y-2">
              <Label>Data Início</Label>
              <Input
                type="datetime-local"
                value={formData.dataInicio || ''}
                onChange={(e) => setFormData({...formData, dataInicio: e.target.value})}
              />
            </div>

            {/* Data Fim */}
            <div className="space-y-2">
              <Label>Data Fim</Label>
              <Input
                type="datetime-local"
                value={formData.dataFim || ''}
                onChange={(e) => setFormData({...formData, dataFim: e.target.value})}
              />
            </div>

            {/* Status */}
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

            {/* Observações */}
            <div className="space-y-2">
              <Label>Observações</Label>
              <Input
                value={formData.observacoes || ''}
                onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                placeholder="Observações (opcional)"
              />
            </div>

            {/* Campos específicos para PRODUÇÃO */}
            {formData.tipo === 'PRODUCAO' && (
              <>
                <div className="space-y-2">
                  <Label>OP</Label>
                  <Select value={formData.opId || ''} onValueChange={(v) => setFormData({...formData, opId: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a OP" />
                    </SelectTrigger>
                    <SelectContent>
                      {ops.map(op => (
                        <SelectItem key={op.op} value={op.op.toString()}>OP {op.op}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Estágio</Label>
                  <Select value={formData.estagioId || ''} onValueChange={(v) => setFormData({...formData, estagioId: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o estágio" />
                    </SelectTrigger>
                    <SelectContent>
                      {estagios.map(e => (
                        <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Metragem Processada</Label>
                  <Input
                    type="number"
                    value={formData.metragemProcessada || ''}
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

            {/* Campos específicos para PARADA */}
            {formData.tipo === 'PARADA' && (
              <>
                <div className="space-y-2">
                  <Label>Motivo da Parada</Label>
                  <Select value={formData.motivoParadaId || ''} onValueChange={(v) => setFormData({...formData, motivoParadaId: v})}>
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

                <div className="space-y-2">
                  <Label>OP Vinculada (opcional)</Label>
                  <Select value={formData.opId || ''} onValueChange={(v) => setFormData({...formData, opId: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a OP (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhuma</SelectItem>
                      {ops.map(op => (
                        <SelectItem key={op.op} value={op.op.toString()}>OP {op.op}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* DEBUG: Mostrar dados atuais */}
            <div className="border-t pt-4 mt-4">
              <h3 className="font-medium mb-2">Dados a serem enviados:</h3>
              <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-40">
                {JSON.stringify(formData, null, 2)}
              </pre>
            </div>

            {/* DEBUG: Mostrar resposta da API */}
            {(debugStatus || debugResponse) && (
              <div className="border-t pt-4 mt-4">
                <h3 className="font-medium mb-2">
                  Resposta da API (Status: {debugStatus}):
                </h3>
                <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-40">
                  {JSON.stringify(debugResponse, null, 2)}
                </pre>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}