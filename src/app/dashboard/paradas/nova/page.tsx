'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Maquina {
  id: string;
  nome: string;
  codigo: string;
  status: string;
}

interface MotivoParada {
  id: string;
  codigo: string;
  descricao: string;
}

export default function NovaParadaPage() {
  const router = useRouter();
  const [maquinas, setMaquinas] = useState<Maquina[]>([]);
  const [motivos, setMotivos] = useState<MotivoParada[]>([]);
  const [selectedMaquina, setSelectedMaquina] = useState('');
  const [selectedMotivo, setSelectedMotivo] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    try {
      const [maquinasRes, motivosRes] = await Promise.all([
        fetch('/api/maquinas?status=DISPONIVEL,EM_PROCESSO'),
        fetch('/api/motivos-parada'),
      ]);

      const maquinasData = await maquinasRes.json();
      const motivosData = await motivosRes.json();

      setMaquinas(maquinasData);
      setMotivos(motivosData);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados',
        variant: 'destructive',
      });
    }
  }

  async function handleSubmit() {
    if (!selectedMaquina) {
      toast({
        title: 'Erro',
        description: 'Selecione uma máquina',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedMotivo) {
      toast({
        title: 'Erro',
        description: 'Selecione um motivo',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/paradas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maquinaId: selectedMaquina,
          motivoParadaId: selectedMotivo,
          observacoes,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao registrar parada');
      }

      toast({
        title: 'Sucesso',
        description: 'Parada registrada com sucesso',
      });

      router.push('/dashboard/paradas');
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao registrar',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/paradas">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Registrar Parada de Máquina</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações da Parada</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="maquina">Máquina *</Label>
            <Select value={selectedMaquina} onValueChange={setSelectedMaquina}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a máquina" />
              </SelectTrigger>
              <SelectContent>
                {maquinas.map((maquina) => (
                  <SelectItem key={maquina.id} value={maquina.id}>
                    {maquina.codigo} - {maquina.nome} ({maquina.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo da Parada *</Label>
            <Select value={selectedMotivo} onValueChange={setSelectedMotivo}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o motivo" />
              </SelectTrigger>
              <SelectContent>
                {motivos.map((motivo) => (
                  <SelectItem key={motivo.id} value={motivo.id}>
                    {motivo.codigo} - {motivo.descricao}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Descreva o motivo da parada..."
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Registrando...' : 'Registrar Parada'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}