'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Clock, MoreVertical, Edit, Undo, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { EditTimesModal } from './edit-times-modal';
import { toast } from '@/components/ui/use-toast';

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
  maquina?: {
    nome: string;
    codigo: string;
  };
}

interface OP {
  op: number;
  produto: string;
  qtdeCarregado: number | string;
  qtdeProgramado: number | string;
  um: string;
  status: string;
}

interface KanbanCardProps {
  op: OP;
  producao?: Producao | null;
  estagio?: Estagio | null;
  isDragging?: boolean;
  isOverlay?: boolean;
  onEdit?: () => void;
  onUndo?: () => void;
  onCancel?: () => void;
}

export function KanbanCard({ 
  op, 
  producao,
  estagio,
  isDragging, 
  isOverlay,
  onEdit,
  onUndo,
  onCancel 
}: KanbanCardProps) {
  const [editModalOpen, setEditModalOpen] = useState(false);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: op.op });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging || isSortableDragging ? 0.5 : 1,
    zIndex: isOverlay ? 999 : 'auto',
  };

  // Formatar tempo desde o início da produção
  function getTempoDecorrido() {
    if (!producao?.dataInicio) return null;
    
    const inicio = new Date(producao.dataInicio);
    const agora = new Date();
    const diffMs = agora.getTime() - inicio.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHoras = Math.floor(diffMin / 60);
    const diffMinResto = diffMin % 60;
    
    return `${diffHoras}h ${diffMinResto}m`;
  }

  // Determinar cor do cronômetro
  function getCronometroCor() {
    const tempo = getTempoDecorrido();
    if (!tempo) return 'text-gray-400';
    
    const horas = parseInt(tempo.split('h')[0]);
    if (horas > 4) return 'text-red-600';
    if (horas > 2) return 'text-yellow-600';
    return 'text-green-600';
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  const handleCancel = async () => {
    if (!confirm(`Tem certeza que deseja cancelar a OP ${op.op}?`)) return;
    
    try {
      const response = await fetch(`/api/ops/${op.op}/cancelar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao cancelar OP');
      }

      toast({
        title: 'Sucesso',
        description: `OP ${op.op} cancelada com sucesso`,
      });

      if (onCancel) onCancel();
      window.location.reload();
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao cancelar OP',
        variant: 'destructive',
      });
    }
  };

  // Metragem a ser exibida
  const metragemExibida = producao?.metragemProcessada || op.qtdeCarregado || 0;
  const metragemFormatada = Number(metragemExibida).toLocaleString('pt-BR');

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        onContextMenu={handleContextMenu}
        className={cn(
          'bg-white rounded-lg shadow-sm border border-gray-200 p-3 cursor-move hover:shadow-md transition-shadow',
          isDragging && 'shadow-lg ring-2 ring-primary ring-opacity-50',
          isOverlay && 'rotate-3 scale-105'
        )}
      >
        {/* Cabeçalho do card */}
        <div className="flex items-start justify-between mb-2">
          <span className="font-mono text-sm font-semibold">OP {op.op}</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <button className="p-1 hover:bg-gray-100 rounded-full">
                <MoreVertical className="h-4 w-4 text-gray-500" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditModalOpen(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Editar Tempos
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onUndo}>
                <Undo className="mr-2 h-4 w-4" />
                Desfazer Processo
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCancel} className="text-red-600">
                <XCircle className="mr-2 h-4 w-4" />
                Cancelar OP
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Informações do produto */}
        <p className="text-sm text-gray-700 line-clamp-2 mb-2">{op.produto}</p>

        {/* Metragem */}
        <div className="text-xs text-gray-500 mb-2">
          Metros: {metragemFormatada} {op.um}
          {producao && !producao.dataFim && producao.metragemProcessada ? ' (parcial)' : ''}
        </div>

        {/* Estágio atual */}
        {estagio && (
          <div className="text-xs text-gray-500 mb-2">
            Estágio: {estagio.nome}
          </div>
        )}

        {/* Máquina atual */}
        {producao?.maquina && (
          <div className="text-xs text-gray-500 mb-2">
            Máquina: {producao.maquina.nome}
          </div>
        )}

        {/* Cronômetro (só para produções ativas) */}
        {producao && !producao.dataFim && (
          <div className={cn('flex items-center gap-1 text-sm font-mono', getCronometroCor())}>
            <Clock className="h-4 w-4" />
            <span>{getTempoDecorrido()}</span>
          </div>
        )}
      </div>

      {/* Modal de edição de tempos */}
      <EditTimesModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        op={op}
      />
    </>
  );
}