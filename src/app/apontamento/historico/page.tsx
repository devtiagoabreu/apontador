'use client';

import { useState, useEffect } from 'react';
import { MobileCard } from '@/components/mobile/card';
import { Clock, CheckCircle, Pause } from 'lucide-react';
import { formatDate, formatNumber } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';

interface HistoricoItem {
  id: string;
  tipo: 'PRODUCAO' | 'PARADA';
  opId: number | null;
  dataInicio: string;
  dataFim: string | null;
  metragemProcessada?: number;
  op?: {
    op: number;
    produto: string;
    um: string;
  };
  maquina?: {
    nome: string;
  };
  motivo?: {
    descricao: string;
  };
}

export default function HistoricoPage() {
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
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
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o histórico',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4">Meu Histórico</h1>

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
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {item.tipo === 'PRODUCAO' ? (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" /> Produção
                    </span>
                  ) : (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full flex items-center gap-1">
                      <Pause className="h-3 w-3" /> Parada
                    </span>
                  )}
                  <span className="text-xs text-gray-500">
                    {formatDate(item.dataInicio)}
                  </span>
                </div>

                {item.tipo === 'PRODUCAO' ? (
                  <>
                    <p className="font-medium">OP {item.op?.op}</p>
                    <p className="text-sm text-gray-600 line-clamp-2">{item.op?.produto}</p>
                    {item.metragemProcessada && (
                      <p className="text-sm">
                        Produzido: {formatNumber(item.metragemProcessada)} {item.op?.um}
                      </p>
                    )}
                    <p className="text-xs text-gray-400">Máquina: {item.maquina?.nome}</p>
                  </>
                ) : (
                  <>
                    <p className="font-medium">{item.maquina?.nome}</p>
                    <p className="text-sm text-gray-600">{item.motivo?.descricao}</p>
                    {item.opId && (
                      <p className="text-xs text-gray-500">OP {item.opId} estava em produção</p>
                    )}
                  </>
                )}
              </div>
            </MobileCard>
          ))}
        </div>
      )}
    </div>
  );
}