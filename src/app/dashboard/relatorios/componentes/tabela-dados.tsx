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
import { formatNumber, formatDate } from '@/lib/utils';

interface TabelaDadosProps {
  dados: any[];
  tipo: 'producao' | 'paradas' | 'operadores' | 'maquinas';
}

export function TabelaDados({ dados, tipo }: TabelaDadosProps) {
  const titulos = {
    producao: 'Detalhamento da Produção',
    paradas: 'Detalhamento das Paradas',
    operadores: 'Produção por Operador',
    maquinas: 'Produção por Máquina',
  };

  const renderTabela = () => {
    switch (tipo) {
      case 'producao':
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>OP</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Máquina</TableHead>
                <TableHead>Operador</TableHead>
                <TableHead className="text-right">Metragem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dados.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>{formatDate(item.data)}</TableCell>
                  <TableCell>OP {item.op}</TableCell>
                  <TableCell>{item.produto}</TableCell>
                  <TableCell>{item.maquina}</TableCell>
                  <TableCell>{item.operador}</TableCell>
                  <TableCell className="text-right">
                    {formatNumber(item.metragem)} m
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      case 'operadores':
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Operador</TableHead>
                <TableHead>Matrícula</TableHead>
                <TableHead className="text-right">Total Produzido</TableHead>
                <TableHead className="text-right">Tempo Total</TableHead>
                <TableHead className="text-right">Eficiência</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dados.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>{item.nome}</TableCell>
                  <TableCell>{item.matricula}</TableCell>
                  <TableCell className="text-right">
                    {formatNumber(item.totalMetragem)} m
                  </TableCell>
                  <TableCell className="text-right">
                    {item.tempoTotal} min
                  </TableCell>
                  <TableCell className="text-right">
                    {item.eficiencia}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      case 'maquinas':
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Máquina</TableHead>
                <TableHead>Código</TableHead>
                <TableHead className="text-right">Total Produzido</TableHead>
                <TableHead className="text-right">Tempo Produção</TableHead>
                <TableHead className="text-right">Tempo Parada</TableHead>
                <TableHead className="text-right">Disponibilidade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dados.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>{item.nome}</TableCell>
                  <TableCell>{item.codigo}</TableCell>
                  <TableCell className="text-right">
                    {formatNumber(item.totalMetragem)} m
                  </TableCell>
                  <TableCell className="text-right">
                    {item.tempoProducao} min
                  </TableCell>
                  <TableCell className="text-right">
                    {item.tempoParada} min
                  </TableCell>
                  <TableCell className="text-right">
                    {item.disponibilidade}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{titulos[tipo]}</CardTitle>
      </CardHeader>
      <CardContent>{renderTabela()}</CardContent>
    </Card>
  );
}