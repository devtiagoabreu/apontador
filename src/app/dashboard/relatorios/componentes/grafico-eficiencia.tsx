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
  LabelList,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet, FileJson } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/components/ui/use-toast';

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

// Formatador para número abreviado
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
const formatarValor = (valor: number) => {
  if (valor === null || valor === undefined || isNaN(valor)) return '-';
  return valor.toLocaleString('pt-BR', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  }) + ' m';
};

const formatarPercentual = (valor: number) => {
  if (valor === null || valor === undefined || isNaN(valor)) return '-';
  return valor.toFixed(1) + '%';
};

// Função para formatar o label do eixo X (apenas texto)
const formatarLabelEixo = (label: string) => {
  if (!label) return '';
  // Se o label for muito longo, pode quebrar em duas linhas
  if (label.length > 30) {
    const [data, maquina] = label.split(' | ');
    return `${data}\n${maquina.substring(0, 20)}...`;
  }
  return label;
};

// Função para exportar CSV
const exportarCSV = (dados: any[], tipo: string, referencia: string) => {
  if (!dados || dados.length === 0) {
    toast({
      title: 'Aviso',
      description: 'Não há dados para exportar',
      variant: 'default',
    });
    return;
  }

  const headers = tipo === 'comparativo' 
    ? ['Data', 'Máquina', 'Metragem Real (m)', `Metragem Esperada (${referencia === 'produto' ? 'Produto' : 'Máquina'}) (m)`, 'Eficiência (%)']
    : ['Estágio', `Eficiência (${referencia === 'produto' ? 'Produto' : 'Máquina'}) (%)`];
  
  const linhas = tipo === 'comparativo'
    ? dados.map(item => [
        item.data,
        item.maquina || '-',
        item.metragemReal || 0,
        referencia === 'produto' ? (item.metragemEsperadaProduto || 0) : (item.metragemEsperadaMaquina || 0),
        item.eficiencia || 0,
      ])
    : dados.map(item => [
        item.estagio,
        referencia === 'produto' ? (item.eficienciaProduto || 0) : (item.eficienciaMaquina || 0),
      ]);

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
const exportarJSON = (dados: any[], tipo: string, referencia: string) => {
  if (!dados || dados.length === 0) {
    toast({
      title: 'Aviso',
      description: 'Não há dados para exportar',
      variant: 'default',
    });
    return;
  }

  const data = tipo === 'comparativo'
    ? dados.map(item => ({
        data: item.data,
        maquina: item.maquina,
        metragemReal: item.metragemReal,
        metragemEsperada: referencia === 'produto' ? item.metragemEsperadaProduto : item.metragemEsperadaMaquina,
        eficiencia: item.eficiencia,
      }))
    : dados.map(item => ({
        estagio: item.estagio,
        eficiencia: referencia === 'produto' ? item.eficienciaProduto : item.eficienciaMaquina,
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

export function GraficoEficiencia({ dados, tipo, referencia }: GraficoEficienciaProps) {
  const titulo = tipo === 'comparativo' 
    ? 'Metragem Real vs Esperada' 
    : 'Eficiência por Estágio';

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
              <DropdownMenuItem onClick={() => exportarCSV(dados, tipo, referencia)}>
                <FileSpreadsheet className="mr-2 h-4 w-4" /> CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportarJSON(dados, tipo, referencia)}>
                <FileJson className="mr-2 h-4 w-4" /> JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p className="text-gray-500">Nenhum dado disponível para o período</p>
        </CardContent>
      </Card>
    );
  }

  if (tipo === 'comparativo') {
    // Preparar dados com nome da máquina
    const dadosComMaquina = dados.map(item => ({
      ...item,
      labelEixo: `${item.data} | ${item.maquina || '-'}`,
    }));

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
              <DropdownMenuItem onClick={() => exportarCSV(dados, tipo, referencia)}>
                <FileSpreadsheet className="mr-2 h-4 w-4" /> CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportarJSON(dados, tipo, referencia)}>
                <FileJson className="mr-2 h-4 w-4" /> JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent>
          <div className="h-[450px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={dadosComMaquina} margin={{ top: 30, right: 30, left: 20, bottom: 100 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="labelEixo" 
                  tick={{ fontSize: 11 }}
                  tickFormatter={formatarLabelEixo}
                  height={100}
                  interval={0}
                />
                <YAxis 
                  yAxisId="left" 
                  orientation="left" 
                  stroke={COLORS.real}
                  tickFormatter={(value) => formatarNumeroAbreviado(value)}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  stroke={COLORS.eficiencia}
                  tickFormatter={(value) => value.toFixed(0) + '%'}
                />
                <Tooltip 
                  formatter={(value: any, name: string) => {
                    if (name === 'Eficiência %') return [formatarPercentual(value), name];
                    return [formatarValor(value), name];
                  }}
                  labelFormatter={(label) => label}
                />
                <Legend />
                <Bar 
                  yAxisId="left" 
                  dataKey="metragemReal" 
                  fill={COLORS.real} 
                  name="Metragem Real"
                >
                  <LabelList 
                    dataKey="metragemReal" 
                    position="top" 
                    formatter={(value: any) => formatarNumeroAbreviado(value)}
                    style={{ fill: '#000', fontSize: 10, fontWeight: 'bold' }}
                  />
                </Bar>
                <Bar 
                  yAxisId="left" 
                  dataKey={referencia === 'produto' ? 'metragemEsperadaProduto' : 'metragemEsperadaMaquina'} 
                  fill={referencia === 'produto' ? COLORS.esperadoProduto : COLORS.esperadoMaquina} 
                  name={`Metragem Esperada (${referencia === 'produto' ? 'Produto' : 'Máquina'})`}
                >
                  <LabelList 
                    dataKey={referencia === 'produto' ? 'metragemEsperadaProduto' : 'metragemEsperadaMaquina'} 
                    position="top" 
                    formatter={(value: any) => formatarNumeroAbreviado(value)}
                    style={{ fill: '#000', fontSize: 10, fontWeight: 'bold' }}
                  />
                </Bar>
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="eficiencia"
                  stroke={COLORS.eficiencia}
                  name="Eficiência %"
                  strokeWidth={2}
                >
                  <LabelList 
                    dataKey="eficiencia" 
                    position="top" 
                    formatter={(value: any) => value.toFixed(0) + '%'}
                    style={{ fill: '#ef4444', fontSize: 10, fontWeight: 'bold' }}
                  />
                </Line>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Preparar dados com cores
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
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{titulo}</CardTitle>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-1" /> Exportar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => exportarCSV(dados, tipo, referencia)}>
              <FileSpreadsheet className="mr-2 h-4 w-4" /> CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportarJSON(dados, tipo, referencia)}>
              <FileJson className="mr-2 h-4 w-4" /> JSON
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dadosComCor} layout="vertical" margin={{ top: 20, right: 30, left: 120, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                type="number" 
                domain={[0, 100]} 
                tickFormatter={(value) => value.toFixed(0) + '%'}
              />
              <YAxis dataKey="estagio" type="category" width={110} tick={{ fontSize: 12 }} />
              <Tooltip 
                formatter={(value: any) => [formatarPercentual(value), 'Eficiência']}
              />
              <Legend />
              <Bar 
                dataKey="valorEficiencia" 
                name={`Eficiência (${referencia === 'produto' ? 'Produto' : 'Máquina'})`}
              >
                <LabelList 
                  dataKey="valorEficiencia" 
                  position="right" 
                  formatter={(value: any) => value.toFixed(0) + '%'}
                  style={{ fill: '#000', fontSize: 11, fontWeight: 'bold' }}
                />
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