// src/app/dashboard/relatorios/componentes/grafico-eficiencia.tsx
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface GraficoEficienciaProps {
  dados: any[];
  tipo: 'comparativo' | 'estagios';
  referencia: 'produto' | 'maquina';
}

const COLORS = {
  real: '#3b82f6',
  esperadoProduto: '#10b981',
  esperadoMaquina: '#f59e0b',
  eficiencia: '#ef4444',
};

export function GraficoEficiencia({ dados, tipo, referencia }: GraficoEficienciaProps) {
  const titulo = tipo === 'comparativo' 
    ? 'Metragem Real vs Esperada' 
    : 'Eficiência por Estágio';

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

  if (tipo === 'comparativo') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{titulo}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={dados}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="data" />
                <YAxis yAxisId="left" orientation="left" stroke={COLORS.real} />
                <YAxis yAxisId="right" orientation="right" stroke={COLORS.eficiencia} />
                <Tooltip />
                <Legend />
                <Bar 
                  yAxisId="left" 
                  dataKey="metragemReal" 
                  fill={COLORS.real} 
                  name="Metragem Real" 
                />
                <Bar 
                  yAxisId="left" 
                  dataKey={referencia === 'produto' ? 'metragemEsperadaProduto' : 'metragemEsperadaMaquina'} 
                  fill={referencia === 'produto' ? COLORS.esperadoProduto : COLORS.esperadoMaquina} 
                  name={`Metragem Esperada (${referencia === 'produto' ? 'Produto' : 'Máquina'})`} 
                />
                <Line
                  yAxisId="right"
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

  // 🔴 CORREÇÃO: Para o gráfico de eficiência por estágio, precisamos de uma abordagem diferente
  // Vamos preparar os dados com a cor já definida
  const dadosComCor = dados.map((item) => {
    const valor = referencia === 'produto' ? item.eficienciaProduto : item.eficienciaMaquina;
    let cor = '#10b981'; // verde
    if (valor < 80) cor = '#f59e0b'; // amarelo
    if (valor < 60) cor = '#ef4444'; // vermelho
    
    return {
      ...item,
      cor,
      valorEficiencia: valor,
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dadosComCor} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} />
              <YAxis dataKey="estagio" type="category" width={100} />
              <Tooltip 
                formatter={(value: any) => [`${value.toFixed(1)}%`, 'Eficiência']}
              />
              <Legend />
              <Bar 
                dataKey="valorEficiencia" 
                name={`Eficiência (${referencia === 'produto' ? 'Produto' : 'Máquina'})`}
              >
                {dadosComCor.map((entry, index) => (
                  <Bar
                    key={`cell-${index}`}
                    dataKey="valorEficiencia"
                    fill={entry.cor}
                    stroke={entry.cor}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
