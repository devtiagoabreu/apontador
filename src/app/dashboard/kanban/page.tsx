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
      console.log('🔍 Iniciando carregamento do Kanban...');
      
      // Buscar estágios ativos para o Kanban
      console.log('📡 Buscando estágios...');
      const estagiosRes = await fetch('/api/estagios?kanban=true&ativos=true');
      if (!estagiosRes.ok) {
        const errorText = await estagiosRes.text();
        throw new Error(`Erro ao carregar estágios: ${estagiosRes.status} - ${errorText}`);
      }
      const estagiosData = await estagiosRes.json();
      console.log('✅ Estágios carregados:', estagiosData.length);
      console.log('📋 Lista de estágios:', estagiosData.map((e: Estagio) => ({ 
        codigo: e.codigo, 
        nome: e.nome, 
        id: e.id 
      })));
      
      // Buscar OPs com status relevantes
      console.log('📡 Buscando OPs...');
      const opsRes = await fetch('/api/ops?status=ABERTA,EM_ANDAMENTO,FINALIZADA,CANCELADA&limit=1000');
      if (!opsRes.ok) {
        const errorText = await opsRes.text();
        throw new Error(`Erro ao carregar OPs: ${opsRes.status} - ${errorText}`);
      }
      const opsResult = await opsRes.json();
      const opsData = opsResult.data || [];
      console.log('✅ OPs carregadas:', opsData.length);
      
      // Log detalhado das OPs
      console.log('📊 Status das OPs:', {
        ABERTA: opsData.filter((o: OP) => o.status === 'ABERTA').length,
        EM_ANDAMENTO: opsData.filter((o: OP) => o.status === 'EM_ANDAMENTO').length,
        FINALIZADA: opsData.filter((o: OP) => o.status === 'FINALIZADA').length,
        CANCELADA: opsData.filter((o: OP) => o.status === 'CANCELADA').length,
      });

      // Log de todas as OPs em andamento com seus códigos
      const opsEmAndamento = opsData.filter((o: OP) => o.status === 'EM_ANDAMENTO');
      console.log('🔍 OPs EM ANDAMENTO:', opsEmAndamento.map((op: OP) => ({
        op: op.op,
        codEstagioAtual: op.codEstagioAtual,
        estagioAtual: op.estagioAtual,
        codEstagioAtual_type: typeof op.codEstagioAtual,
        estagioAtual_completo: op.estagioAtual
      })));

      setEstagios(estagiosData);
      setOps(opsData);
      
      // Construir colunas
      console.log('🏗️ Construindo colunas...');
      
      const colunasKanban = [];
      
      // 1. Coluna de não iniciadas
      const naoIniciadas = opsData.filter((op: OP) => 
        op.status === 'ABERTA' && 
        op.codEstagioAtual === '00'
      );
      console.log('📋 Não iniciadas:', naoIniciadas.length);
      colunasKanban.push({ 
        id: 'nao-iniciadas', 
        titulo: '📋 NÃO INICIADAS', 
        cor: '#6b7280', 
        cards: naoIniciadas 
      });
      
      // 2. Criar um mapa de estágios com múltiplas chaves
      const estagioMap = new Map();
      
      // Mapear estágios por várias formas de código
      estagiosData.forEach((e: Estagio) => {
        // Código original
        estagioMap.set(e.codigo, e);
        
        // Código como número (sem padding)
        const codigoNum = parseInt(e.codigo, 10);
        if (!isNaN(codigoNum)) {
          estagioMap.set(codigoNum.toString(), e);
          estagioMap.set(codigoNum, e); // como número também
        }
        
        // Código com padding (2 dígitos)
        const codigoPad = e.codigo.padStart(2, '0');
        estagioMap.set(codigoPad, e);
        
        // Extrair código do nome (se tiver parênteses)
        const matchNome = e.nome.match(/\((\d+)\)/);
        if (matchNome) {
          estagioMap.set(matchNome[1], e);
        }
        
        console.log(`📌 Mapeando estágio: ${e.nome} -> códigos:`, {
          original: e.codigo,
          numero: codigoNum,
          pad: codigoPad,
          doNome: matchNome ? matchNome[1] : null
        });
      });
      
      // 3. Colunas para CADA estágio
      console.log('📌 Criando colunas para todos os estágios...');
      
      // Organizar estágios por ordem
      const estagiosOrdenados = [...estagiosData].sort((a, b) => a.ordem - b.ordem);
      
      // Mapa para rastrear OPs já alocadas
      const opsAlocadas = new Set();
      
      estagiosOrdenados.forEach((e: Estagio) => {
        // Buscar OPs para este estágio
        const cardsEstagio = opsEmAndamento.filter((op: OP) => {
          // Já foi alocada?
          if (opsAlocadas.has(op.op)) return false;
          
          const codigoOp = String(op.codEstagioAtual).trim();
          
          // Verificar se o código da OP corresponde a este estágio
          const estagioCorrespondente = estagioMap.get(codigoOp);
          
          if (estagioCorrespondente && estagioCorrespondente.id === e.id) {
            console.log(`✅ OP ${op.op} (${codigoOp}) -> Estágio ${e.nome}`);
            opsAlocadas.add(op.op);
            return true;
          }
          
          // Tentar como número
          const codigoOpNum = parseInt(codigoOp, 10);
          if (!isNaN(codigoOpNum)) {
            const estagioPorNum = estagioMap.get(codigoOpNum);
            if (estagioPorNum && estagioPorNum.id === e.id) {
              console.log(`✅ OP ${op.op} (${codigoOpNum}) -> Estágio ${e.nome}`);
              opsAlocadas.add(op.op);
              return true;
            }
          }
          
          // Tentar extrair código do nome do estágio na OP
          if (op.estagioAtual) {
            const match = op.estagioAtual.match(/\((\d+)\)/);
            if (match) {
              const codigoExtraido = match[1];
              if (codigoExtraido === e.codigo || parseInt(codigoExtraido, 10) === parseInt(e.codigo, 10)) {
                console.log(`✅ OP ${op.op} (extraído ${codigoExtraido}) -> Estágio ${e.nome}`);
                opsAlocadas.add(op.op);
                return true;
              }
            }
          }
          
          return false;
        });
        
        console.log(`📌 Estágio ${e.nome} (${e.codigo}): ${cardsEstagio.length} OPs`);
        
        colunasKanban.push({
          id: e.id,
          titulo: e.nome,
          cor: e.cor || '#3b82f6',
          cards: cardsEstagio
        });
      });
      
      // 4. OPs não alocadas (estágio inválido)
      const opsNaoAlocadas = opsEmAndamento.filter((op: OP) => !opsAlocadas.has(op.op));
      
      if (opsNaoAlocadas.length > 0) {
        console.warn('⚠️ OPs em andamento não alocadas:', opsNaoAlocadas.map((op: OP) => ({
          op: op.op,
          codEstagioAtual: op.codEstagioAtual,
          estagioAtual: op.estagioAtual,
          tipoCodigo: typeof op.codEstagioAtual
        })));
        
        colunasKanban.push({
          id: 'estagio-invalido',
          titulo: '⚠️ ESTÁGIO INVÁLIDO',
          cor: '#f59e0b',
          cards: opsNaoAlocadas
        });
      }
      
      // 5. Coluna de finalizadas
      const finalizadas = opsData.filter((op: OP) => op.status === 'FINALIZADA');
      console.log('✅ Finalizadas:', finalizadas.length);
      if (finalizadas.length > 0) {
        colunasKanban.push({ 
          id: 'finalizadas', 
          titulo: '✅ FINALIZADAS', 
          cor: '#10b981', 
          cards: finalizadas 
        });
      }
      
      // 6. Coluna de canceladas
      const canceladas = opsData.filter((op: OP) => op.status === 'CANCELADA');
      console.log('❌ Canceladas:', canceladas.length);
      if (canceladas.length > 0) {
        colunasKanban.push({ 
          id: 'canceladas', 
          titulo: '❌ CANCELADAS', 
          cor: '#ef4444', 
          cards: canceladas 
        });
      }

      console.log('📊 Total de colunas construídas:', colunasKanban.length);
      console.log('📊 Colunas:', colunasKanban.map(c => ({ id: c.id, titulo: c.titulo, count: c.cards.length })));
      
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

    const op = ops.find(o => o.op === opId);
    if (!op) return;

    console.log('🎯 Drag end:', { opId, overId, op });

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

    // Se for coluna de estágio inválido
    if (colunaDestino.id === 'estagio-invalido') {
      toast({
        title: 'Ação não permitida',
        description: 'Esta OP está com estágio inválido. Corrija manualmente.',
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
      const response = await fetch(`/api/producoes/${movimento.op.op}/finalizar`, {
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

      {/* MODAIS (mantidos iguais) */}
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
                Programado: {Number(movimento?.op.qtdeProgramado || 0).toLocaleString('pt-BR')} m
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