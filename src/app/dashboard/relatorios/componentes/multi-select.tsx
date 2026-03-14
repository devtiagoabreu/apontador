// src/app/dashboard/relatorios/componentes/multi-select.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ChevronDown, X, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Option {
  id: string;
  label: string;
  value: string;
}

interface MultiSelectProps {
  options: Option[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  disabled?: boolean;
  maxHeight?: string;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = 'Selecione...',
  label,
  className,
  disabled = false,
  maxHeight = 'max-h-60',
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Fechar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtrar opções baseado na busca
  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Selecionar/deselecionar todos
  const handleSelectAll = () => {
    if (selected.length === options.length) {
      onChange([]);
    } else {
      onChange(options.map(opt => opt.id));
    }
  };

  // Selecionar/deselecionar um item
  const handleToggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter(s => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  // Remover um item selecionado
  const handleRemove = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter(s => s !== id));
  };

  // Obter labels dos itens selecionados
  const selectedLabels = selected
    .map(id => options.find(opt => opt.id === id)?.label)
    .filter(Boolean) as string[];

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {label && (
        <Label className="text-sm font-medium mb-1 block">{label}</Label>
      )}
      
      {/* Botão principal */}
      <Button
        type="button"
        variant="outline"
        className="w-full justify-between h-auto min-h-10 py-2"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <div className="flex flex-wrap gap-1 flex-1">
          {selected.length === 0 && (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          {selected.length > 0 && selected.length <= 3 && (
            selectedLabels.map((label, i) => (
              <span
                key={i}
                className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full flex items-center gap-1"
              >
                {label}
                <button
                  onClick={(e) => {
                    const id = options.find(opt => opt.label === label)?.id;
                    if (id) handleRemove(id, e);
                  }}
                  className="hover:text-primary/70"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))
          )}
          {selected.length > 3 && (
            <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">
              {selected.length} selecionados
            </span>
          )}
        </div>
        <ChevronDown className={cn(
          'h-4 w-4 transition-transform flex-shrink-0',
          isOpen && 'transform rotate-180'
        )} />
      </Button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg">
          {/* Barra de pesquisa */}
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Pesquisar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-sm"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {/* Opções */}
          <div className={`overflow-y-auto p-2 ${maxHeight}`}>
            {/* Selecionar todos */}
            <div className="flex items-center space-x-2 py-1 px-2 hover:bg-gray-50 rounded">
              <Checkbox
                id="select-all"
                checked={selected.length === options.length && options.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <Label htmlFor="select-all" className="text-sm cursor-pointer flex-1">
                Selecionar Todos
              </Label>
              <span className="text-xs text-gray-500">
                {selected.length}/{options.length}
              </span>
            </div>

            <div className="h-px bg-gray-200 my-2" />

            {/* Lista de opções */}
            {filteredOptions.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                Nenhuma opção encontrada
              </p>
            ) : (
              filteredOptions.map((opt) => (
                <div
                  key={opt.id}
                  className="flex items-center space-x-2 py-1 px-2 hover:bg-gray-50 rounded"
                >
                  <Checkbox
                    id={opt.id}
                    checked={selected.includes(opt.id)}
                    onCheckedChange={() => handleToggle(opt.id)}
                  />
                  <Label htmlFor={opt.id} className="text-sm cursor-pointer flex-1">
                    {opt.label}
                  </Label>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}