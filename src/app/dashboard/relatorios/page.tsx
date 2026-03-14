// src/app/dashboard/relatorios/page.tsx
'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Download, FileText, BarChart3, PieChart, Calendar, LineChart } from 'lucide-react';
import { FiltrosData } from './componentes/filtros';
import { FiltrosAvancados } from './componentes/filtros-avancados';
import { GraficoProducao } from './componentes/grafico-producao';
import { GraficoParadas } from './componentes/grafico-paradas';
import { GraficoEficiencia } from './componentes/grafico-eficiencia';
import { TabelaDados } from './componentes/tabela-dados';
import { TabelaEficiencia } from './componentes/tabela-eficiencia';
import { CardResumoEficiencia } from './componentes/card-resumo-eficiencia';
import { exportarPDF, exportarExcel } from './utils/exportar';
import { toast } from '@/components/ui/use-toast';

export default function RelatoriosPage() {
  const [periodo, setPeriodo] = useState<{ inicio: Date; fim: Date }>({
    inicio: new Date(new Date().setDate(new Date().getDate() - 30)),
    fim: new Date(),
  });
  const [tipoRelatorio, setTipoRelatorio] = useState('producao');
  const [filtrosAvancados, setFiltrosAvancados] = useState<any>(null);
  const [dados, setDados] = useState<any[]>([]);
  const [dadosEficiencia, setDadosEficiencia] = useState<any>(null);
  const [carregando, setCarregando] = useState(false);
  const [carregandoEficiencia, setCarregandoEficiencia] = useState(false);

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
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados',
        variant: 'destructive',
      });
    } finally {
      setCarregando(false);
    }
  }

  async function carregarDadosEficiencia() {
    if (!filtrosAvancados) {
      toast({
        title: 'Atenção',
        description: 'Selecione os filtros avançados primeiro',
        variant: 'default',
      });
      return;
    }

    setCarregandoEficiencia(true);
    try {
      const response = await fetch('/api/relatorios/eficiencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filtrosAvancados),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao carregar dados');
      }

      const data = await response.json();
      setDadosEficiencia(data);
    } catch (error) {
      console.error('Erro ao carregar dados de eficiência:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao carregar dados',
        variant: 'destructive',
      });
    } finally {
      setCarregandoEficiencia(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Relatórios e Análises</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => exportarPDF(
              tipoRelatorio === 'eficiencia' ? dadosEficiencia?.dados || [] : dados, 
              tipoRelatorio, 
              periodo
            )}
            disabled={tipoRelatorio === 'eficiencia' ? !dadosEficiencia : dados.length === 0}
          >
            <FileText className="mr-2 h-4 w-4" />
            PDF
          </Button>
          <Button 
            variant="outline" 
            onClick={() => exportarExcel(
              tipoRelatorio === 'eficiencia' ? dadosEficiencia?.dados || [] : dados, 
              tipoRelatorio, 
              periodo
            )}
            disabled={tipoRelatorio === 'eficiencia' ? !dadosEficiencia : dados.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Excel
          </Button>
        </div>
      </div>

      <FiltrosData periodo={periodo} setPeriodo={setPeriodo} onBuscar={carregarDados} />

      <Tabs value={tipoRelatorio} onValueChange={setTipoRelatorio}>
        <TabsList className="grid w-full grid-cols-5">
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
          <TabsTrigger value="eficiencia">
            <LineChart className="mr-2 h-4 w-4" />
            Eficiência
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

        <TabsContent value="eficiencia" className="space-y-6">
          {/* Filtros Avançados */}
          <FiltrosAvancados
            onChange={setFiltrosAvancados}
            onBuscar={carregarDadosEficiencia}
            carregando={carregandoEficiencia}
          />

          {/* Cards de Resumo */}
          {dadosEficiencia && (
            <>
              <div className="grid gap-4 md:grid-cols-4">
                <CardResumoEficiencia
                  titulo="Total Produzido"
                  valor={dadosEficiencia.totais.metragemReal}
                  formato="numero"
                  cor="blue"
                />
                <CardResumoEficiencia
                  titulo={`Esperado (${filtrosAvancados?.referencia === 'produto' ? 'Produto' : 'Máquina'})`}
                  valor={filtrosAvancados?.referencia === 'produto' 
                    ? dadosEficiencia.totais.metragemEsperadaProduto 
                    : dadosEficiencia.totais.metragemEsperadaMaquina}
                  formato="numero"
                  cor="green"
                />
                <CardResumoEficiencia
                  titulo="Eficiência Média"
                  valor={filtrosAvancados?.referencia === 'produto' 
                    ? dadosEficiencia.totais.eficienciaMediaProduto 
                    : dadosEficiencia.totais.eficienciaMediaMaquina}
                  formato="percentual"
                  cor="purple"
                />
                <CardResumoEficiencia
                  titulo="Tempo Total"
                  valor={dadosEficiencia.totais.tempoTotal}
                  formato="numero"
                  cor="yellow"
                />
              </div>

              {/* Gráficos */}
              <div className="grid gap-4 md:grid-cols-2">
                <GraficoEficiencia
                  dados={dadosEficiencia.graficos.porData}
                  tipo="comparativo"
                  referencia={filtrosAvancados?.referencia}
                />
                <GraficoEficiencia
                  dados={dadosEficiencia.graficos.porEstagio}
                  tipo="estagios"
                  referencia={filtrosAvancados?.referencia}
                />
              </div>

              {/* Tabela Detalhada */}
              <TabelaEficiencia
                dados={dadosEficiencia.dados}
                referencia={filtrosAvancados?.referencia}
              />
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}