//  src/app/dashboard/relatorios/componentes/tabela-eficiencia-melhorada.tsx
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TabelaEficienciaMelhoradaProps {
  dados: any[];
}

// Função para formatar número no padrão brasileiro
const formatarNumeroBR = (valor: number, casasDecimais: number = 2): string => {
  if (valor === null || valor === undefined || isNaN(valor)) return '-';
  return valor.toLocaleString('pt-BR', {
    minimumFractionDigits: casasDecimais,
    maximumFractionDigits: casasDecimais,
  });
};

const formatarTempo = (minutos: number): string => {
  if (!minutos) return '-';
  const horas = Math.floor(minutos / 60);
  const mins = Math.floor(minutos % 60);
  if (horas > 0) {
    return `${horas}h ${mins > 0 ? `${mins}min` : ''}`;
  }
  return `${mins}min`;
};

export function TabelaEficienciaMelhorada({ dados }: TabelaEficienciaMelhoradaProps) {
  const getEficienciaColor = (valor: number) => {
    if (valor >= 90) return 'bg-green-100 text-green-800';
    if (valor >= 75) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumo por Máquina</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Máquina</TableHead>
              <TableHead className="text-right">Metragem Real</TableHead>
              <TableHead className="text-right">Metragem Esperada</TableHead>
              <TableHead className="text-right">Tempo Disponível</TableHead>
              <TableHead className="text-right">Tempo Apontado</TableHead>
              <TableHead className="text-right">Eficiência</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  Nenhum dado encontrado para os filtros selecionados
                </TableCell>
              </TableRow>
            ) : (
              dados.map((item, index) => {
                const eficiencia = item.metragemEsperada > 0 
                  ? (item.metragemReal / item.metragemEsperada) * 100 
                  : 0;

                return (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{item.nome}</TableCell>
                    <TableCell className="text-right">
                      {formatarNumeroBR(item.metragemReal)} m
                    </TableCell>
                    <TableCell className="text-right">
                      {formatarNumeroBR(item.metragemEsperada)} m
                    </TableCell>
                    <TableCell className="text-right">
                      {formatarTempo(item.tempoDisponivel)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatarTempo(item.tempoApontado)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEficienciaColor(eficiencia)}`}>
                        {formatarNumeroBR(eficiencia, 1)}%
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
