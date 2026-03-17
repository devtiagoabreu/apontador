// src/app/dashboard/relatorios/componentes/grafico-operadores.tsx
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

interface GraficoOperadoresProps {
  dados: any[];
}

// Função para formatar número no padrão brasileiro com abreviação (K, M)
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

// Função para formatar número completo no tooltip
const formatarNumeroCompleto = (valor: number): string => {
  if (valor === null || valor === undefined || isNaN(valor)) return '-';
  return valor.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + ' m';
};

export function GraficoOperadores({ dados }: GraficoOperadoresProps) {
  const titulo = 'Produção por Operador';

  console.log('📊 GraficoOperadores - dados recebidos:', dados);

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

  // Ordenar por metragem (maior para menor)
  const dadosOrdenados = [...dados].sort((a, b) => b.totalMetragem - a.totalMetragem);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={dadosOrdenados} 
              layout="vertical"
              margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                type="number"
                tickFormatter={(value) => formatarNumeroAbreviado(value)}
              />
              <YAxis 
                dataKey="nome" 
                type="category"
                width={90}
                tick={{ fontSize: 12 }}
              />
              <Tooltip 
                formatter={(value: any) => [formatarNumeroCompleto(value), 'Metragem']}
                labelFormatter={(label) => `Operador: ${label}`}
              />
              <Legend />
              <Bar dataKey="totalMetragem" fill="#8b5cf6" name="Metros Produzidos">
                <LabelList 
                  dataKey="totalMetragem" 
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