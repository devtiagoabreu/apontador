// src/app/dashboard/manutencao/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from '@/components/ui/use-toast';
import { CalendarDays, Clock, ListTodo, Wrench, CheckCircle, ArrowRight } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface Agendamento {
  id: string;
  maquinaNome?: string;
  dataPrevista: string;
  status: string;
}

interface Manutencao {
  id: string;
  maquinaNome?: string;
  tipoNome?: string;
  atividadeNome?: string;
  operadorInicioNome?: string;
  dataInicio: string;
  dataFim?: string;
  status: string;
}

export default function DashboardManutencaoPage() {
  const [carregando, setCarregando] = useState(true);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [emAndamento, setEmAndamento] = useState<Manutencao[]>([]);
  const [ultimosConcluidos, setUltimosConcluidos] = useState<Manutencao[]>([]);

  const carregarDados = useCallback(async () => {
    try {
      const [agendRes, andamentoRes, concluidasRes] = await Promise.all([
        fetch('/api/agendamentos-manutencao?status=AGENDADO&limit=500'),
        fetch('/api/manutencoes?status=EM_ANDAMENTO&limit=50'),
        fetch('/api/manutencoes?status=CONCLUIDA&limit=5'),
      ]);

      const [agendData, andamentoData, concluidasData] = await Promise.all([
        agendRes.json(),
        andamentoRes.json(),
        concluidasRes.json(),
      ]);

      setAgendamentos(agendData || []);
      setEmAndamento(andamentoData || []);
      setUltimosConcluidos(concluidasData || []);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados de manutenção',
        variant: 'destructive',
      });
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // Calcular contadores
  const hojeInicio = new Date();
  hojeInicio.setHours(0, 0, 0, 0);
  const amanhaInicio = new Date(hojeInicio);
  amanhaInicio.setDate(amanhaInicio.getDate() + 1);

  const agendadosHoje = agendamentos.filter((a) => {
    const d = new Date(a.dataPrevista);
    return d >= hojeInicio && d < amanhaInicio;
  }).length;

  const atrasados = agendamentos.filter((a) => {
    const d = new Date(a.dataPrevista);
    return d < hojeInicio;
  }).length;

  const pendentes = agendamentos.length;

  const cards = [
    {
      titulo: 'Agendamentos Hoje',
      valor: agendadosHoje,
      icon: CalendarDays,
      cor: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      titulo: 'Atrasados',
      valor: atrasados,
      icon: Clock,
      cor: 'text-red-600',
      bg: 'bg-red-50',
    },
    {
      titulo: 'Pendentes',
      valor: pendentes,
      icon: ListTodo,
      cor: 'text-yellow-600',
      bg: 'bg-yellow-50',
    },
    {
      titulo: 'Em Andamento',
      valor: emAndamento.length,
      icon: Wrench,
      cor: 'text-purple-600',
      bg: 'bg-purple-50',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Manutenção</h1>
        <div className="flex gap-2">
          <Link href="/dashboard/manutencao/agendamentos">
            <Button variant="outline">
              Agendamentos
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="/dashboard/manutencao/historico">
            <Button variant="outline">
              Histórico
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Cards de contadores */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.titulo}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.titulo}</CardTitle>
                <Icon className={`h-4 w-4 ${card.cor}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${card.cor}`}>
                  {carregando ? '...' : card.valor}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Em andamento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-purple-600" />
            Manutenções em Andamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Máquina</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Atividade</TableHead>
                  <TableHead>Operador</TableHead>
                  <TableHead>Início</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {carregando ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : emAndamento.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      Nenhuma manutenção em andamento
                    </TableCell>
                  </TableRow>
                ) : (
                  emAndamento.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.maquinaNome}</TableCell>
                      <TableCell>{m.tipoNome}</TableCell>
                      <TableCell>{m.atividadeNome}</TableCell>
                      <TableCell>{m.operadorInicioNome}</TableCell>
                      <TableCell>{formatDate(m.dataInicio)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Últimos concluídos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Últimos Concluídos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Máquina</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Atividade</TableHead>
                  <TableHead>Operador</TableHead>
                  <TableHead>Fim</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {carregando ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : ultimosConcluidos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      Nenhuma manutenção concluída
                    </TableCell>
                  </TableRow>
                ) : (
                  ultimosConcluidos.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.maquinaNome}</TableCell>
                      <TableCell>{m.tipoNome}</TableCell>
                      <TableCell>{m.atividadeNome}</TableCell>
                      <TableCell>{m.operadorInicioNome}</TableCell>
                      <TableCell>{m.dataFim ? formatDate(m.dataFim) : '—'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}