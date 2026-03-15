// src/app/dashboard/relatorios/componentes/filtros-avancados.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { MultiSelect } from './multi-select';
import { ChevronDown, ChevronUp, Filter, X } from 'lucide-react';

interface Option {
  id: string;
  label: string;
  value: string;
}

interface FiltrosAvancadosProps {
  onChange: (filtros: any) => void;
  carregando?: boolean;
}

export function FiltrosAvancados({ onChange, carregando }: FiltrosAvancadosProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [maquinas, setMaquinas] = useState<Option[]>([]);
  const [operadores, setOperadores] = useState<Option[]>([]);
  const [estagios, setEstagios] = useState<Option[]>([]);
  const [grupos, setGrupos] = useState<Option[]>([]);
  const [datasDisponiveis, setDatasDisponiveis] = useState<Option[]>([]);
  
  const [filtros, setFiltros] = useState({
    periodo: {
      inicio: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
      fim: new Date().toISOString().split('T')[0],
    },
    maquinas: [] as string[],
    operadores: [] as string[],
    datas: [] as string[],
    grupos: [] as string[],
    estagios: [] as string[],
    referencia: 'produto' as 'produto' | 'maquina',
  });

  // Carregar opções iniciais
  useEffect(() => {
    carregarOpcoes();
  }, []);

  // 🔴 Atualizar datas disponíveis quando o período mudar
  useEffect(() => {
    gerarDatasDoPeriodo();
  }, [filtros.periodo.inicio, filtros.periodo.fim]);

  // Notificar mudanças
  useEffect(() => {
    onChange(filtros);
  }, [filtros]);

  async function carregarOpcoes() {
    try {
      // Carregar máquinas
      const maquinasRes = await fetch('/api/maquinas');
      const maquinasData = await maquinasRes.json();
      setMaquinas(
        maquinasData.map((m: any) => ({
          id: m.id,
          label: `${m.codigo} - ${m.nome}`,
          value: m.id,
        }))
      );

      // Carregar operadores
      const operadoresRes = await fetch('/api/usuarios?nivel=OPERADOR');
      const operadoresData = await operadoresRes.json();
      setOperadores(
        operadoresData.map((o: any) => ({
          id: o.id,
          label: `${o.matricula} - ${o.nome}`,
          value: o.id,
        }))
      );

      // Carregar estágios
      const estagiosRes = await fetch('/api/estagios?ativos=true');
      const estagiosData = await estagiosRes.json();
      setEstagios(
        estagiosData.map((e: any) => ({
          id: e.id,
          label: `${e.codigo} - ${e.nome}`,
          value: e.id,
        }))
      );

      // Carregar grupos dos produtos
      const produtosRes = await fetch('/api/produtos?limit=1000');
      const produtosData = await produtosRes.json();
      
      const gruposUnicos = new Set();
      const gruposList: Option[] = [];
      
      (produtosData.data || []).forEach((p: any) => {
        if (p.codigo && !gruposUnicos.has(p.codigo)) {
          gruposUnicos.add(p.codigo);
          gruposList.push({
            id: p.codigo,
            label: p.codigo,
            value: p.codigo,
          });
        }
      });
      
      setGrupos(gruposList);

      // Gerar datas iniciais
      gerarDatasDoPeriodo();

    } catch (error) {
      console.error('Erro ao carregar opções:', error);
    }
  }

  // 🔴 Função para gerar datas dentro do período selecionado
  const gerarDatasDoPeriodo = () => {
    if (!filtros.periodo.inicio || !filtros.periodo.fim) return;

    const inicio = new Date(filtros.periodo.inicio);
    const fim = new Date(filtros.periodo.fim);
    const datas: Option[] = [];

    // Garantir que início não seja maior que fim
    if (inicio > fim) return;

    const dias = Math.ceil((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
    
    for (let i = 0; i <= dias; i++) {
      const data = new Date(inicio);
      data.setDate(inicio.getDate() + i);
      const dataStr = data.toISOString().split('T')[0];
      const dataFormatada = data.toLocaleDateString('pt-BR');
      
      datas.push({
        id: dataStr,
        label: dataFormatada,
        value: dataStr,
      });
    }

    setDatasDisponiveis(datas);
    
    // 🔴 Limpar datas selecionadas que não estão mais no período
    setFiltros(prev => ({
      ...prev,
      datas: prev.datas.filter(d => datas.some(opt => opt.value === d))
    }));
  };

  const atualizarFiltro = (campo: string, valor: any) => {
    setFiltros(prev => ({ ...prev, [campo]: valor }));
  };

  const limparFiltros = () => {
    setFiltros({
      periodo: {
        inicio: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        fim: new Date().toISOString().split('T')[0],
      },
      maquinas: [],
      operadores: [],
      datas: [],
      grupos: [],
      estagios: [],
      referencia: 'produto',
    });
  };

  const temFiltrosAtivos = () => {
    return (
      filtros.maquinas.length > 0 ||
      filtros.operadores.length > 0 ||
      filtros.datas.length > 0 ||
      filtros.grupos.length > 0 ||
      filtros.estagios.length > 0
    );
  };

  return (
    <Card>
      <CardContent className="pt-6">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Filtros</h3>
            {temFiltrosAtivos() && (
              <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">
                {Object.values(filtros).reduce((acc, val) => 
                  acc + (Array.isArray(val) ? val.length : 0), 0
                )} ativos
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(!isOpen)}
            className="h-8 w-8 p-0"
          >
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        {isOpen && (
          <div className="space-y-4">
            {/* Período */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dataInicio">Data Início</Label>
                <Input
                  id="dataInicio"
                  type="date"
                  value={filtros.periodo.inicio}
                  onChange={(e) => {
                    const novaData = e.target.value;
                    setFiltros(prev => ({
                      ...prev,
                      periodo: { ...prev.periodo, inicio: novaData }
                    }));
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dataFim">Data Fim</Label>
                <Input
                  id="dataFim"
                  type="date"
                  value={filtros.periodo.fim}
                  onChange={(e) => {
                    const novaData = e.target.value;
                    setFiltros(prev => ({
                      ...prev,
                      periodo: { ...prev.periodo, fim: novaData }
                    }));
                  }}
                />
              </div>
            </div>

            {/* Máquinas e Operadores */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MultiSelect
                label="Máquinas"
                options={maquinas}
                selected={filtros.maquinas}
                onChange={(val) => atualizarFiltro('maquinas', val)}
                placeholder="Todas as máquinas"
              />
              <MultiSelect
                label="Operadores"
                options={operadores}
                selected={filtros.operadores}
                onChange={(val) => atualizarFiltro('operadores', val)}
                placeholder="Todos os operadores"
              />
            </div>

            {/* Datas Específicas (agora limitadas ao período) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MultiSelect
                label="Datas Específicas"
                options={datasDisponiveis}
                selected={filtros.datas}
                onChange={(val) => atualizarFiltro('datas', val)}
                placeholder="Todas as datas do período"
              />
              <MultiSelect
                label="Grupos de Produto"
                options={grupos}
                selected={filtros.grupos}
                onChange={(val) => atualizarFiltro('grupos', val)}
                placeholder="Todos os grupos"
              />
            </div>

            {/* Estágios */}
            <div className="grid grid-cols-1 gap-4">
              <MultiSelect
                label="Estágios"
                options={estagios}
                selected={filtros.estagios}
                onChange={(val) => atualizarFiltro('estagios', val)}
                placeholder="Todos os estágios"
              />
            </div>

            {/* Referência para eficiência */}
            <div className="space-y-2">
              <Label>Referência para Cálculo de Eficiência</Label>
              <RadioGroup
                value={filtros.referencia}
                onValueChange={(val: 'produto' | 'maquina') => 
                  atualizarFiltro('referencia', val)
                }
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="produto" id="ref-produto" />
                  <Label htmlFor="ref-produto" className="cursor-pointer">
                    Velocidade do Produto (por estágio)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="maquina" id="ref-maquina" />
                  <Label htmlFor="ref-maquina" className="cursor-pointer">
                    Velocidade da Máquina (fixa)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Botão de limpar */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              {temFiltrosAtivos() && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={limparFiltros}
                  size="sm"
                >
                  <X className="mr-2 h-4 w-4" />
                  Limpar Filtros
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}