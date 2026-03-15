// src/app/dashboard/relatorios/page.tsx
'use client';

import { useState, useEffect } from 'react';
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
  const [periodo, setPeriodo] = useState<{ inicio: Date; fim: Date }>({
    inicio: new Date(new Date().setDate(new Date().getDate() - 30)),
    fim: new Date(),
  });
  const [tipoRelatorio, setTipoRelatorio] = useState('producao');
  const [filtrosAvancados, setFiltrosAvancados] = useState<any>(null);
  const [dadosRelatorio, setDadosRelatorio] = useState<DadosRelatorio>({ dados: [] });
  const [carregando, setCarregando] = useState(false);

  // Carregar dados sempre que os filtros ou aba mudarem
  useEffect(() => {
    if (tipoRelatorio !== 'eficiencia') {
      carregarDados();
    }
  }, [tipoRelatorio, periodo, filtrosAvancados]);

  async function carregarDados() {
    console.log('='.repeat(50));
    console.log(`📡 carregarDados - ${tipoRelatorio}`);
    console.log('📅 Período:', periodo);
    console.log('🔍 Filtros avançados:', filtrosAvancados);
    
    setCarregando(true);
    try {
      // Construir URL base
      const params = new URLSearchParams({
        inicio: periodo.inicio.toISOString(),
        fim: periodo.fim.toISOString(),
        tipo: tipoRelatorio,
      });

      // Adicionar filtros avançados se existirem
      if (filtrosAvancados) {
        if (filtrosAvancados.maquinas?.length > 0) {
          params.append('maquinas', filtrosAvancados.maquinas.join(','));
        }
        if (filtrosAvancados.operadores?.length > 0) {
          params.append('operadores', filtrosAvancados.operadores.join(','));
        }
        if (filtrosAvancados.datas?.length > 0) {
          params.append('datas', filtrosAvancados.datas.join(','));
        }
        if (filtrosAvancados.grupos?.length > 0) {
          params.append('grupos', filtrosAvancados.grupos.join(','));
        }
        if (filtrosAvancados.estagios?.length > 0) {
          params.append('estagios', filtrosAvancados.estagios.join(','));
        }
        if (filtrosAvancados.referencia) {
          params.append('referencia', filtrosAvancados.referencia);
        }
      }

      const url = `/api/relatorios?${params}`;
      console.log('🔗 URL:', url);

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Erro ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Dados recebidos:', data);
      
      setDadosRelatorio(data);
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

  const getTituloAba = () => {
    switch (tipoRelatorio) {
      case 'producao': return 'Produção';
      case 'paradas': return 'Paradas';
      case 'operadores': return 'Operadores';
      case 'maquinas': return 'Máquinas';
      case 'eficiencia': return 'Eficiência';
      default: return '';
    }
  };

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
              periodo
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
              periodo
            )}
            disabled={!dadosRelatorio.dados?.length}
          >
            <Download className="mr-2 h-4 w-4" />
            Excel
          </Button>
        </div>
      </div>

      {/* Filtros de Data (sempre visíveis) */}
      <FiltrosData periodo={periodo} setPeriodo={setPeriodo} onBuscar={() => {}} />

      {/* Filtros Avançados (sempre visíveis) */}
      <FiltrosAvancados
        onChange={setFiltrosAvancados}
        onBuscar={() => {}} // Agora os dados carregam automaticamente via useEffect
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
        {dadosRelatorio.totais && (
          <div className="grid gap-4 md:grid-cols-4 mt-6">
            <CardResumoEficiencia
              titulo="Total Produzido"
              valor={dadosRelatorio.totais.metragemReal}
              formato="numero"
              cor="blue"
            />
            <CardResumoEficiencia
              titulo={`Esperado (${filtrosAvancados?.referencia === 'produto' ? 'Produto' : 'Máquina'})`}
              valor={filtrosAvancados?.referencia === 'produto' 
                ? dadosRelatorio.totais.metragemEsperadaProduto 
                : dadosRelatorio.totais.metragemEsperadaMaquina}
              formato="numero"
              cor="green"
            />
            <CardResumoEficiencia
              titulo="Eficiência Média"
              valor={filtrosAvancados?.referencia === 'produto' 
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

        <TabsContent value="eficiencia" className="space-y-4 mt-6">
          {carregando ? (
            <div className="text-center py-8 text-gray-500">Carregando...</div>
          ) : (
            dadosRelatorio.dados && (
              <>
                {dadosRelatorio.graficos && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <GraficoEficiencia
                      dados={dadosRelatorio.graficos.porData || []}
                      tipo="comparativo"
                      referencia={filtrosAvancados?.referencia || 'produto'}
                    />
                    <GraficoEficiencia
                      dados={dadosRelatorio.graficos.porEstagio || []}
                      tipo="estagios"
                      referencia={filtrosAvancados?.referencia || 'produto'}
                    />
                  </div>
                )}
                <TabelaEficiencia
                  dados={dadosRelatorio.dados}
                  referencia={filtrosAvancados?.referencia || 'produto'}
                />
              </>
            )
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}