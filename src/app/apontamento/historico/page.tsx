'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MobileHeader } from '@/components/mobile/header';
import { MobileNav } from '@/components/mobile/nav';
import { MobileCard } from '@/components/mobile/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface Apontamento {
  id: string;
  tipo: string;
  opId: number;
  dataInicio: string;
  dataFim: string;
  metragemProcessada?: number;
  op?: {
    op: number;
    produto: string;
  };
  maquina?: {
    nome: string;
  };
}

export default function HistoricoPage() {
  const [historico, setHistorico] = useState<Apontamento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarHistorico();
  }, []);

  async function carregarHistorico() {
    try {
      const response = await fetch('/api/apontamentos?limit=20');
      const data = await response.json();
      setHistorico(data.data || []);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <MobileHeader user={{ nome: 'Operador', matricula: '123' }} />
      
      <main className="p-4 pb-20">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/apontamento">
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <ArrowLeft className="h-6 w-6" />
            </Button>
          </Link>
          <h1 className="text-xl font-semibold">Meu Histórico</h1>
        </div>

        {loading ? (
          <div className="text-center py-8">Carregando...</div>
        ) : historico.length === 0 ? (
          <MobileCard className="text-center py-8 text-gray-500">
            Nenhum histórico encontrado
          </MobileCard>
        ) : (
          <div className="space-y-3">
            {historico.map((item) => (
              <MobileCard key={item.id}>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <p className="font-medium">OP {item.op?.op}</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      item.tipo === 'PRODUCAO' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {item.tipo === 'PRODUCAO' ? 'Produção' : 'Parada'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{item.op?.produto}</p>
                  <p className="text-sm">Máquina: {item.maquina?.nome}</p>
                  <p className="text-xs text-gray-500">
                    {formatDate(item.dataInicio)} - {formatDate(item.dataFim)}
                  </p>
                  {item.metragemProcessada && (
                    <p className="text-xs text-gray-600">
                      Metragem: {item.metragemProcessada}m
                    </p>
                  )}
                </div>
              </MobileCard>
            ))}
          </div>
        )}
      </main>
      
      <MobileNav />
    </div>
  );
}