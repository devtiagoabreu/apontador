// src/app/dashboard/relatorios/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Download, FileText, BarChart3, PieChart, Calendar, LineChart } from 'lucide-react';
import { FiltrosAvancados } from './componentes/filtros-avancados';
import { GraficoProducao } from './componentes/grafico-producao';
import { GraficoParadas } from './componentes/grafico-paradas';
import { GraficoEficiencia } from './componentes/grafico-eficiencia';
import { GraficoEficienciaMelhorado } from './componentes/grafico-eficiencia-melhorado';
import { TabelaDados } from './componentes/tabela-dados';
import { TabelaEficiencia } from './componentes/tabela-eficiencia';
import { TabelaEficienciaMelhorada } from './componentes/tabela-eficiencia-melhorada';
import { CardResumoEficiencia } from './componentes/card-resumo-eficiencia';
import { exportarPDF, exportarExcel } from './utils/exportar';
import { toast } from '@/components/ui/use-toast';

interface DadosRelatorio {
  dados: any[];
  totais?: {
    totalRegistros: number;
    metragemReal: number;
    metragemEsperadaProduto: number;
    metragemEsperadaMaquina: number;
    tempoTotal: number;
    eficienciaMediaProduto: number;
    eficienciaMediaMaquina: number;
  };
  graficos?: {
    porData?: any[];
    porEstagio?: any[];
    porMotivo?: any[];
    porMaquina?: any[];
  };
}

export default function RelatoriosPage() {
  const [tipoRelatorio, setTipoRelatorio] = useState('producao');
  const [filtros, setFiltros] = useState<any>(null);
  const [dadosRelatorio, setDadosRelatorio] = useState<DadosRelatorio>({ dados: [] });
  const [carregando, setCarregando] = useState(false);

  // Carregar dados sempre que os filtros ou aba mudarem
  useEffect(() => {
    if (filtros) {
      carregarDados();
    }
  }, [tipoRelatorio, filtros]);

  async function carregarDados() {
    console.log('='.repeat(50));
    console.log(`📡 carregarDados - ${tipoRelatorio}`);
    console.log('🔍 Filtros:', filtros);
    
    setCarregando(true);
    try {
      // Construir URL base
      const params = new URLSearchParams({
        tipo: tipoRelatorio,
      });

      // Adicionar filtros
      if (filtros.periodo?.inicio) {
        params.append('inicio', filtros.periodo.inicio);
      }
      if (filtros.periodo?.fim) {
        params.append('fim', filtros.periodo.fim);
      }
      if (filtros.maquinas?.length > 0) {
        params.append('maquinas', filtros.maquinas.join(','));
      }
      if (filtros.operadores?.length > 0) {
        params.append('operadores', filtros.operadores.join(','));
      }
      if (filtros.datas?.length > 0) {
        params.append('datas', filtros.datas.join(','));
      }
      if (filtros.grupos?.length > 0) {
        params.append('grupos', filtros.grupos.join(','));
      }
      if (filtros.estagios?.length > 0) {
        params.append('estagios', filtros.estagios.join(','));
      }
      if (filtros.referencia) {
        params.append('referencia', filtros.referencia);
      }

      let url: string;
      
      // Escolher a API correta baseada no tipo
      if (tipoRelatorio === 'eficiencia') {
        // Para eficiência, usar POST com body
        const response = await fetch('/api/relatorios/eficiencia', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(filtros),
        });

        if (!response.ok) {
          throw new Error(`Erro ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ Dados de eficiência recebidos:', data);
        setDadosRelatorio(data);
        setCarregando(false);
        return;
      } else {
        // Para outros tipos, usar GET
        url = `/api/relatorios?${params}`;
        console.log('🔗 URL:', url);

        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`Erro ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ Dados recebidos:', data);
        setDadosRelatorio(data);
      }
      
    } catch (error) {
      console.error('❌ Erro:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Não foi possível carregar os dados',
        variant: 'destructive',
      });
    } finally {
      setCarregando(false);
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
              dadosRelatorio.dados || [], 
              tipoRelatorio, 
              filtros?.periodo || { inicio: new Date(), fim: new Date() }
            )}
            disabled={!dadosRelatorio.dados?.length}
          >
            <FileText className="mr-2 h-4 w-4" />
            PDF
          </Button>
          <Button 
            variant="outline" 
            onClick={() => exportarExcel(
              dadosRelatorio.dados || [], 
              tipoRelatorio, 
              filtros?.periodo || { inicio: new Date(), fim: new Date() }
            )}
            disabled={!dadosRelatorio.dados?.length}
          >
            <Download className="mr-2 h-4 w-4" />
            Excel
          </Button>
        </div>
      </div>

      {/* Filtros Avançados */}
      <FiltrosAvancados
        onChange={setFiltros}
        carregando={carregando}
      />

      {/* Abas */}
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

        {/* Cards de Resumo (comuns a todas as abas) */}
        {dadosRelatorio.totais && tipoRelatorio !== 'eficiencia' && (
          <div className="grid gap-4 md:grid-cols-4 mt-6">
            <CardResumoEficiencia
              titulo="Total Produzido"
              valor={dadosRelatorio.totais.metragemReal}
              formato="numero"
              cor="blue"
            />
            <CardResumoEficiencia
              titulo={`Esperado (${filtros?.referencia === 'produto' ? 'Produto' : 'Máquina'})`}
              valor={filtros?.referencia === 'produto' 
                ? dadosRelatorio.totais.metragemEsperadaProduto 
                : dadosRelatorio.totais.metragemEsperadaMaquina}
              formato="numero"
              cor="green"
            />
            <CardResumoEficiencia
              titulo="Eficiência Média"
              valor={filtros?.referencia === 'produto' 
                ? dadosRelatorio.totais.eficienciaMediaProduto 
                : dadosRelatorio.totais.eficienciaMediaMaquina}
              formato="percentual"
              cor="purple"
            />
            <CardResumoEficiencia
              titulo="Tempo Total"
              valor={dadosRelatorio.totais.tempoTotal}
              formato="numero"
              cor="yellow"
            />
          </div>
        )}

        {/* Conteúdo das Abas */}
        <TabsContent value="producao" className="space-y-4 mt-6">
          {carregando ? (
            <div className="text-center py-8 text-gray-500">Carregando...</div>
          ) : (
            <>
              {dadosRelatorio.graficos?.porData && (
                <div className="grid gap-4 md:grid-cols-2">
                  <GraficoProducao dados={dadosRelatorio.graficos.porData} tipo="diario" />
                  <GraficoProducao dados={dadosRelatorio.graficos.porData} tipo="acumulado" />
                </div>
              )}
              <TabelaDados dados={dadosRelatorio.dados} tipo="producao" />
            </>
          )}
        </TabsContent>

        <TabsContent value="paradas" className="space-y-4 mt-6">
          {carregando ? (
            <div className="text-center py-8 text-gray-500">Carregando...</div>
          ) : (
            <>
              {dadosRelatorio.graficos && (
                <div className="grid gap-4 md:grid-cols-2">
                  <GraficoParadas dados={dadosRelatorio.dados} tipo="motivos" />
                  <GraficoParadas dados={dadosRelatorio.dados} tipo="tempo" />
                </div>
              )}
              <TabelaDados dados={dadosRelatorio.dados} tipo="paradas" />
            </>
          )}
        </TabsContent>

        <TabsContent value="operadores" className="space-y-4 mt-6">
          {carregando ? (
            <div className="text-center py-8 text-gray-500">Carregando...</div>
          ) : (
            <TabelaDados dados={dadosRelatorio.dados} tipo="operadores" />
          )}
        </TabsContent>

        <TabsContent value="maquinas" className="space-y-4 mt-6">
          {carregando ? (
            <div className="text-center py-8 text-gray-500">Carregando...</div>
          ) : (
            <TabelaDados dados={dadosRelatorio.dados} tipo="maquinas" />
          )}
        </TabsContent>

        <TabsContent value="eficiencia" className="space-y-6 mt-6">
          {carregando ? (
            <div className="text-center py-8 text-gray-500">Carregando...</div>
          ) : (
            dadosRelatorio.dados && (
              <>
                {/* Cards de Resumo para Eficiência */}
                {dadosRelatorio.totais && (
                  <div className="grid gap-4 md:grid-cols-4">
                    <CardResumoEficiencia
                      titulo="Total Produzido"
                      valor={dadosRelatorio.totais.metragemReal}
                      formato="numero"
                      cor="blue"
                    />
                    <CardResumoEficiencia
                      titulo={`Esperado (${filtros?.referencia === 'produto' ? 'Produto' : 'Máquina'})`}
                      valor={filtros?.referencia === 'produto' 
                        ? dadosRelatorio.totais.metragemEsperadaProduto 
                        : dadosRelatorio.totais.metragemEsperadaMaquina}
                      formato="numero"
                      cor="green"
                    />
                    <CardResumoEficiencia
                      titulo="Eficiência Média"
                      valor={filtros?.referencia === 'produto' 
                        ? dadosRelatorio.totais.eficienciaMediaProduto 
                        : dadosRelatorio.totais.eficienciaMediaMaquina}
                      formato="percentual"
                      cor="purple"
                    />
                    <CardResumoEficiencia
                      titulo="Tempo Total"
                      valor={dadosRelatorio.totais.tempoTotal}
                      formato="numero"
                      cor="yellow"
                    />
                  </div>
                )}

                {/* Gráfico de Metragem por Máquina */}
                {dadosRelatorio.graficos?.porMaquina && dadosRelatorio.graficos.porMaquina.length > 0 && (
                  <GraficoEficienciaMelhorado
                    dados={dadosRelatorio.graficos.porMaquina}
                    tipo="metragem"
                    referencia={filtros?.referencia || 'produto'}
                  />
                )}

                {/* Gráfico de Tempo Disponível vs Apontado */}
                {dadosRelatorio.graficos?.porMaquina && dadosRelatorio.graficos.porMaquina.length > 0 && (
                  <GraficoEficienciaMelhorado
                    dados={dadosRelatorio.graficos.porMaquina}
                    tipo="tempo"
                    referencia={filtros?.referencia || 'produto'}
                  />
                )}

                {/* Tabela Resumo por Máquina */}
                {dadosRelatorio.graficos?.porMaquina && dadosRelatorio.graficos.porMaquina.length > 0 && (
                  <TabelaEficienciaMelhorada
                    dados={dadosRelatorio.graficos.porMaquina}
                  />
                )}

                {/* Gráficos originais */}
                <div className="grid gap-4 md:grid-cols-2 mt-6">
                  <GraficoEficiencia
                    dados={dadosRelatorio.graficos?.porData || []}
                    tipo="comparativo"
                    referencia={filtros?.referencia || 'produto'}
                  />
                  <GraficoEficiencia
                    dados={dadosRelatorio.graficos?.porEstagio || []}
                    tipo="estagios"
                    referencia={filtros?.referencia || 'produto'}
                  />
                </div>

                {/* Tabela Detalhada Original */}
                <TabelaEficiencia
                  dados={dadosRelatorio.dados}
                  referencia={filtros?.referencia || 'produto'}
                />
              </>
            )
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}