// src/app/dashboard/relatorios/componentes/tabela-dados.tsx
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

interface TabelaDadosProps {
  dados: any[];
  tipo: 'producao' | 'paradas' | 'operadores' | 'maquinas';
}

// Função para formatar número no padrão brasileiro
const formatarNumeroBR = (valor: number, casasDecimais: number = 2): string => {
  if (valor === null || valor === undefined || isNaN(valor)) return '-';
  return valor.toLocaleString('pt-BR', {
    minimumFractionDigits: casasDecimais,
    maximumFractionDigits: casasDecimais,
  });
};

export function TabelaDados({ dados, tipo }: TabelaDadosProps) {
  console.log(`📊 TabelaDados - tipo: ${tipo}, dados:`, dados);

  const titulos = {
    producao: 'Detalhamento da Produção',
    paradas: 'Detalhamento das Paradas',
    operadores: 'Produção por Operador',
    maquinas: 'Produção por Máquina',
  };

  const renderTabela = () => {
    console.log(`🔍 Renderizando tabela do tipo: ${tipo}`);
    
    if (!dados || dados.length === 0) {
      console.log('⚠️ Nenhum dado para exibir');
      return (
        <div className="text-center py-8 text-gray-500">
          Nenhum dado encontrado para o período
        </div>
      );
    }

    try {
      switch (tipo) {
        case 'producao':
          console.log('📋 Primeiro item de produção:', dados[0]);
          return (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
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
                  try {
                    const metragem = item.metragemReal || item.metragem || 0;
                    const tempo = item.tempoMinutos || item.tempoProdução || 0;
                    
                    // Calcular metros por minuto com 2 casas decimais
                    const metrosPorMinuto = tempo > 0 
                      ? (metragem / tempo).toFixed(2).replace('.', ',')
                      : '0,00';
                    
                    // ✅ Usar data que já vem formatada da API (sempre com hora)
                    const dataExibicao = item.data || item.dataCompleta || item.dataFim || '-';
                    
                    return (
                      <TableRow key={index}>
                        <TableCell>{dataExibicao}</TableCell>
                        <TableCell>OP {item.op || item.opNumero}</TableCell>
                        <TableCell className="max-w-[200px] truncate" title={item.produtoOp || item.produto}>
                          {item.produtoOp || item.produto || '-'}
                        </TableCell>
                        <TableCell>{item.maquina || item.maquinaNome}</TableCell>
                        <TableCell>{item.operador || item.operadorNome}</TableCell>
                        <TableCell>{item.estagio || '-'}</TableCell>
                        <TableCell className="text-right">
                          {formatarNumeroBR(metragem)} m
                        </TableCell>
                        <TableCell className="text-right">
                          {formatarNumeroBR(tempo, 0)} min
                        </TableCell>
                        <TableCell className="text-right">
                          {metrosPorMinuto} m/min
                        </TableCell>
                      </TableRow>
                    );
                  } catch (err) {
                    console.error('❌ Erro ao renderizar linha de produção:', err, item);
                    return null;
                  }
                })}
              </TableBody>
            </Table>
          );

        case 'paradas':
          console.log('📋 Primeiro item de paradas:', dados[0]);
          return (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Motivo</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                  <TableHead className="text-right">Tempo Total (min)</TableHead>
                  <TableHead className="text-right">Média por Parada (min)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dados.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.motivo}</TableCell>
                    <TableCell className="text-right">{item.quantidade}</TableCell>
                    <TableCell className="text-right">
                      {formatarNumeroBR(item.minutos, 0)} min
                    </TableCell>
                    <TableCell className="text-right">
                      {item.quantidade > 0 
                        ? formatarNumeroBR(item.minutos / item.quantidade, 0)
                        : '0'} min
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          );

        case 'operadores':
          console.log('📋 Primeiro item de operadores:', dados[0]);
          return (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Operador</TableHead>
                  <TableHead className="text-right">Total Produzido</TableHead>
                  <TableHead className="text-right">Tempo Total</TableHead>
                  <TableHead className="text-right">Produções</TableHead>
                  <TableHead className="text-right">M/min</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dados.map((item, index) => {
                  const metrosPorMinuto = item.tempoTotal > 0 
                    ? (item.totalMetragem / item.tempoTotal).toFixed(2).replace('.', ',')
                    : '0,00';
                  
                  return (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.nome || item.operador}</TableCell>
                      <TableCell className="text-right">
                        {formatarNumeroBR(item.totalMetragem)} m
                      </TableCell>
                      <TableCell className="text-right">
                        {formatarNumeroBR(item.tempoTotal, 0)} min
                      </TableCell>
                      <TableCell className="text-right">
                        {item.quantidadeProducoes || 0}
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

        case 'maquinas':
          console.log('📋 Primeiro item de máquinas:', dados[0]);
          return (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Máquina</TableHead>
                  <TableHead className="text-right">Total Produzido</TableHead>
                  <TableHead className="text-right">Tempo Produção</TableHead>
                  <TableHead className="text-right">Tempo Parada</TableHead>
                  <TableHead className="text-right">Disponibilidade</TableHead>
                  <TableHead className="text-right">Eficiência</TableHead>
                  <TableHead className="text-right">M/min</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dados.map((item, index) => {
                  const metrosPorMinuto = item.tempoProducao > 0 
                    ? (item.totalMetragem / item.tempoProducao).toFixed(2).replace('.', ',')
                    : '0,00';
                  
                  return (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.nome}</TableCell>
                      <TableCell className="text-right">
                        {formatarNumeroBR(item.totalMetragem)} m
                      </TableCell>
                      <TableCell className="text-right">
                        {formatarNumeroBR(item.tempoProducao, 0)} min
                      </TableCell>
                      <TableCell className="text-right">
                        {formatarNumeroBR(item.tempoParada, 0)} min
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={
                          item.disponibilidade < 50 ? 'text-red-600' : 
                          item.disponibilidade < 80 ? 'text-yellow-600' : 
                          'text-green-600'
                        }>
                          {item.disponibilidade?.toFixed(1).replace('.', ',')}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={
                          item.eficiencia < 50 ? 'text-red-600' : 
                          item.eficiencia < 80 ? 'text-yellow-600' : 
                          'text-green-600'
                        }>
                          {item.eficiencia?.toFixed(1).replace('.', ',')}%
                        </span>
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

        default:
          return null;
      }
    } catch (error) {
      console.error('❌ Erro ao renderizar tabela:', error);
      return (
        <div className="text-center py-8 text-red-500">
          Erro ao renderizar tabela. Verifique o console.
        </div>
      );
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