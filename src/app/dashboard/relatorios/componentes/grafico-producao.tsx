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
  LabelList,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface GraficoProducaoProps {
  dados: any[];
  tipo: 'diario' | 'acumulado';
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

// Função para formatar data (apenas dia/mês)
const formatarDataCurta = (dataStr: string): string => {
  if (!dataStr) return '-';
  // Se já vier formatado como DD/MM/AAAA, extrair DD/MM
  const match = dataStr.match(/^(\d{2})\/(\d{2})/);
  if (match) return `${match[1]}/${match[2]}`;
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

  // ✅ AGRUPAMENTO POR DIA (corrigido)
  const mapaPorDia = new Map();
  
  dados.forEach((item: any) => {
    // Extrair apenas a data (YYYY-MM-DD) do ISO
    const dataISO = item.dataISO || item.data?.split(' ')[0] || '';
    const dataFormatada = item.data?.split(',')[0] || dataISO;
    
    const metragem = item.metragemReal || item.metragem || 0;
    
    if (mapaPorDia.has(dataISO)) {
      const existente = mapaPorDia.get(dataISO);
      existente.metragemReal += metragem;
    } else {
      mapaPorDia.set(dataISO, {
        data: dataFormatada,
        dataISO: dataISO,
        metragemReal: metragem,
      });
    }
  });

  const dadosAgrupados = Array.from(mapaPorDia.values())
    .sort((a, b) => a.dataISO.localeCompare(b.dataISO));

  console.log('📊 Dados agrupados por dia:', dadosAgrupados);

  if (tipo === 'diario') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{titulo}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosAgrupados} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="data" 
                  tickFormatter={formatarDataCurta}
                />
                <YAxis tickFormatter={(value) => formatarNumeroAbreviado(value)} />
                <Tooltip 
                  formatter={(value: any) => [formatarNumeroCompleto(value), 'Metragem']}
                  labelFormatter={(label) => `Data: ${label}`}
                />
                <Legend />
                <Bar dataKey="metragemReal" fill="#3b82f6" name="Metros Produzidos">
                  {/* ✅ Valor abreviado em cima da barra */}
                  <LabelList 
                    dataKey="metragemReal" 
                    position="top" 
                    formatter={(value: any) => formatarNumeroAbreviado(value)}
                    style={{ fill: '#000', fontSize: 12, fontWeight: 'bold' }}
                  />
                </Bar>
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
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dadosAcumulados} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="data" 
                tickFormatter={formatarDataCurta}
              />
              <YAxis tickFormatter={(value) => formatarNumeroAbreviado(value)} />
              <Tooltip 
                formatter={(value: any) => [formatarNumeroCompleto(value), 'Metros Acumulados']}
                labelFormatter={(label) => `Data: ${label}`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="metragemReal"
                stroke="#10b981"
                name="Metros Acumulados"
                strokeWidth={2}
              >
                {/* ✅ Valor abreviado em cada ponto */}
                <LabelList 
                  dataKey="metragemReal" 
                  position="top" 
                  formatter={(value: any) => formatarNumeroAbreviado(value)}
                  style={{ fill: '#000', fontSize: 12, fontWeight: 'bold' }}
                />
              </Line>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}