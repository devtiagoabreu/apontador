// src/app/dashboard/relatorios/componentes/grafico-producao.tsx
'use client';

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface GraficoProducaoProps {
  dados: any[];
  tipo: 'diario' | 'acumulado';
}

const formatarValor = (valor: number) => {
  if (valor === null || valor === undefined || isNaN(valor)) return '-';
  return valor.toLocaleString('pt-BR', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  }) + ' m';
};

export function GraficoProducao({ dados, tipo }: GraficoProducaoProps) {
  const titulo = tipo === 'diario' ? 'Produção Diária' : 'Produção Acumulada';

  if (!dados || dados.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{titulo}</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p className="text-gray-500">Nenhum dado disponível para o período</p>
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
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            {tipo === 'diario' ? (
              <BarChart data={dados}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="data" />
                <YAxis tickFormatter={(value) => value.toLocaleString('pt-BR')} />
                <Tooltip formatter={(value: any) => [formatarValor(value), 'Metragem']} />
                <Legend />
                <Bar dataKey="metragemReal" fill="#3b82f6" name="Metros Produzidos" />
              </BarChart>
            ) : (
              <LineChart data={dados}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="data" />
                <YAxis tickFormatter={(value) => value.toLocaleString('pt-BR')} />
                <Tooltip formatter={(value: any) => [formatarValor(value), 'Metros Acumulados']} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="metragemReal"
                  stroke="#10b981"
                  name="Metros Acumulados"
                  strokeWidth={2}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}