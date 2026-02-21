'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KanbanColumnProps {
  id: string;
  titulo: string;
  cor: string;
  cards: any[];
  children: React.ReactNode;
  onLimpar?: () => void;
}

export function KanbanColumn({ id, titulo, cor, cards, children, onLimpar }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  // Calcular tamanho dos cards baseado na quantidade
  const getCardSize = () => {
    if (cards.length > 20) return 'compact';
    if (cards.length > 10) return 'medium';
    return 'large';
  };

  const cardSize = getCardSize();

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex-shrink-0 w-80 bg-gray-50 rounded-lg p-3 transition-colors',
        isOver && 'ring-2 ring-primary ring-opacity-50 bg-primary/5'
      )}
      style={{ minHeight: '500px' }}
    >
      {/* Cabeçalho da coluna */}
      <div
        className="flex items-center justify-between p-3 rounded-t-lg mb-3 sticky top-0"
        style={{ backgroundColor: cor }}
      >
        <h3 className="font-semibold text-white truncate">
          {titulo} ({cards.length})
        </h3>
        {onLimpar && cards.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20 flex-shrink-0"
            onClick={onLimpar}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Cards */}
      <SortableContext items={cards.map((c: any) => c.op)} strategy={verticalListSortingStrategy}>
        <div className={cn(
          'transition-all',
          cardSize === 'compact' && 'space-y-1',
          cardSize === 'medium' && 'space-y-2',
          cardSize === 'large' && 'space-y-3'
        )}>
          {children}
        </div>
      </SortableContext>
    </div>
  );
}