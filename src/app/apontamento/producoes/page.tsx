'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MobileCard } from '@/components/mobile/card';
import { Plus, Clock, CheckCircle, Pause } from 'lucide-react';
import { formatDate, formatNumber } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';

interface Producao {
  id: string;
  opId: number;
  maquinaId: string;
  estagioId: string;
  dataInicio: string;
  op?: {
    op: number;
    produto: string;
    carregado: number;
    um: string;
  };
  maquina?: {
    nome: string;
    codigo: string;
  };
  estagio?: {
    nome: string;
    cor: string;
  };
}

function getEstagioStyle(estagio: any) {
  if (!estagio?.cor) {
    return {
      backgroundColor: '#f3f4f6',
      color: '#374151',
      border: '1px solid #e5e7eb'
    };
  }
  return {
    backgroundColor: `${estagio.cor}15`,
    color: estagio.cor,
    border: '1px solid transparent',
    fontWeight: '500'
  };
}

export default function ProducoesPage() {
  const [producoes, setProducoes] = useState<Producao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarProducoes();
  }, []);

  async function carregarProducoes() {
    try {
      const response = await fetch('/api/producoes?ativas=true');
      const data = await response.json();
      setProducoes(data.data || []);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as produções',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Produções</h1>
        <Link href="/apontamento/producoes/iniciar">
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" /> Nova
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-8">Carregando...</div>
      ) : producoes.length === 0 ? (
        <MobileCard className="text-center py-8 text-gray-500">
          Nenhuma produção em andamento
        </MobileCard>
      ) : (
        <div className="space-y-3">
          {producoes.map((prod) => {
            const estiloEstagio = getEstagioStyle(prod.estagio);

            return (
              <MobileCard key={prod.id}>
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">OP {prod.op?.op || '---'}</p>
                      <p className="text-sm text-gray-500 line-clamp-2">
                        {prod.op?.produto || 'Produto não especificado'}
                      </p>
                    </div>
                    <span 
                      className="text-xs px-3 py-1 rounded-full font-medium"
                      style={estiloEstagio}
                    >
                      {prod.estagio?.nome || 'Sem estágio'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Máquina:</span>
                      <p className="font-medium">{prod.maquina?.nome || '-'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Carregado:</span>
                      <p className="font-medium">
                        {formatNumber(prod.op?.carregado || 0)} {prod.op?.um || 'm'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="h-3 w-3" />
                    {prod.dataInicio ? formatDate(prod.dataInicio) : '-'}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Link href={`/apontamento/producoes/finalizar?id=${prod.id}`} className="flex-1">
                      <Button size="sm" className="w-full bg-green-600 hover:bg-green-700">
                        <CheckCircle className="h-4 w-4 mr-1" /> Finalizar
                      </Button>
                    </Link>
                    <Link 
                      href={`/apontamento/parada?maquinaId=${prod.maquinaId}&opId=${prod.opId}`} 
                      className="flex-1"
                    >
                      <Button size="sm" variant="outline" className="w-full text-yellow-600">
                        <Pause className="h-4 w-4 mr-1" /> Parada
                      </Button>
                    </Link>
                  </div>
                </div>
              </MobileCard>
            );
          })}
        </div>
      )}
    </div>
  );
}