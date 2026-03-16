// src/app/dashboard/relatorios/componentes/grafico-producao.tsx
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
  LineChart,
  Line,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface GraficoProducaoProps {
  dados: any[];
  tipo: 'diario' | 'acumulado';
}

// Função para formatar número no padrão brasileiro
const formatarNumeroBR = (valor: number): string => {
  if (valor === null || valor === undefined || isNaN(valor)) return '-';
  return valor.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + ' m';
};

// Função para formatar data (apenas dia)
const formatarData = (dataStr: string): string => {
  if (!dataStr) return '-';
  // Se já vier formatado como DD/MM/AAAA, extrair apenas a data
  const match = dataStr.match(/^(\d{2}\/\d{2}\/\d{4})/);
  if (match) return match[1];
  return dataStr;
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

  // ✅ AGRUPAMENTO POR DIA
  const dadosAgrupados = dados.reduce((acc: any[], item: any) => {
    // Extrair apenas a data (sem hora)
    const dataKey = item.dataISO || item.data?.split(' ')[0] || '';
    const dataFormatada = formatarData(item.data);
    
    const existing = acc.find(d => d.dataISO === dataKey);
    if (existing) {
      existing.metragemReal += item.metragemReal || 0;
    } else {
      acc.push({
        data: dataFormatada,
        dataISO: dataKey,
        metragemReal: item.metragemReal || 0,
      });
    }
    return acc;
  }, []).sort((a, b) => a.dataISO.localeCompare(b.dataISO));

  console.log('📊 Dados agrupados por dia:', dadosAgrupados);

  if (tipo === 'diario') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{titulo}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosAgrupados}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="data" />
                <YAxis tickFormatter={(value) => value.toLocaleString('pt-BR')} />
                <Tooltip 
                  formatter={(value: any) => [formatarNumeroBR(value), 'Metragem']}
                  labelFormatter={(label) => `Data: ${label}`}
                />
                <Legend />
                <Bar dataKey="metragemReal" fill="#3b82f6" name="Metros Produzidos" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Para acumulado, calcular soma progressiva
  let acumulado = 0;
  const dadosAcumulados = dadosAgrupados.map(item => {
    acumulado += item.metragemReal;
    return {
      data: item.data,
      dataISO: item.dataISO,
      metragemReal: acumulado,
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
            <LineChart data={dadosAcumulados}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="data" />
              <YAxis tickFormatter={(value) => value.toLocaleString('pt-BR')} />
              <Tooltip 
                formatter={(value: any) => [formatarNumeroBR(value), 'Metros Acumulados']}
                labelFormatter={(label) => `Data: ${label}`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="metragemReal"
                stroke="#10b981"
                name="Metros Acumulados"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}