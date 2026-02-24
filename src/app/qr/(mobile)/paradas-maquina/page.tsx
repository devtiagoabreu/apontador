'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { MobileCard } from '@/components/mobile/card';
import { MobileHeader } from '@/components/mobile/header';
import { MobileNav } from '@/components/mobile/nav';
import { toast } from '@/components/ui/use-toast';
import { Plus, Clock, CheckCircle } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface Parada {
  id: string;
  maquinaId: string;
  operadorId: string;
  motivoParadaId: string;
  observacoes: string | null;
  dataInicio: string;
  dataFim: string | null;
  maquina?: {
    nome: string;
    codigo: string;
  };
  motivo?: {
    descricao: string;
  };
}

export default function ParadasMaquinaMobilePage() {
  const router = useRouter();
  const [paradas, setParadas] = useState<Parada[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

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

  return (
    <div className="min-h-screen bg-gray-50">
      <MobileHeader 
        title="Paradas" 
        rightAction={
          <Button variant="ghost" size="icon" onClick={() => setShowForm(true)}>
            <Plus className="h-5 w-5" />
          </Button>
        }
      />

      <main className="p-4 pb-20">
        {loading ? (
          <div className="text-center py-8">Carregando...</div>
        ) : paradas.length === 0 ? (
          <MobileCard className="text-center py-8 text-gray-500">
            Nenhuma parada ativa no momento
          </MobileCard>
        ) : (
          <div className="space-y-3">
            {paradas.map((parada) => (
              <MobileCard key={parada.id}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">⏸️ Parada</span>
                      <span className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded-full">
                        Em andamento
                      </span>
                    </div>
                    <p className="text-base font-semibold mt-2">
                      {parada.maquina?.nome}
                    </p>
                    <p className="text-sm text-gray-600">
                      {parada.motivo?.descricao}
                    </p>
                    {parada.observacoes && (
                      <p className="text-xs text-gray-500 mt-1">
                        {parada.observacoes}
                      </p>
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
                    onClick={async () => {
                      await fetch(`/api/paradas-maquina/${parada.id}/finalizar`, {
                        method: 'POST',
                      });
                      toast({
                        title: 'Sucesso',
                        description: 'Parada finalizada',
                      });
                      carregarParadas();
                    }}
                  >
                    <CheckCircle className="h-4 w-4" />
                  </Button>
                </div>
              </MobileCard>
            ))}
          </div>
        )}
      </main>

      <MobileNav />

      {/* Modal de Nova Parada (simplificado) */}
      <Sheet open={showForm} onOpenChange={setShowForm}>
        <SheetContent side="bottom" className="h-[90vh]">
          <SheetHeader>
            <SheetTitle>Nova Parada</SheetTitle>
          </SheetHeader>
          <div className="p-4">
            <p className="text-center text-gray-500">
              Formulário de parada (a ser implementado)
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}