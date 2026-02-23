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
  qtdeCarregado: number;
  um: string;
  codEstagioAtual: string;
  estagioAtual: string;
  codMaquinaAtual: string;
  maquinaAtual: string;
  status: string;
  dataInicio?: Date;
  tempoDecorrido?: number;
  eficienciaEsperada?: number;
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
    // Atualizar cronômetros a cada segundo
    const interval = setInterval(() => {
      setOps(prev => prev.map(op => ({
        ...op,
        tempoDecorrido: op.dataInicio 
          ? (new Date().getTime() - new Date(op.dataInicio).getTime()) / 60000 
          : undefined
      })));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  async function carregarDados() {
    try {
      const [estagiosRes, opsRes] = await Promise.all([
        fetch('/api/estagios?kanban=true'),
        fetch('/api/ops?status=ABERTA,EM_ANDAMENTO,PARADA'),
      ]);

      const estagiosData = await estagiosRes.json();
      const opsData = await opsRes.json();

      setEstagios(estagiosData);
      
      // Construir colunas
      const colunasKanban = [
        { 
          id: 'paradas', 
          titulo: '⏸️ PARADAS', 
          cor: '#ef4444', 
          cards: opsData.filter((op: OP) => op.status === 'PARADA') 
        },
        ...estagiosData.map((e: Estagio) => ({
          id: e.id,
          titulo: e.nome,
          cor: e.cor,
          cards: opsData.filter((op: OP) => 
            op.codEstagioAtual === e.codigo && 
            op.status !== 'PARADA' && 
            op.status !== 'FINALIZADA' && 
            op.status !== 'CANCELADA'
          )
        })),
        { 
          id: 'finalizadas', 
          titulo: '✅ FINALIZADAS', 
          cor: '#10b981', 
          cards: opsData.filter((op: OP) => 
            op.status === 'FINALIZADA' || op.status === 'CANCELADA'
          ) 
        }
      ];

      setColunas(colunasKanban);
      setOps(opsData);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o Kanban',
        variant: 'destructive',
      });
    } finally {
      setCarregando(false);
    }
  }

  async function carregarMaquinasDisponiveis(estagioId: string) {
    try {
      const response = await fetch(`/api/maquinas/disponiveis?estagioId=${estagioId}`);
      const data = await response.json();
      setMaquinasDisponiveis(data);
    } catch (error) {
      console.error('Erro ao carregar máquinas:', error);
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
    const colunaDestino = colunas.find(col => 
      col.id === overId || col.cards.some((c: any) => c.op === opId)
    );

    if (!colunaDestino) return;

    // Se for a mesma coluna, apenas reordenar
    const colunaOrigem = colunas.find(col => 
      col.cards.some((c: any) => c.op === opId)
    );

    if (colunaOrigem?.id === colunaDestino.id) {
      // Reordenar cards
      const novosCards = [...colunaOrigem.cards];
      const oldIndex = novosCards.findIndex((c: any) => c.op === opId);
      const newIndex = colunaDestino.cards.findIndex((c: any) => c.op === Number(overId));
      
      if (oldIndex !== newIndex && newIndex !== -1) {
        const [movedCard] = novosCards.splice(oldIndex, 1);
        novosCards.splice(newIndex, 0, movedCard);
        setColunas(prev => prev.map(col => 
          col.id === colunaOrigem.id ? { ...col, cards: novosCards } : col
        ));
      }
      return;
    }

    // Se for coluna finalizadas
    if (colunaDestino.id === 'finalizadas') {
      try {
        await fetch(`/api/ops/${op.op}/finalizar`, { method: 'POST' });
        toast({
          title: 'Sucesso',
          description: `OP ${op.op} finalizada com sucesso`,
        });
        await carregarDados();
      } catch (error) {
        toast({
          title: 'Erro',
          description: 'Erro ao finalizar OP',
          variant: 'destructive',
        });
      }
      return;
    }

    // Se for coluna paradas
    if (colunaDestino.id === 'paradas') {
      try {
        await fetch(`/api/ops/${op.op}/parada`, { 
          method: 'POST',
          body: JSON.stringify({ opId: op.op }) // Vincula a OP!
        });
        toast({
          title: 'Sucesso',
          description: `OP ${op.op} movida para paradas`,
        });
        await carregarDados();
      } catch (error) {
        toast({
          title: 'Erro',
          description: 'Erro ao registrar parada',
          variant: 'destructive',
        });
      }
      return;
    }

    // Se for um estágio normal
    const estagioDestino = estagios.find(e => e.id === colunaDestino.id);
    if (estagioDestino) {
      // PASSO 1: Abrir modal para finalizar
      setMetragemTemp(op.qtdeCarregado || 0);
      setMovimento({
        op,
        estagioDestino,
        etapa: 'finalizar'
      });
    }
  }

  async function handleConfirmarFinalizacao() {
    if (!movimento) return;

    try {
      // Aqui você chamaria a API para finalizar o apontamento atual
      // Por enquanto, vamos apenas avançar para o próximo passo
      
      // Carregar máquinas disponíveis para o próximo estágio
      await carregarMaquinasDisponiveis(movimento.estagioDestino.id);
      
      // PASSO 2: Avançar para modal de iniciar
      setMovimento({
        ...movimento,
        etapa: 'iniciar',
        metragem: metragemTemp
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao finalizar estágio',
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

    try {
      // Chamar API para mover a OP (finaliza atual e inicia nova)
      const response = await fetch(`/api/ops/${movimento.op.op}/mover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estagioId: movimento.estagioDestino.id,
          maquinaId: movimento.maquinaId,
          isReprocesso: movimento.isReprocesso || false,
          metragemFinalizada: movimento.metragem
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao mover OP');
      }

      toast({
        title: 'Sucesso',
        description: `OP ${movimento.op.op} movida para ${movimento.estagioDestino.nome}`,
      });

      setMovimento(null);
      await carregarDados();
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao mover OP',
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
                Carregado na OP: {movimento?.op.qtdeCarregado} m
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
            <Button onClick={handleConfirmarInicio}>
              Iniciar Produção
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}