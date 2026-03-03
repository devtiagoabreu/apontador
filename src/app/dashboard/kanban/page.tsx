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

interface Producao {
  id: string;
  opId: number;
  estagioId: string;
  dataInicio: string;
  dataFim: string | null;
  metragemProgramada: number;
  metragemProcessada: number | null;
  isReprocesso: boolean;
}

interface OP {
  op: number;
  produto: string;
  qtdeCarregado: number | string;
  qtdeProgramado: number | string;
  um: string;
  status: string;
}

interface ItemKanban {
  op: OP;
  producao: Producao;
  estagio: Estagio;
}

interface Maquina {
  id: string;
  nome: string;
  codigo: string;
  status: string;
}

interface Movimento {
  op: OP;
  producao: Producao;
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
  const [producoes, setProducoes] = useState<Producao[]>([]);
  const [itensKanban, setItensKanban] = useState<ItemKanban[]>([]);
  const [maquinasDisponiveis, setMaquinasDisponiveis] = useState<Maquina[]>([]);
  const [colunas, setColunas] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [movimento, setMovimento] = useState<Movimento | null>(null);
  const [metragemTemp, setMetragemTemp] = useState<number>(0);
  const [erro, setErro] = useState<string | null>(null);

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
    setErro(null);
    
    try {
      console.log('1️⃣ Iniciando carregamento do Kanban...');
      
      // Buscar estágios ativos para o Kanban
      console.log('2️⃣ Buscando estágios...');
      const estagiosRes = await fetch('/api/estagios?kanban=true&ativos=true');
      if (!estagiosRes.ok) {
        throw new Error(`Erro ao carregar estágios: ${estagiosRes.status}`);
      }
      const estagiosData = await estagiosRes.json();
      console.log('3️⃣ Estágios carregados:', estagiosData.length);
      
      // Buscar OPs com status EM_ANDAMENTO
      console.log('4️⃣ Buscando OPs em andamento...');
      const opsRes = await fetch('/api/ops?status=EM_ANDAMENTO&limit=1000');
      if (!opsRes.ok) {
        throw new Error(`Erro ao carregar OPs: ${opsRes.status}`);
      }
      const opsResult = await opsRes.json();
      const opsData = opsResult.data || [];
      console.log('5️⃣ OPs em andamento carregadas:', opsData.length);
      
      // Buscar produções ativas (sem data_fim)
      console.log('6️⃣ Buscando produções ativas...');
      const producoesRes = await fetch('/api/producoes?ativas=true&limit=1000');
      if (!producoesRes.ok) {
        throw new Error(`Erro ao carregar produções: ${producoesRes.status}`);
      }
      const producoesResult = await producoesRes.json();
      const producoesData = producoesResult.data || [];
      console.log('7️⃣ Produções ativas carregadas:', producoesData.length);

      setEstagios(estagiosData);
      setOps(opsData);
      setProducoes(producoesData);
      
      // Construir itens do Kanban (OP + Produção ativa)
      console.log('8️⃣ Construindo itens do Kanban...');
      
      const itens: ItemKanban[] = [];
      
      // Para cada produção ativa, encontrar a OP correspondente
      producoesData.forEach((producao: Producao) => {
        const op = opsData.find((o: OP) => o.op === producao.opId);
        const estagio = estagiosData.find((e: Estagio) => e.id === producao.estagioId);
        
        if (op && estagio) {
          itens.push({
            op,
            producao,
            estagio
          });
          console.log(`   ✅ OP ${op.op} -> Estágio ${estagio.nome}`);
        } else {
          console.log(`   ⚠️ Produção ${producao.id} sem OP ou estágio correspondente`);
        }
      });
      
      console.log('9️⃣ Total de itens construídos:', itens.length);
      setItensKanban(itens);
      
      // Construir colunas
      console.log('🔟 Construindo colunas...');
      
      const colunasKanban = [];
      
      // Coluna de não iniciadas (OPs abertas sem produção ativa)
      const opsAbertas = opsData.filter((op: OP) => 
        !itens.some(item => item.op.op === op.op)
      );
      console.log('   📋 Não iniciadas:', opsAbertas.length);
      colunasKanban.push({ 
        id: 'nao-iniciadas', 
        titulo: '📋 NÃO INICIADAS', 
        cor: '#6b7280', 
        cards: opsAbertas.map(op => ({ op, producao: null, estagio: null }))
      });
      
      // Colunas para cada estágio
      const estagiosOrdenados = [...estagiosData].sort((a, b) => a.ordem - b.ordem);
      
      estagiosOrdenados.forEach((estagio: Estagio) => {
        const cardsEstagio = itens.filter(item => item.estagio.id === estagio.id);
        
        console.log(`   📍 Estágio ${estagio.nome}: ${cardsEstagio.length} itens`);
        
        colunasKanban.push({
          id: estagio.id,
          titulo: estagio.nome,
          cor: estagio.cor || '#3b82f6',
          cards: cardsEstagio
        });
      });
      
      setColunas(colunasKanban);
      
      console.log('✅ Kanban carregado com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao carregar Kanban:', error);
      setErro(error instanceof Error ? error.message : 'Erro desconhecido');
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

    const item = itensKanban.find(i => i.op.op === opId);
    if (!item) return;

    console.log('🎯 Drag end:', { opId, overId, item });

    // Encontrar coluna de destino
    const colunaDestino = colunas.find(col => col.id === overId);
    if (!colunaDestino) return;

    // Se for coluna não iniciadas
    if (colunaDestino.id === 'nao-iniciadas') {
      toast({
        title: 'Ação não permitida',
        description: 'Para iniciar uma OP, use o botão "Iniciar" na lista de OPs',
        variant: 'destructive',
      });
      return;
    }

    // Se for um estágio
    const estagioDestino = estagios.find(e => e.id === colunaDestino.id);
    if (estagioDestino) {
      // Abrir modal para finalizar estágio atual e iniciar novo
      setMetragemTemp(item.producao.metragemProcessada || 0);
      setMovimento({
        op: item.op,
        producao: item.producao,
        estagioDestino,
        etapa: 'finalizar'
      });
    }
  }

  async function handleConfirmarFinalizacao() {
    if (!movimento) return;

    try {
      // Finalizar produção atual
      const response = await fetch(`/api/producoes/${movimento.producao.id}/finalizar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metragemProcessada: metragemTemp,
          operadorFimId: session?.user?.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao finalizar estágio');
      }
      
      await carregarMaquinasDisponiveis(movimento.estagioDestino.id);
      
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
      // Iniciar nova produção
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
        <span className="ml-2 text-gray-500">Carregando Kanban...</span>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="text-red-500 text-lg font-semibold">Erro ao carregar</div>
        <div className="text-gray-600 max-w-md text-center">{erro}</div>
        <Button onClick={carregarDados} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Tentar novamente
        </Button>
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
            Verifique se existem estágios configurados e produções ativas
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
                {coluna.cards.map((item: any) => (
                  <KanbanCard
                    key={item.op.op}
                    op={item.op}
                    producao={item.producao}
                    estagio={item.estagio}
                    isDragging={activeId === item.op.op.toString()}
                  />
                ))}
              </KanbanColumn>
            ))}
          </div>

          <DragOverlay>
            {activeId ? (
              <KanbanCard
                op={itensKanban.find(i => i.op.op === Number(activeId))?.op!}
                producao={itensKanban.find(i => i.op.op === Number(activeId))?.producao!}
                estagio={itensKanban.find(i => i.op.op === Number(activeId))?.estagio!}
                isDragging={true}
                isOverlay
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* MODAIS... */}
    </div>
  );
}