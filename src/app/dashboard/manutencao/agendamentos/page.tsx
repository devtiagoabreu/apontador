// src/app/dashboard/manutencao/agendamentos/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { toast } from '@/components/ui/use-toast';
import { Eye, XCircle, RefreshCw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import { Textarea } from '@/components/ui/textarea';
import { formatDate } from '@/lib/utils';

interface Agendamento {
  id: string;
  maquinaId: string;
  maquinaNome?: string;
  maquinaCodigo?: string;
  tipoNome?: string;
  atividadeNome?: string;
  periodicidade: string;
  dataPrevista: string;
  status: string;
  observacoes?: string;
}

interface Maquina {
  id: string;
  codigo: string;
  nome: string;
}

const statusOptions = [
  { value: 'AGENDADO', label: 'Agendado' },
  { value: 'EM_ANDAMENTO', label: 'Em Andamento' },
  { value: 'CONCLUIDO', label: 'Concluído' },
  { value: 'CANCELADO', label: 'Cancelado' },
];

export default function AgendamentosManutencaoPage() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [maquinas, setMaquinas] = useState<Maquina[]>([]);
  const [carregando, setCarregando] = useState(true);

  // Filtros
  const [filtroStatus, setFiltroStatus] = useState<string>('AGENDADO');
  const [filtroMaquina, setFiltroMaquina] = useState<string>('todas');
  const [filtroData, setFiltroData] = useState<string>('');

  // Detalhe
  const [detalhe, setDetalhe] = useState<Agendamento | null>(null);
  const [detalheOpen, setDetalheOpen] = useState(false);

  // Cancelamento
  const [cancelar, setCancelar] = useState<Agendamento | null>(null);
  const [cancelarOpen, setCancelarOpen] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [salvando, setSalvando] = useState(false);

  const carregarAgendamentos = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set('limit', '500');
      if (filtroStatus !== 'todos') params.set('status', filtroStatus);
      if (filtroMaquina !== 'todas') params.set('maquinaId', filtroMaquina);

      const response = await fetch(`/api/agendamentos-manutencao?${params.toString()}`);
      const data = await response.json();
      let lista = data || [];

      // Filtro por data (client-side, pois a API não filtra por data)
      if (filtroData) {
        const alvo = new Date(filtroData);
        alvo.setHours(0, 0, 0, 0);
        const fimDia = new Date(alvo);
        fimDia.setDate(fimDia.getDate() + 1);
        lista = lista.filter((a: Agendamento) => {
          const d = new Date(a.dataPrevista);
          return d >= alvo && d < fimDia;
        });
      }

      setAgendamentos(lista);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os agendamentos',
        variant: 'destructive',
      });
    } finally {
      setCarregando(false);
    }
  }, [filtroStatus, filtroMaquina, filtroData]);

  const carregarMaquinas = useCallback(async () => {
    try {
      const response = await fetch('/api/maquinas');
      const data = await response.json();
      setMaquinas(data || []);
    } catch (error) {
      console.error('Erro ao carregar máquinas:', error);
    }
  }, []);

  useEffect(() => {
    carregarAgendamentos();
  }, [carregarAgendamentos]);

  useEffect(() => {
    carregarMaquinas();
  }, [carregarMaquinas]);

  async function handleCancelar() {
    if (!cancelar) return;
    setSalvando(true);
    try {
      const response = await fetch(`/api/agendamentos-manutencao/${cancelar.id}/cancelar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ observacoes: motivo }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao cancelar');
      }

      toast({ title: 'Sucesso', description: 'Agendamento cancelado' });
      setCancelarOpen(false);
      setMotivo('');
      setCancelar(null);
      carregarAgendamentos();
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao cancelar',
        variant: 'destructive',
      });
    } finally {
      setSalvando(false);
    }
  }

  function statusBadge(status: string) {
    const config: Record<string, string> = {
      AGENDADO: 'bg-blue-100 text-blue-800',
      EM_ANDAMENTO: 'bg-yellow-100 text-yellow-800',
      CONCLUIDO: 'bg-green-100 text-green-800',
      CANCELADO: 'bg-red-100 text-red-800',
    };
    const labels: Record<string, string> = {
      AGENDADO: 'Agendado',
      EM_ANDAMENTO: 'Em Andamento',
      CONCLUIDO: 'Concluído',
      CANCELADO: 'Cancelado',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
      </span>
    );
  }

  const columns = [
    { key: 'maquinaNome' as const, title: 'Máquina' },
    { key: 'tipoNome' as const, title: 'Tipo' },
    { key: 'atividadeNome' as const, title: 'Atividade' },
    {
      key: 'periodicidade' as const,
      title: 'Periodicidade',
      format: (value: string) => (value === 'PERIODICA' ? 'Periódica' : 'Eventual'),
    },
    {
      key: 'dataPrevista' as const,
      title: 'Data Prevista',
      format: (value: string) => formatDate(value),
    },
    {
      key: 'status' as const,
      title: 'Status',
      format: (value: string) => statusBadge(value),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Agendamentos de Manutenção</h1>
        <Button variant="outline" onClick={carregarAgendamentos}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Atualizar
        </Button>
      </div>

      {/* Filtros */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="filtro-status">Status</Label>
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger id="filtro-status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {statusOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="filtro-maquina">Máquina</Label>
          <Select value={filtroMaquina} onValueChange={setFiltroMaquina}>
            <SelectTrigger id="filtro-maquina">
              <SelectValue placeholder="Todas as máquinas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              {maquinas.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.codigo} - {m.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="filtro-data">Data Prevista</Label>
          <Input
            id="filtro-data"
            type="date"
            value={filtroData}
            onChange={(e) => setFiltroData(e.target.value)}
          />
        </div>
      </div>

      <DataTable
        data={agendamentos}
        columns={columns}
        onRowClick={(item) => {
          setDetalhe(item);
          setDetalheOpen(true);
        }}
        extraActions={(item) => (
          <>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Ver detalhes"
              title="Ver detalhes"
              onClick={() => {
                setDetalhe(item);
                setDetalheOpen(true);
              }}
              className="h-8 w-8"
            >
              <Eye className="h-4 w-4" />
            </Button>
            {item.status === 'AGENDADO' && (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Cancelar"
                title="Cancelar agendamento"
                onClick={() => {
                  setCancelar(item);
                  setMotivo('');
                  setCancelarOpen(true);
                }}
                className="h-8 w-8 text-red-600 hover:text-red-700"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            )}
          </>
        )}
      />

      {/* Dialog detalhes */}
      <Dialog open={detalheOpen} onOpenChange={setDetalheOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes do Agendamento</DialogTitle>
            <DialogDescription>
              {detalhe?.maquinaNome} ({detalhe?.maquinaCodigo})
            </DialogDescription>
          </DialogHeader>
          {detalhe && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Tipo:</span>
                <span className="font-medium">{detalhe.tipoNome}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Atividade:</span>
                <span className="font-medium">{detalhe.atividadeNome}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Periodicidade:</span>
                <span className="font-medium">
                  {detalhe.periodicidade === 'PERIODICA' ? 'Periódica' : 'Eventual'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Data prevista:</span>
                <span className="font-medium">{formatDate(detalhe.dataPrevista)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Status:</span>
                {statusBadge(detalhe.status)}
              </div>
              {detalhe.observacoes && (
                <div>
                  <p className="text-gray-500">Observações:</p>
                  <p className="font-medium">{detalhe.observacoes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog cancelar */}
      <Dialog open={cancelarOpen} onOpenChange={setCancelarOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar Agendamento</DialogTitle>
            <DialogDescription>
              {cancelar?.maquinaNome} - {formatDate(cancelar?.dataPrevista || '')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo (opcional)</Label>
            <Textarea
              id="motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Informe o motivo do cancelamento"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelarOpen(false)}>
              Voltar
            </Button>
            <Button variant="destructive" onClick={handleCancelar} disabled={salvando}>
              {salvando ? 'Cancelando...' : 'Confirmar Cancelamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}