'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MobileCard } from '@/components/mobile/card';
import { MobileHeader } from '@/components/mobile/header';
import { MobileNav } from '@/components/mobile/nav';
import { ArrowLeft, Play } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

interface OP {
  op: number;
  produto: string;
  qtdeCarregado: number;
  um: string;
  status: string;
}

interface Maquina {
  id: string;
  nome: string;
  codigo: string;
  status: string;
}

interface Estagio {
  id: string;
  nome: string;
  cor: string;
}

export default function IniciarProducaoMobilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [ops, setOps] = useState<OP[]>([]);
  const [maquinas, setMaquinas] = useState<Maquina[]>([]);
  const [estagios, setEstagios] = useState<Estagio[]>([]);
  
  const [selectedOp, setSelectedOp] = useState('');
  const [selectedMaquina, setSelectedMaquina] = useState('');
  const [selectedEstagio, setSelectedEstagio] = useState('');
  const [isReprocesso, setIsReprocesso] = useState(false);

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    try {
      const [opsRes, maquinasRes, estagiosRes] = await Promise.all([
        fetch('/api/ops?limit=1000'),
        fetch('/api/maquinas'),
        fetch('/api/estagios?ativos=true'),
      ]);

      const opsData = await opsRes.json();
      const maquinasData = await maquinasRes.json();
      const estagiosData = await estagiosRes.json();

      // Filtrar OPs disponíveis (abertas ou com último estágio finalizado)
      const opsDisponiveis = (opsData.data || opsData).filter((op: OP) => {
        if (op.status === 'CANCELADA' || op.status === 'FINALIZADA') return false;
        return true;
      });

      setOps(opsDisponiveis);
      setMaquinas(maquinasData.filter((m: Maquina) => m.status === 'DISPONIVEL'));
      setEstagios(estagiosData);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados',
        variant: 'destructive',
      });
    }
  }

  async function handleIniciar() {
    if (!selectedOp || !selectedMaquina || !selectedEstagio) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/producoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opId: parseInt(selectedOp),
          maquinaId: selectedMaquina,
          operadorInicioId: '5ee971b6-be6b-4b1e-9313-f0abf755ba94', // ID fixo do operador (depois pegar da sessão)
          estagioId: selectedEstagio,
          isReprocesso,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao iniciar');
      }

      toast({
        title: 'Sucesso',
        description: 'Produção iniciada com sucesso',
      });

      router.push('/apontamento/producoes');
      
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao iniciar',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <MobileHeader user={{ nome: 'Operador', matricula: '123' }} />
      
      <main className="p-4 pb-20">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/apontamento/producoes">
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <ArrowLeft className="h-6 w-6" />
            </Button>
          </Link>
          <h1 className="text-xl font-semibold">Iniciar Produção</h1>
        </div>

        <MobileCard>
          <div className="space-y-4">
            {/* OP */}
            <div className="space-y-2">
              <Label>OP</Label>
              <Select value={selectedOp} onValueChange={setSelectedOp}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a OP" />
                </SelectTrigger>
                <SelectContent>
                  {ops.map((op) => (
                    <SelectItem key={op.op} value={op.op.toString()}>
                      OP {op.op} - {op.produto.substring(0, 30)} ({op.qtdeCarregado} {op.um})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Máquina */}
            <div className="space-y-2">
              <Label>Máquina</Label>
              <Select value={selectedMaquina} onValueChange={setSelectedMaquina}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a máquina" />
                </SelectTrigger>
                <SelectContent>
                  {maquinas.map((maquina) => (
                    <SelectItem key={maquina.id} value={maquina.id}>
                      {maquina.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Estágio */}
            <div className="space-y-2">
              <Label>Estágio</Label>
              <Select value={selectedEstagio} onValueChange={setSelectedEstagio}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o estágio" />
                </SelectTrigger>
                <SelectContent>
                  {estagios.map((estagio) => (
                    <SelectItem key={estagio.id} value={estagio.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: estagio.cor }} />
                        <span>{estagio.nome}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reprocesso */}
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="reprocesso"
                checked={isReprocesso}
                onCheckedChange={(checked) => setIsReprocesso(checked as boolean)}
              />
              <Label htmlFor="reprocesso">É reprocesso?</Label>
            </div>

            {/* Botão */}
            <Button 
              className="w-full"
              onClick={handleIniciar}
              disabled={loading}
            >
              <Play className="mr-2 h-4 w-4" />
              {loading ? 'Iniciando...' : 'Iniciar Produção'}
            </Button>
          </div>
        </MobileCard>
      </main>
      
      <MobileNav />
    </div>
  );
}