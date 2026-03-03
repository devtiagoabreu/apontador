'use client';

import { useState, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { KanbanColumn } from './components/kanban-column';
import { KanbanCard } from './components/kanban-card';
import { MachineSelector } from './components/machine-selector';
import { toast } from '@/components/ui/use-toast';
import { RefreshCw, LayoutDashboard } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  RadioGroup,
  RadioGroupItem,
} from '@/components/ui/radio-group';
import { useSession } from 'next-auth/react';

interface Estagio {
  id: string;
  codigo: string;
  nome: string;
  ordem: number;
  cor: string;
  mostrarNoKanban: boolean;
  ativo: boolean;
}

interface OP {
  op: number;
  produto: string;
  qtdeCarregado: number | string;
  qtdeProgramado: number | string;
  um: string;
  codEstagioAtual: string;
  estagioAtual: string;
  codMaquinaAtual: string;
  maquinaAtual: string;
  status: string;
  dataUltimoApontamento?: string;
}

interface Maquina {
  id: string;
  nome: string;
  codigo: string;
  status: string;
}

interface Movimento {
  op: OP;
  estagioDestino: Estagio;
  etapa: 'finalizar' | 'iniciar';
  metragem?: number;
  maquinaId?: string;
  isReprocesso?: boolean;
}

export default function KanbanPage() {
  const { data: session } = useSession();
  const [estagios, setEstagios] = useState<Estagio[]>([]);
  const [ops, setOps] = useState<OP[]>([]);
  const [maquinasDisponiveis, setMaquinasDisponiveis] = useState<Maquina[]>([]);
  const [colunas, setColunas] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [movimento, setMovimento] = useState<Movimento | null>(null);
  const [metragemTemp, setMetragemTemp] = useState<number>(0);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    setCarregando(true);
    try {
      // Buscar estágios ativos para o Kanban
      const estagiosRes = await fetch('/api/estagios?kanban=true&ativos=true');
      if (!estagiosRes.ok) throw new Error('Erro ao carregar estágios');
      const estagiosData = await estagiosRes.json();
      
      // Buscar OPs com status relevantes (ABERTA e EM_ANDAMENTO)
      const opsRes = await fetch('/api/ops?status=ABERTA,EM_ANDAMENTO&limit=1000');
      if (!opsRes.ok) throw new Error('Erro ao carregar OPs');
      const opsResult = await opsRes.json();
      const opsData = opsResult.data || [];

      console.log('📦 Estágios carregados:', estagiosData.length);
      console.log('📦 OPs carregadas:', opsData.length);

      setEstagios(estagiosData);
      
      // Construir colunas
      const colunasKanban = [
        { 
          id: 'nao-iniciadas', 
          titulo: '📋 NÃO INICIADAS', 
          cor: '#6b7280', 
          cards: opsData.filter((op: OP) => 
            op.status === 'ABERTA' && 
            op.codEstagioAtual === '00'
          ) 
        },
        ...estagiosData.map((e: Estagio) => ({
          id: e.id,
          titulo: e.nome,
          cor: e.cor,
          cards: opsData.filter((op: OP) => 
            op.codEstagioAtual === e.codigo && 
            op.status === 'EM_ANDAMENTO'
          )
        })),
        { 
          id: 'finalizadas', 
          titulo: '✅ FINALIZADAS', 
          cor: '#10b981', 
          cards: opsData.filter((op: OP) => 
            op.status === 'FINALIZADA'
          ) 
        },
        { 
          id: 'canceladas', 
          titulo: '❌ CANCELADAS', 
          cor: '#ef4444', 
          cards: opsData.filter((op: OP) => 
            op.status === 'CANCELADA'
          ) 
        }
      ];

      // Filtrar colunas vazias
      const colunasComCards = colunasKanban.filter(col => col.cards.length > 0);
      
      setColunas(colunasComCards);
      setOps(opsData);
      
      console.log('📦 Colunas construídas:', colunasComCards.length);
    } catch (error) {
      console.error('❌ Erro ao carregar Kanban:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Não foi possível carregar o Kanban',
        variant: 'destructive',
      });
    } finally {
      setCarregando(false);
    }
  }

  async function carregarMaquinasDisponiveis(estagioId: string) {
    try {
      const response = await fetch(`/api/maquinas/disponiveis?estagioId=${estagioId}`);
      if (!response.ok) throw new Error('Erro ao carregar máquinas');
      const data = await response.json();
      setMaquinasDisponiveis(data);
    } catch (error) {
      console.error('Erro ao carregar máquinas:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar máquinas disponíveis',
        variant: 'destructive',
      });
    }
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const opId = Number(active.id);
    const overId = over.id as string;

    const op = ops.find(o => o.op === opId);
    if (!op) return;

    // Encontrar coluna de destino
    const colunaDestino = colunas.find(col => col.id === overId);
    if (!colunaDestino) return;

    // Se for coluna finalizadas
    if (colunaDestino.id === 'finalizadas') {
      try {
        const response = await fetch(`/api/ops/${op.op}/finalizar`, { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Erro ao finalizar OP');
        }
        
        toast({
          title: 'Sucesso',
          description: `OP ${op.op} finalizada com sucesso`,
        });
        await carregarDados();
      } catch (error) {
        toast({
          title: 'Erro',
          description: error instanceof Error ? error.message : 'Erro ao finalizar OP',
          variant: 'destructive',
        });
      }
      return;
    }

    // Se for coluna canceladas
    if (colunaDestino.id === 'canceladas') {
      toast({
        title: 'Ação não permitida',
        description: 'Para cancelar uma OP, use o menu de contexto do card',
        variant: 'destructive',
      });
      return;
    }

    // Se for um estágio normal
    const estagioDestino = estagios.find(e => e.id === colunaDestino.id);
    if (estagioDestino) {
      // Se a OP já está em algum estágio, precisa finalizar primeiro
      if (op.codEstagioAtual !== '00') {
        setMetragemTemp(Number(op.qtdeCarregado) || 0);
        setMovimento({
          op,
          estagioDestino,
          etapa: 'finalizar'
        });
      } else {
        // OP não iniciada, pode começar direto
        await carregarMaquinasDisponiveis(estagioDestino.id);
        setMovimento({
          op,
          estagioDestino,
          etapa: 'iniciar',
          metragem: 0
        });
      }
    }
  }

  async function handleConfirmarFinalizacao() {
    if (!movimento) return;

    try {
      // Finalizar o estágio atual
      const response = await fetch(`/api/ops/${movimento.op.op}/finalizar-estagio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metragemProcessada: metragemTemp
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao finalizar estágio');
      }
      
      // Carregar máquinas para o próximo estágio
      await carregarMaquinasDisponiveis(movimento.estagioDestino.id);
      
      // Avançar para iniciar
      setMovimento({
        ...movimento,
        etapa: 'iniciar',
        metragem: metragemTemp
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao finalizar estágio',
        variant: 'destructive',
      });
    }
  }

  async function handleConfirmarInicio() {
    if (!movimento || !movimento.maquinaId) {
      toast({
        title: 'Erro',
        description: 'Selecione uma máquina',
        variant: 'destructive',
      });
      return;
    }

    if (!session?.user?.id) {
      toast({
        title: 'Erro',
        description: 'Usuário não autenticado',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Iniciar novo estágio
      const response = await fetch(`/api/producoes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opId: movimento.op.op,
          maquinaId: movimento.maquinaId,
          estagioId: movimento.estagioDestino.id,
          operadorInicioId: session.user.id,
          isReprocesso: movimento.isReprocesso || false,
          observacoes: '',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao iniciar produção');
      }

      toast({
        title: 'Sucesso',
        description: `OP ${movimento.op.op} iniciada em ${movimento.estagioDestino.nome}`,
      });

      setMovimento(null);
      await carregarDados();
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao iniciar produção',
        variant: 'destructive',
      });
    }
  }

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">MODO KANBAN</h1>
        </div>
        <Button variant="outline" onClick={carregarDados}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Atualizar
        </Button>
      </div>

      {colunas.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">Nenhuma coluna para exibir</p>
          <p className="text-sm text-gray-400 mt-2">
            Verifique se existem estágios configurados e OPs cadastradas
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4 min-h-[600px]">
            {colunas.map((coluna) => (
              <KanbanColumn
                key={coluna.id}
                id={coluna.id}
                titulo={coluna.titulo}
                cor={coluna.cor}
                cards={coluna.cards}
              >
                {coluna.cards.map((op: OP) => (
                  <KanbanCard
                    key={op.op}
                    op={op}
                    isDragging={activeId === op.op.toString()}
                  />
                ))}
              </KanbanColumn>
            ))}
          </div>

          <DragOverlay>
            {activeId ? (
              <KanbanCard
                op={ops.find(o => o.op === Number(activeId))!}
                isDragging={true}
                isOverlay
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* MODAL 1: Finalizar estágio atual */}
      <Dialog open={movimento?.etapa === 'finalizar'} onOpenChange={() => setMovimento(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Finalizar {movimento?.op.estagioAtual}</DialogTitle>
            <DialogDescription>
              Informe a metragem processada neste estágio
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm font-medium">OP {movimento?.op.op}</p>
              <p className="text-xs text-gray-500 mt-1">{movimento?.op.produto}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="metragem">Metragem Processada (m) *</Label>
              <Input
                id="metragem"
                type="number"
                step="0.01"
                min="0"
                value={metragemTemp}
                onChange={(e) => setMetragemTemp(Number(e.target.value))}
                placeholder="0,00"
              />
              <p className="text-xs text-gray-500">
                Programado: {Number(movimento?.op.qtdeProgramado).toLocaleString('pt-BR')} m
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setMovimento(null)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmarFinalizacao}>
              Confirmar Finalização
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: Iniciar novo estágio */}
      <Dialog open={movimento?.etapa === 'iniciar'} onOpenChange={() => setMovimento(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Iniciar {movimento?.estagioDestino.nome}</DialogTitle>
            <DialogDescription>
              Selecione a máquina e informe se é reprocesso
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm font-medium">OP {movimento?.op.op}</p>
              <p className="text-xs text-gray-500">{movimento?.op.produto}</p>
            </div>

            <div className="space-y-2">
              <Label>Máquina *</Label>
              {maquinasDisponiveis.length === 0 ? (
                <p className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded-lg">
                  Nenhuma máquina disponível para este estágio
                </p>
              ) : (
                <RadioGroup 
                  value={movimento?.maquinaId} 
                  onValueChange={(value) => setMovimento(prev => prev ? {...prev, maquinaId: value} : null)}
                >
                  <div className="space-y-2">
                    {maquinasDisponiveis.map((maquina) => (
                      <div key={maquina.id} className="flex items-center space-x-2 border rounded-lg p-3">
                        <RadioGroupItem value={maquina.id} id={maquina.id} />
                        <Label htmlFor={maquina.id} className="flex-1 cursor-pointer">
                          <div className="font-medium">{maquina.nome}</div>
                          <div className="text-xs text-gray-500">Código: {maquina.codigo}</div>
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              )}
            </div>

            <div className="flex items-start space-x-2 pt-2">
              <Checkbox
                id="reprocesso"
                checked={movimento?.isReprocesso || false}
                onCheckedChange={(checked) => 
                  setMovimento(prev => prev ? {...prev, isReprocesso: checked as boolean} : null)
                }
                className="mt-1"
              />
              <div className="space-y-1">
                <Label htmlFor="reprocesso" className="text-sm font-medium">
                  🔄 É reprocesso?
                </Label>
                <p className="text-xs text-gray-500">
                  Marque se este produto já passou por este estágio
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setMovimento(null)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmarInicio}
              disabled={!movimento?.maquinaId || maquinasDisponiveis.length === 0}
            >
              Iniciar Produção
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}