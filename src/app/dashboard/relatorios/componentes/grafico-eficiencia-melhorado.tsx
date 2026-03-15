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
  Line,
  ComposedChart,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface GraficoEficienciaMelhoradoProps {
  dados: any[];
  tipo: 'metragem' | 'tempo';
  referencia: 'produto' | 'maquina';
}

const COLORS = {
  real: '#3b82f6',
  esperado: '#10b981',
  eficiencia: '#ef4444',
  disponivel: '#94a3b8',
  apontado: '#f59e0b',
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

const formatarPercentual = (valor: number) => {
  if (valor === null || valor === undefined || isNaN(valor)) return '-';
  return valor.toFixed(1) + '%';
};

export function GraficoEficienciaMelhorado({ dados, tipo, referencia }: GraficoEficienciaMelhoradoProps) {
  const titulo = tipo === 'metragem' 
    ? 'Metragem por Máquina' 
    : 'Tempo Disponível vs Apontado';

  if (!dados || dados.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{titulo}</CardTitle>
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
        <CardHeader>
          <CardTitle>{titulo}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={dados} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis 
                  dataKey="nome" 
                  type="category" 
                  width={120}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  formatter={(value: any, name: string) => {
                    if (name === 'Eficiência') return [formatarPercentual(value), name];
                    return [formatarValor(value), name];
                  }}
                />
                <Legend />
                <Bar 
                  dataKey="metragemReal" 
                  fill={COLORS.real} 
                  name="Metragem Real" 
                  barSize={20}
                />
                <Bar 
                  dataKey="metragemEsperada" 
                  fill={COLORS.esperado} 
                  name="Metragem Esperada" 
                  barSize={20}
                />
                <Line
                  type="monotone"
                  dataKey="eficiencia"
                  stroke={COLORS.eficiencia}
                  name="Eficiência %"
                  strokeWidth={2}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dados} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis 
                dataKey="nome" 
                type="category" 
                width={120}
                tick={{ fontSize: 12 }}
              />
              <Tooltip 
                formatter={(value: any, name: string) => {
                  if (name === 'Disponível') return [formatarTempo(value), name];
                  if (name === 'Apontado') return [formatarTempo(value), name];
                  return [value, name];
                }}
              />
              <Legend />
              <Bar 
                dataKey="tempoDisponivel" 
                fill={COLORS.disponivel} 
                name="Tempo Disponível" 
                barSize={20}
              />
              <Bar 
                dataKey="tempoApontado" 
                fill={COLORS.apontado} 
                name="Tempo Apontado" 
                barSize={20}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}