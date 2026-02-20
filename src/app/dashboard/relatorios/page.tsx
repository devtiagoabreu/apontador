'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText, BarChart3, PieChart, Calendar } from 'lucide-react';
import { FiltrosData } from './componentes/filtros';
import { GraficoProducao } from './componentes/grafico-producao';
import { GraficoParadas } from './componentes/grafico-paradas';
import { TabelaDados } from './componentes/tabela-dados';
import { exportarPDF, exportarExcel } from './utils/exportar';

export default function RelatoriosPage() {
  const [periodo, setPeriodo] = useState<{ inicio: Date; fim: Date }>({
    inicio: new Date(new Date().setDate(new Date().getDate() - 30)),
    fim: new Date(),
  });
  const [tipoRelatorio, setTipoRelatorio] = useState('producao');
  const [dados, setDados] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);

  async function carregarDados() {
    setCarregando(true);
    try {
      const params = new URLSearchParams({
        inicio: periodo.inicio.toISOString(),
        fim: periodo.fim.toISOString(),
        tipo: tipoRelatorio,
      });

      const response = await fetch(`/api/relatorios?${params}`);
      const data = await response.json();
      setDados(data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Relatórios e Análises</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportarPDF(dados, tipoRelatorio, periodo)}>
            <FileText className="mr-2 h-4 w-4" />
            PDF
          </Button>
          <Button variant="outline" onClick={() => exportarExcel(dados, tipoRelatorio, periodo)}>
            <Download className="mr-2 h-4 w-4" />
            Excel
          </Button>
        </div>
      </div>

      <FiltrosData periodo={periodo} setPeriodo={setPeriodo} onBuscar={carregarDados} />

      <Tabs value={tipoRelatorio} onValueChange={setTipoRelatorio}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="producao">
            <BarChart3 className="mr-2 h-4 w-4" />
            Produção
          </TabsTrigger>
          <TabsTrigger value="paradas">
            <PieChart className="mr-2 h-4 w-4" />
            Paradas
          </TabsTrigger>
          <TabsTrigger value="operadores">
            <Calendar className="mr-2 h-4 w-4" />
            Operadores
          </TabsTrigger>
          <TabsTrigger value="maquinas">
            <Calendar className="mr-2 h-4 w-4" />
            Máquinas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="producao" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <GraficoProducao dados={dados} tipo="diario" />
            <GraficoProducao dados={dados} tipo="acumulado" />
          </div>
          <TabelaDados dados={dados} tipo="producao" />
        </TabsContent>

        <TabsContent value="paradas" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <GraficoParadas dados={dados} tipo="motivos" />
            <GraficoParadas dados={dados} tipo="tempo" />
          </div>
          <TabelaDados dados={dados} tipo="paradas" />
        </TabsContent>

        <TabsContent value="operadores" className="space-y-4">
          <TabelaDados dados={dados} tipo="operadores" />
        </TabsContent>

        <TabsContent value="maquinas" className="space-y-4">
          <TabelaDados dados={dados} tipo="maquinas" />
        </TabsContent>
      </Tabs>
    </div>
  );
}