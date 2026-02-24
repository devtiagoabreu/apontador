'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MobileHeader } from '@/components/mobile/header';
import { MobileNav } from '@/components/mobile/nav';
import { MobileCard } from '@/components/mobile/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Play, Pause } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface ApontamentoAtivo {
  id: string;
  opId: number;
  maquinaId: string;
  dataInicio: string;
  op?: {
    op: number;
    produto: string;
  };
  maquina?: {
    nome: string;
    codigo: string;
  };
}

export default function AtivosPage() {
  const [ativos, setAtivos] = useState<ApontamentoAtivo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarAtivos();
  }, []);

  async function carregarAtivos() {
    try {
      const response = await fetch('/api/apontamentos?status=EM_ANDAMENTO');
      const data = await response.json();
      setAtivos(data.data || []);
    } catch (error) {
      console.error('Erro ao carregar ativos:', error);
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
          <h1 className="text-xl font-semibold">Processos Ativos</h1>
        </div>

        {loading ? (
          <div className="text-center py-8">Carregando...</div>
        ) : ativos.length === 0 ? (
          <MobileCard className="text-center py-8 text-gray-500">
            Nenhum processo ativo no momento
          </MobileCard>
        ) : (
          <div className="space-y-3">
            {ativos.map((item) => (
              <MobileCard key={item.id}>
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">OP {item.op?.op}</p>
                      <p className="text-sm text-gray-600">{item.op?.produto}</p>
                    </div>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                      Em andamento
                    </span>
                  </div>
                  <p className="text-sm">Máquina: {item.maquina?.nome}</p>
                  <p className="text-xs text-gray-500">
                    Iniciado: {formatDate(item.dataInicio)}
                  </p>
                  <div className="flex gap-2 pt-2">
                    <Link href={`/apontamento/finalizar?apontamento=${item.id}`} className="flex-1">
                      <Button size="sm" className="w-full">
                        <Play className="h-4 w-4 mr-1" /> Finalizar
                      </Button>
                    </Link>
                    <Link href={`/apontamento/parada?maquinaId=${item.maquinaId}&opId=${item.opId}`} className="flex-1">
                      <Button size="sm" variant="outline" className="w-full text-yellow-600">
                        <Pause className="h-4 w-4 mr-1" /> Parada
                      </Button>
                    </Link>
                  </div>
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