// src/app/dashboard/relatorios/componentes/tabela-eficiencia.tsx
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
import { Badge } from '@/components/ui/badge';


interface TabelaEficienciaProps {
  dados: any[];
  referencia: 'produto' | 'maquina';
}

// Função para formatar número no padrão brasileiro
const formatarNumeroBR = (valor: number, casasDecimais: number = 2): string => {
  if (valor === null || valor === undefined || isNaN(valor)) return '-';
  return valor.toLocaleString('pt-BR', {
    minimumFractionDigits: casasDecimais,
    maximumFractionDigits: casasDecimais,
  });
};

// Função para formatar data com hora
const formatarDataHoraBR = (dataStr: string): string => {
  if (!dataStr) return '-';
  try {
    const data = new Date(dataStr);
    if (isNaN(data.getTime())) return dataStr;
    return data.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dataStr;
  }
};

export function TabelaEficiencia({ dados, referencia }: TabelaEficienciaProps) {
  const getEficienciaColor = (valor: number) => {
    if (valor >= 90) return 'bg-green-100 text-green-800';
    if (valor >= 75) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Detalhamento da Eficiência</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data/Hora</TableHead>
              <TableHead>OP</TableHead>
              <TableHead>Grupo</TableHead>
              <TableHead>Estágio</TableHead>
              <TableHead>Máquina</TableHead>
              <TableHead>Operador</TableHead>
              <TableHead className="text-right">Metragem</TableHead>
              <TableHead className="text-right">Tempo</TableHead>
              <TableHead className="text-right">Vel.Ref</TableHead>
              <TableHead className="text-right">Esperado</TableHead>
              <TableHead className="text-right">Eficiência</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8 text-gray-500">
                  Nenhum dado encontrado para os filtros selecionados
                </TableCell>
              </TableRow>
            ) : (
              dados.map((item, index) => {
                const eficiencia = referencia === 'produto' 
                  ? item.eficienciaProduto 
                  : item.eficienciaMaquina;
                
                const velocidadeRef = referencia === 'produto'
                  ? item.velocidadeProduto
                  : item.velocidadeMaquina;

                const metragemEsperada = referencia === 'produto'
                  ? item.metragemEsperadaProduto
                  : item.metragemEsperadaMaquina;

                return (
                  <TableRow key={index}>
                    <TableCell>{formatarDataHoraBR(item.dataCompleta || item.data)}</TableCell>
                    <TableCell>OP {item.op}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.grupo}</Badge>
                    </TableCell>
                    <TableCell>{item.estagio}</TableCell>
                    <TableCell>{item.maquina}</TableCell>
                    <TableCell>{item.operador}</TableCell>
                    <TableCell className="text-right">
                      {formatarNumeroBR(item.metragemReal)} m
                    </TableCell>
                    <TableCell className="text-right">
                      {formatarNumeroBR(item.tempoMinutos, 0)} min
                    </TableCell>
                    <TableCell className="text-right">
                      {formatarNumeroBR(velocidadeRef, 1)} m/min
                    </TableCell>
                    <TableCell className="text-right">
                      {formatarNumeroBR(metragemEsperada)} m
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