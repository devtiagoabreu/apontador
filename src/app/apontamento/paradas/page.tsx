'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MobileCard } from '@/components/mobile/card';
import { Plus, Play, Clock } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';

interface Parada {
  id: string;
  maquinaId: string;
  dataInicio: string;
  observacoes: string | null;
  maquina?: {
    nome: string;
    codigo: string;
  };
  motivo?: {
    descricao: string;
    codigo: string;
  };
}

export default function ParadasPage() {
  const [paradas, setParadas] = useState<Parada[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarParadas();
  }, []);

  async function carregarParadas() {
    try {
      const response = await fetch('/api/paradas-maquina?ativas=true');
      const data = await response.json();
      setParadas(data.data || []);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as paradas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function finalizarParada(id: string) {
    try {
      const response = await fetch(`/api/paradas-maquina/${id}/finalizar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataFim: new Date().toISOString() }),
      });

      if (!response.ok) throw new Error('Erro ao finalizar');

      toast({
        title: 'Sucesso',
        description: 'Parada finalizada',
      });

      carregarParadas();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao finalizar parada',
        variant: 'destructive',
      });
    }
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Paradas</h1>
        <Link href="/apontamento/parada">
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" /> Nova
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-8">Carregando...</div>
      ) : paradas.length === 0 ? (
        <MobileCard className="text-center py-8 text-gray-500">
          Nenhuma parada ativa
        </MobileCard>
      ) : (
        <div className="space-y-3">
          {paradas.map((parada) => (
            <MobileCard key={parada.id}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-red-600">⏸️ Parada</span>
                    <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">
                      {parada.maquina?.codigo}
                    </span>
                  </div>
                  
                  <p className="font-medium">{parada.maquina?.nome}</p>
                  <p className="text-sm text-gray-600 mt-1">{parada.motivo?.descricao}</p>
                  
                  {parada.observacoes && (
                    <p className="text-xs text-gray-500 mt-1 italic">"{parada.observacoes}"</p>
                  )}
                  
                  <div className="flex items-center gap-1 text-xs text-gray-400 mt-2">
                    <Clock className="h-3 w-3" />
                    {formatDate(parada.dataInicio)}
                  </div>
                </div>
                
                <Button
                  size="sm"
                  variant="outline"
                  className="text-green-600"
                  onClick={() => finalizarParada(parada.id)}
                >
                  <Play className="h-4 w-4 mr-1" /> Finalizar
                </Button>
              </div>
            </MobileCard>
          ))}
        </div>
      )}
    </div>
  );
}