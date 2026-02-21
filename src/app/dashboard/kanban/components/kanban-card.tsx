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

interface KanbanCardProps {
  op: any;
  isDragging?: boolean;
  isOverlay?: boolean;
  onEdit?: () => void;
  onUndo?: () => void;
  onCancel?: () => void;
}

export function KanbanCard({ 
  op, 
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
  } = useSortable({ id: op.op });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isOverlay ? 999 : 'auto',
  };

  // Determinar cor do cronômetro baseado na eficiência
  function getCronometroCor() {
    if (!op.tempoDecorrido || !op.eficienciaEsperada) return 'text-gray-600';
    const percentual = (op.tempoDecorrido / op.eficienciaEsperada) * 100;
    if (percentual > 100) return 'text-red-600';
    if (percentual > 80) return 'text-yellow-600';
    return 'text-green-600';
  }

  // Formatar tempo
  function formatTempo(minutos?: number) {
    if (!minutos) return '00:00:00';
    const horas = Math.floor(minutos / 60);
    const mins = Math.floor(minutos % 60);
    const segs = Math.floor((minutos * 60) % 60);
    return `${horas.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${segs.toString().padStart(2, '0')}`;
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    // O menu será aberto pelo DropdownMenu
  };

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
              <DropdownMenuItem onClick={onCancel} className="text-red-600">
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
          Metros: {op.qtdeCarregado} {op.um}
        </div>

        {/* Máquina atual */}
        {op.maquinaAtual !== 'NENHUMA' && (
          <div className="text-xs text-gray-500 mb-2">
            Máquina: {op.maquinaAtual}
          </div>
        )}

        {/* Cronômetro */}
        {op.dataInicio && (
          <div className={cn('flex items-center gap-1 text-sm font-mono', getCronometroCor())}>
            <Clock className="h-4 w-4" />
            <span>{formatTempo(op.tempoDecorrido)}</span>
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