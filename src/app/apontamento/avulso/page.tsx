// src/app/apontamento/avulso/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { MobileCard } from '@/components/mobile/card';
import { QrCode, Clock, CheckCircle, Package, ArrowLeft, Loader2 } from 'lucide-react';
import { formatDate, formatNumber } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import Link from 'next/link';

export default function ApontamentoAvulsoPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [producoesAtivas, setProducoesAtivas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Carrega as produções avulsas ativas do operador logado
  async function carregarAtivos() {
    if (!session?.user?.id) return;
    
    setLoading(true);
    try {
      // Busca apenas produções avulsas (portadas/carrolões) que não foram finalizadas
      const res = await fetch(`/api/producoes-avulsas?operadorId=${session.user.id}&ativas=true`);
      const result = await res.json();
      
      if (res.ok) {
        setProducoesAtivas(result.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar produções avulsas:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao sincronizar produções ativas.',
        variant: 'destructive',
      });
    } finally {
      // CORREÇÃO: Garante que o loading pare mesmo em caso de erro [1, 3]
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status === 'authenticated') {
      carregarAtivos();
    }
  }, [status]);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-4" />
        <p className="text-gray-500 font-medium">Carregando painel avulso...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <main className="p-4 space-y-6">
        {/* Boas-vindas */}
        <div className="bg-white rounded-xl p-5 shadow-sm border-t-4 border-blue-600">
          <h2 className="text-xl font-bold text-blue-900 italic">Produção Avulsa</h2>
          <p className="text-sm text-gray-500">Olá, {session?.user?.nome}! Pronto para iniciar?</p>
        </div>

        {/* FUNCIONALIDADE SUGERIDA: Botão de Escanear Máquina [601, User Query] */}
        <Link href="/apontamento/leitor">
          <Button className="w-full h-20 text-xl gap-4 bg-blue-600 hover:bg-blue-700 shadow-lg">
            <QrCode className="h-8 w-8" />
            Escanear Máquina
          </Button>
        </Link>

        {/* Listagem de Produções em Andamento */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-bold text-gray-700 uppercase text-xs tracking-wider flex items-center gap-2">
              <Clock size={14} className="text-blue-600" /> Atividades em Aberto
            </h3>
            <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-bold">
              {producoesAtivas.length}
            </span>
          </div>

          {producoesAtivas.length === 0 ? (
            <MobileCard className="text-center py-10 text-gray-400 border-dashed border-2">
              <Package size={32} className="mx-auto mb-2 opacity-20" />
              <p className="text-sm">Nenhuma portada ou carrolão <br /> sendo produzido agora.</p>
            </MobileCard>
          ) : (
            producoesAtivas.map((item) => (
              <MobileCard key={item.id} className="border-l-4 border-l-blue-500">
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase">Portada / Produto</p>
                      <p className="font-bold text-blue-900">{item.produto_codigo}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-gray-400 uppercase">Máquina</p>
                      <p className="font-semibold text-gray-700">{item.maquina_nome}</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-end pt-2 border-t border-gray-50">
                    <div className="space-y-1">
                      <p className="text-[10px] text-gray-400 flex items-center gap-1">
                        <Clock size={10} /> Iniciado: {formatDate(item.data_inicio)}
                      </p>
                      <p className="text-[10px] text-gray-400 flex items-center gap-1">
                        <Package size={10} /> Estágio: {item.estagio_nome}
                      </p>
                    </div>
                    
                    <Link href={`/apontamento/avulso/finalizar?id=${item.id}`}>
                      <Button size="sm" className="bg-green-600 hover:bg-green-700 font-bold h-9">
                        <CheckCircle className="h-4 w-4 mr-1" /> Finalizar
                      </Button>
                    </Link>
                  </div>
                </div>
              </MobileCard>
            ))
          )}
        </div>
      </main>
    </div>
  );
}