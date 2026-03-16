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

// Função para extrair apenas a data (DD/MM) de qualquer formato
const extrairData = (dataStr: string): string => {
  if (!dataStr) return '-';
  
  // Se for ISO (YYYY-MM-DD)
  const isoMatch = dataStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[3]}/${isoMatch[2]}`;
  }
  
  // Se for formato brasileiro com hora (DD/MM/AAAA, HH:MM:SS)
  const brMatch = dataStr.match(/^(\d{2})\/(\d{2})\/\d{4}/);
  if (brMatch) {
    return `${brMatch[1]}/${brMatch[2]}`;
  }
  
  // Se for só a data
  const brOnlyMatch = dataStr.match(/^(\d{2})\/(\d{2})\/\d{4}/);
  if (brOnlyMatch) {
    return `${brOnlyMatch[1]}/${brOnlyMatch[2]}`;
  }
  
  return dataStr.substring(0, 5); // fallback
};

export function GraficoProducao({ dados, tipo }: GraficoProducaoProps) {
  const titulo = tipo === 'diario' ? 'Produção Diária' : 'Produção Acumulada';

  console.log('📊 Dados recebidos no gráfico:', dados);

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

  // ✅ AGRUPAMENTO SIMPLES POR DIA
  const producaoPorDia: Record<string, number> = {};

  dados.forEach((item: any) => {
    // Pegar a data do item (pode estar em lugares diferentes)
    const dataStr = item.data || item.dataCompleta || item.dataFim || '';
    if (!dataStr) return;
    
    // Extrair a chave do dia (YYYY-MM-DD)
    let chaveDia = '';
    
    // Se for ISO (2026-03-16)
    const isoMatch = dataStr.match(/^(\d{4}-\d{2}-\d{2})/);
    if (isoMatch) {
      chaveDia = isoMatch[1];
    } else {
      // Se for formato brasileiro, converter para ISO para agrupar
      const brMatch = dataStr.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
      if (brMatch) {
        chaveDia = `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
      }
    }
    
    if (!chaveDia) return;
    
    const metragem = item.metragemReal || item.metragem || 0;
    
    if (producaoPorDia[chaveDia]) {
      producaoPorDia[chaveDia] += metragem;
    } else {
      producaoPorDia[chaveDia] = metragem;
    }
  });

  // Converter para o formato do gráfico
  const dadosAgrupados = Object.entries(producaoPorDia)
    .map(([chave, valor]) => {
      const [ano, mes, dia] = chave.split('-');
      return {
        data: `${dia}/${mes}`, // Apenas DD/MM para exibição
        dataISO: chave,
        metragemReal: valor,
      };
    })
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
              <BarChart data={dadosAgrupados} margin={{ top: 30, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="data" />
                <YAxis tickFormatter={(value) => formatarNumeroAbreviado(value)} />
                <Tooltip 
                  formatter={(value: any) => [formatarNumeroCompleto(value), 'Metragem']}
                  labelFormatter={(label) => `Data: ${label}`}
                />
                <Legend />
                <Bar dataKey="metragemReal" fill="#3b82f6" name="Metros Produzidos">
                  <LabelList 
                    dataKey="metragemReal" 
                    position="top" 
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
            <LineChart data={dadosAcumulados} margin={{ top: 30, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="data" />
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
                <LabelList 
                  dataKey="metragemReal" 
                  position="top" 
                  formatter={(value: any) => formatarNumeroAbreviado(value)}
                  style={{ fill: '#000', fontSize: 11, fontWeight: 'bold' }}
                />
              </Line>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}