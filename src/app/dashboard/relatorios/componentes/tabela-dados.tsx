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
                <TableHead>Estágio</TableHead>
                <TableHead className="text-right">Metragem</TableHead>
                <TableHead className="text-right">Tempo (min)</TableHead>
                <TableHead className="text-right">M/min</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dados.map((item, index) => {
                const metrosPorMinuto = item.tempoProdução > 0 
                  ? (item.metragem / item.tempoProdução).toFixed(2) 
                  : '0';
                
                return (
                  <TableRow key={index}>
                    <TableCell>{formatDate(item.data)}</TableCell>
                    <TableCell>OP {item.op}</TableCell>
                    <TableCell className="max-w-[200px] truncate" title={item.produto}>
                      {item.produto}
                    </TableCell>
                    <TableCell>{item.maquina}</TableCell>
                    <TableCell>{item.operador}</TableCell>
                    <TableCell>{item.estagio || '-'}</TableCell>
                    <TableCell className="text-right">
                      {formatNumber(item.metragem)} m
                    </TableCell>
                    <TableCell className="text-right">
                      {item.tempoProdução?.toFixed(2)} min
                    </TableCell>
                    <TableCell className="text-right">
                      {metrosPorMinuto} m/min
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        );

      case 'paradas':
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Motivo</TableHead>
                <TableHead>Código</TableHead>
                <TableHead className="text-right">Quantidade</TableHead>
                <TableHead className="text-right">Tempo Total (min)</TableHead>
                <TableHead className="text-right">Média por Parada (min)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dados.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>{item.motivo}</TableCell>
                  <TableCell>{item.codigo}</TableCell>
                  <TableCell className="text-right">{item.quantidade}</TableCell>
                  <TableCell className="text-right">
                    {item.minutos?.toFixed(2)} min
                  </TableCell>
                  <TableCell className="text-right">
                    {item.quantidade > 0 
                      ? (item.minutos / item.quantidade).toFixed(2) 
                      : '0'} min
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
                <TableHead className="text-right">Produções</TableHead>
                <TableHead className="text-right">M/min</TableHead>
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
                    {item.tempoTotal?.toFixed(2)} min
                  </TableCell>
                  <TableCell className="text-right">
                    {item.quantidadeProducoes}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.metrosPorMinuto?.toFixed(2)} m/min
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
                <TableHead className="text-right">Eficiência</TableHead>
                <TableHead className="text-right">M/min</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dados.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{item.nome}</TableCell>
                  <TableCell>{item.codigo}</TableCell>
                  <TableCell className="text-right">
                    {formatNumber(item.totalMetragem)} m
                  </TableCell>
                  <TableCell className="text-right">
                    {item.tempoProducao?.toFixed(2)} min
                  </TableCell>
                  <TableCell className="text-right">
                    {item.tempoParada?.toFixed(2)} min
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={item.disponibilidade < 50 ? 'text-red-600' : item.disponibilidade < 80 ? 'text-yellow-600' : 'text-green-600'}>
                      {item.disponibilidade?.toFixed(2)}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={item.eficiencia < 50 ? 'text-red-600' : item.eficiencia < 80 ? 'text-yellow-600' : 'text-green-600'}>
                      {item.eficiencia?.toFixed(2)}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {item.metrosPorMinuto?.toFixed(2)} m/min
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