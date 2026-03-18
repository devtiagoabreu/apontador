// src/app/dashboard/relatorios/componentes/card-resumo-eficiencia.tsx
'use client';

import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface CardResumoEficienciaProps {
  titulo: string;
  valor: number;
  comparativo?: number;
  formato?: 'numero' | 'percentual' | 'tempo';
  cor?: string;
}

const formatarValor = (valor: number, formato?: 'numero' | 'percentual' | 'tempo'): string => {
  if (valor === null || valor === undefined || isNaN(valor)) return '-';

  if (formato === 'percentual') {
    return valor.toLocaleString('pt-BR', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }) + '%';
  }

  if (formato === 'tempo') {
    if (valor <= 0) return '0 min';
    
    const horas = Math.floor(valor / 60);
    const minutos = Math.round(valor % 60); // arredonda para evitar decimais
    
    if (horas === 0) {
      return `${minutos} min`;
    }
    return `${horas}h ${minutos.toString().padStart(2, '0')}min`;
  }

  // Padrão: metragem
  return valor.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }) + ' m';
};

const getVariacao = (valor: number, comparativo?: number) => {
  if (comparativo === undefined) return null;
  const variacao = ((valor - comparativo) / comparativo) * 100;

  if (Math.abs(variacao) < 0.1) {
    return { icone: <Minus className="h-4 w-4" />, texto: 'estável', cor: 'text-gray-500' };
  }

  if (variacao > 0) {
    return {
      icone: <TrendingUp className="h-4 w-4" />,
      texto: `${Math.abs(variacao).toFixed(1)}% maior`,
      cor: 'text-green-600',
    };
  }

  return {
    icone: <TrendingDown className="h-4 w-4" />,
    texto: `${Math.abs(variacao).toFixed(1)}% menor`,
    cor: 'text-red-600',
  };
};

export function CardResumoEficiencia({
  titulo,
  valor,
  comparativo,
  formato = 'numero',
  cor = 'blue',
}: CardResumoEficienciaProps) {
  const variacao = getVariacao(valor, comparativo);
  const corClasses = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    yellow: 'bg-yellow-50 text-yellow-700',
    red: 'bg-red-50 text-red-700',
    purple: 'bg-purple-50 text-purple-700',
  };
  const corClasse = corClasses[cor as keyof typeof corClasses] || corClasses.blue;

  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm font-medium text-gray-500 mb-2">{titulo}</p>
        <div className={`text-3xl font-bold ${corClasse} p-3 rounded-lg inline-block`}>
          {formatarValor(valor, formato)}
        </div>

        {variacao && (
          <div className={`flex items-center gap-1 mt-2 text-sm ${variacao.cor}`}>
            {variacao.icone}
            <span>{variacao.texto}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}