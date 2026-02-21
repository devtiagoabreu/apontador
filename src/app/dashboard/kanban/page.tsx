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

export default function KanbanPage() {
  const [estagios, setEstagios] = useState<Estagio[]>([]);
  const [ops, setOps] = useState<OP[]>([]);
  const [colunas, setColunas] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [movendoOP, setMovendoOP] = useState<{ op: OP; estagioDestino: Estagio } | null>(null);
  const [machineSelectorOpen, setMachineSelectorOpen] = useState(false);

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

    // Se for coluna finalizadas e OP não está finalizada
    if (colunaDestino.id === 'finalizadas' && op.status !== 'FINALIZADA' && op.status !== 'CANCELADA') {
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
        await fetch(`/api/ops/${op.op}/parada`, { method: 'POST' });
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
      setMovendoOP({ op, estagioDestino });
      setMachineSelectorOpen(true);
    }
  }

  async function handleMachineSelected(maquinaId: string) {
    if (!movendoOP) return;

    try {
      const response = await fetch(`/api/ops/${movendoOP.op.op}/mover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estagioId: movendoOP.estagioDestino.id,
          maquinaId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      toast({
        title: 'Sucesso',
        description: `OP ${movendoOP.op.op} movida para ${movendoOP.estagioDestino.nome}`,
      });

      await carregarDados();
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao mover OP',
        variant: 'destructive',
      });
    } finally {
      setMachineSelectorOpen(false);
      setMovendoOP(null);
    }
  }

  async function handleUndo(op: OP) {
    try {
      await fetch(`/api/ops/${op.op}/desfazer`, { method: 'POST' });
      toast({
        title: 'Sucesso',
        description: 'Processo desfeito com sucesso',
      });
      await carregarDados();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao desfazer processo',
        variant: 'destructive',
      });
    }
  }

  async function handleCancel(op: OP) {
    if (!confirm(`Tem certeza que deseja cancelar a OP ${op.op}?`)) return;
    
    try {
      await fetch(`/api/ops/${op.op}/cancelar`, { method: 'POST' });
      toast({
        title: 'Sucesso',
        description: 'OP cancelada com sucesso',
      });
      await carregarDados();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao cancelar OP',
        variant: 'destructive',
      });
    }
  }

  function handleLimparFinalizadas() {
    toast({
      title: 'Limpar Finalizadas',
      description: 'Tem certeza? Esta ação não pode ser desfeita.',
      action: (
        <Button 
          variant="destructive" 
          onClick={async () => {
            try {
              await fetch('/api/ops/limpar-finalizadas', { method: 'POST' });
              await carregarDados();
              toast({
                title: 'Sucesso',
                description: 'Coluna finalizadas limpa com sucesso',
              });
            } catch (error) {
              toast({
                title: 'Erro',
                description: 'Erro ao limpar finalizadas',
                variant: 'destructive',
              });
            }
          }}
        >
          Confirmar
        </Button>
      ),
    });
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
              onLimpar={coluna.id === 'finalizadas' ? handleLimparFinalizadas : undefined}
            >
              {coluna.cards.map((op: OP) => (
                <KanbanCard
                  key={op.op}
                  op={op}
                  isDragging={activeId === op.op.toString()}
                  onUndo={() => handleUndo(op)}
                  onCancel={() => handleCancel(op)}
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

      <MachineSelector
        open={machineSelectorOpen}
        onClose={() => {
          setMachineSelectorOpen(false);
          setMovendoOP(null);
        }}
        onConfirm={handleMachineSelected}
        estagioId={movendoOP?.estagioDestino.id || ''}
        estagioNome={movendoOP?.estagioDestino.nome || ''}
      />
    </div>
  );
}