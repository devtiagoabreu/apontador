// src/app/apontamento/avulso/components/search-product.tsx
'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface SearchProductProps {
  onSelect: (product: any) => void;
}

export function SearchProductByCode({ onSelect }: SearchProductProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setLoading(true);
    try {
      // Consome a API de produtos existente que já suporta filtro 'search' [3, 4]
      const response = await fetch(`/api/produtos?search=${encodeURIComponent(searchTerm)}`);
      if (!response.ok) throw new Error('Erro ao buscar produtos');
      
      const data = await response.json();
      setSearchResults(data.data || []);
      setShowResults(true);
    } catch (error) {
      console.error('Erro na busca de produto:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao buscar produto pelo código',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleSelect = (product: any) => {
    setSearchTerm(product.codigo);
    setShowResults(false);
    onSelect(product); // Retorna o produto selecionado para o componente pai
  };

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Digite o código (ex: K1820)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-10 pr-10"
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSearchResults([]);
                setShowResults(false);
              }}
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
            >
              <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>
        <Button onClick={handleSearch} disabled={loading} size="sm">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Buscar'}
        </Button>
      </div>

      {showResults && (
        <div className="absolute z-50 mt-1 w-full bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {searchResults.length > 0 ? (
            searchResults.map((product) => (
              <div
                key={product.id}
                className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                onClick={() => handleSelect(product)}
              >
                <p className="font-bold text-primary">{product.codigo}</p>
                <p className="text-sm text-gray-600 line-clamp-1">{product.nome}</p>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-gray-500">Produto não encontrado</div>
          )}
        </div>
      )}
    </div>
  );
}
