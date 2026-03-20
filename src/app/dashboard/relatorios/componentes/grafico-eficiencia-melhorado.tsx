// src/app/dashboard/relatorios/componentes/grafico-eficiencia-melhorado.tsx
'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText, FileSpreadsheet, FileJson } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/components/ui/use-toast';

interface GraficoEficienciaMelhoradoProps {
  dados: any[];
  tipo: 'metragem' | 'tempo';
  title?: string;
}

const COLORS = {
  real: '#3b82f6',
  esperado: '#10b981',
  disponivel: '#94a3b8',
  apontado: '#f59e0b',
};

// Formatador para número abreviado (K, M)
const formatarNumeroAbreviado = (valor: number): string => {
  if (valor === null || valor === undefined || isNaN(valor)) return '-';
  
  if (valor >= 1000000) {
    return (valor / 1000000).toFixed(1).replace('.', ',') + 'M';
  }
  if (valor >= 1000) {
    return (valor / 1000).toFixed(1).replace('.', ',') + 'K';
  }
  return valor.toString();
};

// Formatador para tooltip
const formatarValor = (valor: number, unidade: string = 'm') => {
  if (valor === null || valor === undefined || isNaN(valor)) return '-';
  return valor.toLocaleString('pt-BR', { 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 0 
  }) + ` ${unidade}`;
};

const formatarTempo = (minutos: number): string => {
  if (!minutos) return '0h';
  const horas = Math.floor(minutos / 60);
  const mins = Math.floor(minutos % 60);
  if (horas > 0) {
    return `${horas}h ${mins > 0 ? `${mins}min` : ''}`;
  }
  return `${mins}min`;
};

const formatarTempoAbreviado = (minutos: number): string => {
  if (!minutos) return '-';
  const horas = Math.floor(minutos / 60);
  const mins = Math.floor(minutos % 60);
  if (horas > 0) {
    if (mins > 0) {
      return `${horas}h${mins}`;
    }
    return `${horas}h`;
  }
  return `${mins}min`;
};

// Função para exportar CSV
const exportarCSV = (dados: any[], tipo: string) => {
  if (!dados || dados.length === 0) {
    toast({
      title: 'Aviso',
      description: 'Não há dados para exportar',
      variant: 'default',
    });
    return;
  }

  const headers = tipo === 'metragem' 
    ? ['Máquina', 'Metragem Real (m)', 'Metragem Esperada (m)']
    : ['Máquina', 'Tempo Disponível (min)', 'Tempo Apontado (min)'];
  
  const linhas = dados.map(item => [
    item.nome,
    item.metragemReal || 0,
    tipo === 'metragem' ? (item.metragemEsperada || 0) : (item.tempoDisponivel || 0),
    tipo === 'metragem' ? '' : (item.tempoApontado || 0),
  ].filter(v => v !== ''));

  const csv = [headers.join(','), ...linhas.map(l => l.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `grafico-${tipo}-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();

  toast({
    title: 'Sucesso',
    description: 'CSV exportado com sucesso',
  });
};

// Função para exportar JSON
const exportarJSON = (dados: any[], tipo: string) => {
  if (!dados || dados.length === 0) {
    toast({
      title: 'Aviso',
      description: 'Não há dados para exportar',
      variant: 'default',
    });
    return;
  }

  const data = dados.map(item => ({
    maquina: item.nome,
    metragemReal: item.metragemReal,
    metragemEsperada: tipo === 'metragem' ? item.metragemEsperada : undefined,
    tempoDisponivel: tipo === 'tempo' ? item.tempoDisponivel : undefined,
    tempoApontado: tipo === 'tempo' ? item.tempoApontado : undefined,
  }));

  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `grafico-${tipo}-${new Date().toISOString().split('T')[0]}.json`;
  link.click();

  toast({
    title: 'Sucesso',
    description: 'JSON exportado com sucesso',
  });
};

export function GraficoEficienciaMelhorado({ dados, tipo, title }: GraficoEficienciaMelhoradoProps) {
  const titulo = title || (tipo === 'metragem' 
    ? 'Metragem por Máquina' 
    : 'Tempo Disponível vs Apontado');

  if (!dados || dados.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{titulo}</CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-1" /> Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportarCSV(dados, tipo)}>
                <FileSpreadsheet className="mr-2 h-4 w-4" /> CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportarJSON(dados, tipo)}>
                <FileJson className="mr-2 h-4 w-4" /> JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent className="h-[350px] flex items-center justify-center">
          <p className="text-gray-500">Nenhum dado disponível para o período</p>
        </CardContent>
      </Card>
    );
  }

  if (tipo === 'metragem') {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{titulo}</CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-1" /> Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportarCSV(dados, tipo)}>
                <FileSpreadsheet className="mr-2 h-4 w-4" /> CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportarJSON(dados, tipo)}>
                <FileJson className="mr-2 h-4 w-4" /> JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dados} layout="vertical" margin={{ top: 20, right: 30, left: 100, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis 
                  dataKey="nome" 
                  type="category" 
                  width={100}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  formatter={(value: any, name: string) => {
                    if (name === 'Metragem Real') return [formatarValor(value), name];
                    if (name === 'Metragem Esperada') return [formatarValor(value), name];
                    return [value, name];
                  }}
                />
                <Legend />
                <Bar 
                  dataKey="metragemReal" 
                  fill={COLORS.real} 
                  name="Metragem Real" 
                  barSize={20}
                >
                  <LabelList 
                    dataKey="metragemReal" 
                    position="right" 
                    formatter={(value: any) => formatarNumeroAbreviado(value)}
                    style={{ fill: '#000', fontSize: 11, fontWeight: 'bold' }}
                  />
                </Bar>
                <Bar 
                  dataKey="metragemEsperada" 
                  fill={COLORS.esperado} 
                  name="Metragem Esperada" 
                  barSize={20}
                >
                  <LabelList 
                    dataKey="metragemEsperada" 
                    position="right" 
                    formatter={(value: any) => formatarNumeroAbreviado(value)}
                    style={{ fill: '#000', fontSize: 11, fontWeight: 'bold' }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{titulo}</CardTitle>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-1" /> Exportar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => exportarCSV(dados, tipo)}>
              <FileSpreadsheet className="mr-2 h-4 w-4" /> CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportarJSON(dados, tipo)}>
              <FileJson className="mr-2 h-4 w-4" /> JSON
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dados} layout="vertical" margin={{ top: 20, right: 30, left: 100, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis 
                dataKey="nome" 
                type="category" 
                width={100}
                tick={{ fontSize: 12 }}
              />
              <Tooltip 
                formatter={(value: any, name: string) => {
                  if (name === 'Tempo Disponível') return [formatarTempo(value), name];
                  if (name === 'Tempo Apontado') return [formatarTempo(value), name];
                  return [value, name];
                }}
              />
              <Legend />
              <Bar 
                dataKey="tempoDisponivel" 
                fill={COLORS.disponivel} 
                name="Tempo Disponível" 
                barSize={20}
              >
                <LabelList 
                  dataKey="tempoDisponivel" 
                  position="right" 
                  formatter={(value: any) => formatarTempoAbreviado(value)}
                  style={{ fill: '#000', fontSize: 11, fontWeight: 'bold' }}
                />
              </Bar>
              <Bar 
                dataKey="tempoApontado" 
                fill={COLORS.apontado} 
                name="Tempo Apontado" 
                barSize={20}
              >
                <LabelList 
                  dataKey="tempoApontado" 
                  position="right" 
                  formatter={(value: any) => formatarTempoAbreviado(value)}
                  style={{ fill: '#000', fontSize: 11, fontWeight: 'bold' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}