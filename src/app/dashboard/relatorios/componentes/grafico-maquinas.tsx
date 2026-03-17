// src/app/dashboard/relatorios/componentes/grafico-maquinas.tsx
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
  ComposedChart,
  Line,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface GraficoMaquinasProps {
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

// Função para formatar tempo
const formatarTempo = (minutos: number): string => {
  if (!minutos) return '-';
  const horas = Math.floor(minutos / 60);
  const mins = Math.floor(minutos % 60);
  if (horas > 0) {
    return `${horas}h ${mins > 0 ? `${mins}min` : ''}`;
  }
  return `${mins}min`;
};

// Função para formatar percentual
const formatarPercentual = (valor: number): string => {
  if (valor === null || valor === undefined || isNaN(valor)) return '-';
  return valor.toFixed(1) + '%';
};

export function GraficoMaquinas({ dados }: GraficoMaquinasProps) {
  const titulo = 'Análise por Máquina';

  console.log('📊 GraficoMaquinas - dados recebidos:', dados);

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
        <Tabs defaultValue="producao">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="producao">Produção</TabsTrigger>
            <TabsTrigger value="tempo">Tempo</TabsTrigger>
            <TabsTrigger value="eficiencia">Eficiência</TabsTrigger>
          </TabsList>

          <TabsContent value="producao" className="mt-4">
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
                    labelFormatter={(label) => `Máquina: ${label}`}
                  />
                  <Legend />
                  <Bar dataKey="totalMetragem" fill="#3b82f6" name="Metros Produzidos">
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
          </TabsContent>

          <TabsContent value="tempo" className="mt-4">
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
                    tickFormatter={(value) => formatarTempo(value)}
                  />
                  <YAxis 
                    dataKey="nome" 
                    type="category"
                    width={90}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    formatter={(value: any, name: string) => {
                      if (name === 'Tempo Produção') return [formatarTempo(value), name];
                      if (name === 'Tempo Parada') return [formatarTempo(value), name];
                      return [value, name];
                    }}
                    labelFormatter={(label) => `Máquina: ${label}`}
                  />
                  <Legend />
                  <Bar dataKey="tempoProducao" fill="#10b981" name="Tempo Produção">
                    <LabelList 
                      dataKey="tempoProducao" 
                      position="right" 
                      formatter={(value: any) => formatarTempo(value)}
                      style={{ fill: '#000', fontSize: 11, fontWeight: 'bold' }}
                    />
                  </Bar>
                  <Bar dataKey="tempoParada" fill="#f59e0b" name="Tempo Parada">
                    <LabelList 
                      dataKey="tempoParada" 
                      position="right" 
                      formatter={(value: any) => formatarTempo(value)}
                      style={{ fill: '#000', fontSize: 11, fontWeight: 'bold' }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="eficiencia" className="mt-4">
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
                    domain={[0, 100]}
                    tickFormatter={(value) => value.toFixed(0) + '%'}
                  />
                  <YAxis 
                    dataKey="nome" 
                    type="category"
                    width={90}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    formatter={(value: any, name: string) => {
                      if (name === 'Disponibilidade') return [formatarPercentual(value), name];
                      if (name === 'Eficiência') return [formatarPercentual(value), name];
                      return [value, name];
                    }}
                    labelFormatter={(label) => `Máquina: ${label}`}
                  />
                  <Legend />
                  <Bar dataKey="disponibilidade" fill="#8b5cf6" name="Disponibilidade">
                    <LabelList 
                      dataKey="disponibilidade" 
                      position="right" 
                      formatter={(value: any) => formatarPercentual(value)}
                      style={{ fill: '#000', fontSize: 11, fontWeight: 'bold' }}
                    />
                  </Bar>
                  <Bar dataKey="eficiencia" fill="#ec4899" name="Eficiência">
                    <LabelList 
                      dataKey="eficiencia" 
                      position="right" 
                      formatter={(value: any) => formatarPercentual(value)}
                      style={{ fill: '#000', fontSize: 11, fontWeight: 'bold' }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}