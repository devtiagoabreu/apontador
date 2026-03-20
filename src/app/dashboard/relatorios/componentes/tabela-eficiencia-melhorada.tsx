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
import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet, FileJson } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/components/ui/use-toast';

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

// Função para exportar CSV
const exportarCSV = (dados: any[]) => {
  if (!dados || dados.length === 0) {
    toast({
      title: 'Aviso',
      description: 'Não há dados para exportar',
      variant: 'default',
    });
    return;
  }

  const headers = ['Máquina', 'Dias no Período', 'Metragem Real (m)', 'Metragem Esperada (m)', 'Tempo Disponível', 'Tempo Apontado', 'Eficiência (%)'];
  
  const linhas = dados.map(item => [
    item.nome,
    `${item.diasNoPeriodo} ${item.diasNoPeriodo === 1 ? 'dia' : 'dias'}`,
    formatarNumeroBR(item.metragemReal),
    formatarNumeroBR(item.metragemEsperada),
    formatarTempo(item.tempoDisponivel),
    formatarTempo(item.tempoApontado),
    formatarNumeroBR(item.eficiencia, 1) + '%',
  ]);

  const csv = [headers.join(','), ...linhas.map(l => l.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `resumo-maquinas-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();

  toast({
    title: 'Sucesso',
    description: 'CSV exportado com sucesso',
  });
};

// Função para exportar JSON
const exportarJSON = (dados: any[]) => {
  if (!dados || dados.length === 0) {
    toast({
      title: 'Aviso',
      description: 'Não há dados para exportar',
      variant: 'default',
    });
    return;
  }

  const data = dados.map(item => ({
    maquina: item.nome,
    diasNoPeriodo: item.diasNoPeriodo,
    metragemReal: item.metragemReal,
    metragemEsperada: item.metragemEsperada,
    tempoDisponivel: item.tempoDisponivel,
    tempoApontado: item.tempoApontado,
    eficiencia: item.eficiencia,
  }));

  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `resumo-maquinas-${new Date().toISOString().split('T')[0]}.json`;
  link.click();

  toast({
    title: 'Sucesso',
    description: 'JSON exportado com sucesso',
  });
};

export function TabelaEficienciaMelhorada({ dados }: TabelaEficienciaMelhoradaProps) {
  const getEficienciaColor = (valor: number) => {
    if (valor >= 90) return 'bg-green-100 text-green-800';
    if (valor >= 75) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Resumo por Máquina</CardTitle>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-1" /> Exportar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => exportarCSV(dados)}>
              <FileSpreadsheet className="mr-2 h-4 w-4" /> CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportarJSON(dados)}>
              <FileJson className="mr-2 h-4 w-4" /> JSON
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Máquina</TableHead>
              <TableHead className="text-right">Dias no Período</TableHead>
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
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
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
                      {item.diasNoPeriodo} {item.diasNoPeriodo === 1 ? 'dia' : 'dias'}
                    </TableCell>
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