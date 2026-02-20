'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Save, X } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { toast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface Produto {
  id: string;
  codigo: string;
  nome: string;
  um: string;
  nivel?: string;
  grupo?: string;
  sub?: string;
  item?: string;
  composicao: {
    algodao: { percentual: number; fio: string };
    poliester: { percentual: number; fio: string };
    elastano: { percentual: number; fio: string };
    linho: { percentual: number; fio: string };
    viscoso: { percentual: number; fio: string };
    acrilico: { percentual: number; fio: string };
  };
  largura: number;
  gramaturaLinear: number;
  gramaturaM2: number;
  tipoTecido: 'PLANO' | 'MALHA' | 'NAO_TECIDO';
  ligamento: string;
  fiosUrdume: number;
  fiosTrama: number;
  classificacaoPeso: 'LEVE' | 'MEDIO' | 'PESADO';
  parametrosEficiencia: {
    preparacao: { tempoPadrao: number; rendimento: number; velocidade: number };
    tingimento: { tempoPadrao: number; rendimento: number; velocidade: number };
    alvejamento: { tempoPadrao: number; rendimento: number; velocidade: number };
    secagem: { tempoPadrao: number; rendimento: number; velocidade: number };
    estamparia: { tempoPadrao: number; rendimento: number; velocidade: number };
    acabamento: { tempoPadrao: number; rendimento: number; velocidade: number };
    revisao: { tempoPadrao: number; rendimento: number; velocidade: number };
  };
  metaDiaria?: number;
  metaMensal?: number;
  ativo: boolean;
}

const columns = [
  { key: 'codigo' as const, title: 'Código' },
  { key: 'nome' as const, title: 'Nome' },
  { key: 'um' as const, title: 'UM' },
  { 
    key: 'classificacaoPeso' as const, 
    title: 'Peso',
    format: (value: string) => {
      const colors = {
        'LEVE': 'bg-green-100 text-green-800',
        'MEDIO': 'bg-yellow-100 text-yellow-800',
        'PESADO': 'bg-red-100 text-red-800'
      };
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[value as keyof typeof colors] || 'bg-gray-100'}`}>
          {value}
        </span>
      );
    }
  },
  {
    key: 'ativo' as const,
    title: 'Status',
    format: (value: boolean) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`}>
        {value ? 'Ativo' : 'Inativo'}
      </span>
    )
  },
];

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProduto, setSelectedProduto] = useState<Produto | null>(null);
  const [activeTab, setActiveTab] = useState('basico');
  const [formData, setFormData] = useState<Partial<Produto>>({});

  useEffect(() => {
    carregarProdutos();
  }, []);

  useEffect(() => {
    if (selectedProduto) {
      setFormData(selectedProduto);
    } else {
      setFormData({
        codigo: '',
        nome: '',
        um: 'M',
        composicao: {
          algodao: { percentual: 0, fio: '' },
          poliester: { percentual: 0, fio: '' },
          elastano: { percentual: 0, fio: '' },
          linho: { percentual: 0, fio: '' },
          viscoso: { percentual: 0, fio: '' },
          acrilico: { percentual: 0, fio: '' }
        },
        largura: 0,
        gramaturaLinear: 0,
        gramaturaM2: 0,
        tipoTecido: 'PLANO',
        ligamento: 'TELA',
        fiosUrdume: 0,
        fiosTrama: 0,
        classificacaoPeso: 'MEDIO',
        parametrosEficiencia: {
          preparacao: { tempoPadrao: 0, rendimento: 100, velocidade: 0 },
          tingimento: { tempoPadrao: 0, rendimento: 100, velocidade: 0 },
          alvejamento: { tempoPadrao: 0, rendimento: 100, velocidade: 0 },
          secagem: { tempoPadrao: 0, rendimento: 100, velocidade: 0 },
          estamparia: { tempoPadrao: 0, rendimento: 100, velocidade: 0 },
          acabamento: { tempoPadrao: 0, rendimento: 100, velocidade: 0 },
          revisao: { tempoPadrao: 0, rendimento: 100, velocidade: 0 }
        },
        ativo: true
      });
    }
  }, [selectedProduto]);

  async function carregarProdutos() {
    try {
      const response = await fetch('/api/produtos');
      const data = await response.json();
      setProdutos(data);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os produtos',
        variant: 'destructive',
      });
    }
  }

  function calcularGramaturaM2() {
    if (formData.gramaturaLinear && formData.largura && formData.largura > 0) {
      const gramaturaM2 = formData.gramaturaLinear / formData.largura;
      setFormData(prev => ({
        ...prev,
        gramaturaM2,
        classificacaoPeso: gramaturaM2 < 130 ? 'LEVE' : gramaturaM2 > 220 ? 'PESADO' : 'MEDIO'
      }));
    }
  }

  function calcularPercentualTotal() {
    if (!formData.composicao) return 0;
    return Object.values(formData.composicao).reduce((acc, item) => acc + (item.percentual || 0), 0);
  }

  async function handleSubmit() {
    try {
      // Validar percentuais
      const totalPercentual = calcularPercentualTotal();
      if (totalPercentual > 100) {
        toast({
          title: 'Erro',
          description: 'A soma dos percentuais não pode ultrapassar 100%',
          variant: 'destructive',
        });
        return;
      }

      const url = selectedProduto ? `/api/produtos/${selectedProduto.id}` : '/api/produtos';
      const method = selectedProduto ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Erro ao salvar');

      toast({
        title: 'Sucesso',
        description: `Produto ${selectedProduto ? 'atualizado' : 'criado'} com sucesso`,
      });

      setModalOpen(false);
      setSelectedProduto(null);
      carregarProdutos();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar o produto',
        variant: 'destructive',
      });
    }
  }

  async function handleDelete(produto: Produto) {
    if (!confirm(`Tem certeza que deseja excluir o produto ${produto.nome}?`)) return;

    try {
      const response = await fetch(`/api/produtos/${produto.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Erro ao excluir');

      toast({
        title: 'Sucesso',
        description: 'Produto excluído com sucesso',
      });

      carregarProdutos();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o produto',
        variant: 'destructive',
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Produtos</h1>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Produto
        </Button>
      </div>

      <DataTable
        data={produtos}
        columns={columns}
        onEdit={setSelectedProduto}
        onDelete={handleDelete}
      />

      {/* Modal de Produto */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold">
                {selectedProduto ? 'Editar Produto' : 'Novo Produto'}
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setModalOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="p-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="basico">Básico</TabsTrigger>
                  <TabsTrigger value="composicao">Composição</TabsTrigger>
                  <TabsTrigger value="dimensoes">Dimensões</TabsTrigger>
                  <TabsTrigger value="estrutura">Estrutura</TabsTrigger>
                  <TabsTrigger value="eficiencia">Eficiência</TabsTrigger>
                </TabsList>

                <TabsContent value="basico" className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="codigo">Código *</Label>
                      <Input
                        id="codigo"
                        value={formData.codigo || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, codigo: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="um">Unidade Medida *</Label>
                      <Input
                        id="um"
                        value={formData.um || 'M'}
                        onChange={(e) => setFormData(prev => ({ ...prev, um: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome *</Label>
                    <Input
                      id="nome"
                      value={formData.nome || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                    />
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <div className="space-y-2">
                      <Label htmlFor="nivel">Nível</Label>
                      <Input
                        id="nivel"
                        value={formData.nivel || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, nivel: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="grupo">Grupo</Label>
                      <Input
                        id="grupo"
                        value={formData.grupo || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, grupo: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sub">Sub</Label>
                      <Input
                        id="sub"
                        value={formData.sub || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, sub: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="item">Item</Label>
                      <Input
                        id="item"
                        value={formData.item || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, item: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 pt-4">
                    <Switch
                      id="ativo"
                      checked={formData.ativo}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ativo: checked }))}
                    />
                    <Label htmlFor="ativo">Produto Ativo</Label>
                  </div>
                </TabsContent>

                <TabsContent value="composicao" className="space-y-4 py-4">
                  <div className="bg-blue-50 p-3 rounded-lg mb-4">
                    <p className="text-sm text-blue-700">
                      Total: {calcularPercentualTotal()}% {calcularPercentualTotal() > 100 && '(⚠️ Ultrapassou 100%)'}
                    </p>
                  </div>

                  {['algodao', 'poliester', 'elastano', 'linho', 'viscoso', 'acrilico'].map((comp) => (
                    <Card key={comp}>
                      <CardHeader className="py-3">
                        <CardTitle className="text-base capitalize">{comp}</CardTitle>
                      </CardHeader>
                      <CardContent className="py-2">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Percentual (%)</Label>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={formData.composicao?.[comp as keyof typeof formData.composicao]?.percentual || 0}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                composicao: {
                                  ...prev.composicao!,
                                  [comp]: {
                                    ...prev.composicao?.[comp as keyof typeof prev.composicao],
                                    percentual: Number(e.target.value)
                                  }
                                }
                              }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Tipo de Fio</Label>
                            <Input
                              value={formData.composicao?.[comp as keyof typeof formData.composicao]?.fio || ''}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                composicao: {
                                  ...prev.composicao!,
                                  [comp]: {
                                    ...prev.composicao?.[comp as keyof typeof prev.composicao],
                                    fio: e.target.value
                                  }
                                }
                              }))}
                              placeholder="ex: 20/1"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>

                <TabsContent value="dimensoes" className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="largura">Largura (m)</Label>
                      <Input
                        id="largura"
                        type="number"
                        step="0.01"
                        value={formData.largura || 0}
                        onChange={(e) => setFormData(prev => ({ ...prev, largura: Number(e.target.value) }))}
                        onBlur={calcularGramaturaM2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gramaturaLinear">Gramatura Linear (g/m)</Label>
                      <Input
                        id="gramaturaLinear"
                        type="number"
                        step="0.1"
                        value={formData.gramaturaLinear || 0}
                        onChange={(e) => setFormData(prev => ({ ...prev, gramaturaLinear: Number(e.target.value) }))}
                        onBlur={calcularGramaturaM2}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Gramatura m² (g/m²)</Label>
                      <Input
                        type="number"
                        value={formData.gramaturaM2?.toFixed(2) || '0'}
                        disabled
                        className="bg-gray-50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Classificação</Label>
                      <Input
                        value={formData.classificacaoPeso || 'MEDIO'}
                        disabled
                        className="bg-gray-50 font-medium"
                      />
                    </div>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-lg mt-4">
                    <p className="text-sm text-gray-600">
                      <strong>💡 Dica:</strong> Tecidos com gramatura {'<'}130 g/m² são considerados 
                      <span className="text-green-600 font-medium"> LEVES</span> (velocidade +20%), 
                      entre 130-220 g/m² <span className="text-yellow-600 font-medium"> MÉDIOS</span> (velocidade padrão) 
                      e {'>'}220 g/m² <span className="text-red-600 font-medium"> PESADOS</span> (velocidade -30%).
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="estrutura" className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tipoTecido">Tipo de Tecido</Label>
                      <select
                        id="tipoTecido"
                        className="w-full rounded-md border border-input bg-background px-3 py-2"
                        value={formData.tipoTecido || 'PLANO'}
                        onChange={(e) => setFormData(prev => ({ ...prev, tipoTecido: e.target.value as any }))}
                      >
                        <option value="PLANO">Plano</option>
                        <option value="MALHA">Malha</option>
                        <option value="NAO_TECIDO">Não Tecido</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ligamento">Ligamento</Label>
                      <Input
                        id="ligamento"
                        value={formData.ligamento || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, ligamento: e.target.value }))}
                        placeholder="ex: TELA, SARJA, SEDA"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fiosUrdume">Fios Urdume (fios/cm²)</Label>
                      <Input
                        id="fiosUrdume"
                        type="number"
                        value={formData.fiosUrdume || 0}
                        onChange={(e) => setFormData(prev => ({ ...prev, fiosUrdume: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fiosTrama">Fios Trama (fios/cm²)</Label>
                      <Input
                        id="fiosTrama"
                        type="number"
                        value={formData.fiosTrama || 0}
                        onChange={(e) => setFormData(prev => ({ ...prev, fiosTrama: Number(e.target.value) }))}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="eficiencia" className="space-y-4 py-4">
                  {['preparacao', 'tingimento', 'alvejamento', 'secagem', 'estamparia', 'acabamento', 'revisao'].map((estagio) => (
                    <Card key={estagio}>
                      <CardHeader className="py-3">
                        <CardTitle className="text-base capitalize">{estagio}</CardTitle>
                      </CardHeader>
                      <CardContent className="py-2">
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>Tempo Padrão (min/m)</Label>
                            <Input
                              type="number"
                              step="0.1"
                              value={formData.parametrosEficiencia?.[estagio as keyof typeof formData.parametrosEficiencia]?.tempoPadrao || 0}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                parametrosEficiencia: {
                                  ...prev.parametrosEficiencia!,
                                  [estagio]: {
                                    ...prev.parametrosEficiencia?.[estagio as keyof typeof prev.parametrosEficiencia],
                                    tempoPadrao: Number(e.target.value)
                                  }
                                }
                              }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Rendimento (%)</Label>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={formData.parametrosEficiencia?.[estagio as keyof typeof formData.parametrosEficiencia]?.rendimento || 100}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                parametrosEficiencia: {
                                  ...prev.parametrosEficiencia!,
                                  [estagio]: {
                                    ...prev.parametrosEficiencia?.[estagio as keyof typeof prev.parametrosEficiencia],
                                    rendimento: Number(e.target.value)
                                  }
                                }
                              }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Velocidade (m/min)</Label>
                            <Input
                              type="number"
                              step="0.1"
                              value={formData.parametrosEficiencia?.[estagio as keyof typeof formData.parametrosEficiencia]?.velocidade || 0}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                parametrosEficiencia: {
                                  ...prev.parametrosEficiencia!,
                                  [estagio]: {
                                    ...prev.parametrosEficiencia?.[estagio as keyof typeof prev.parametrosEficiencia],
                                    velocidade: Number(e.target.value)
                                  }
                                }
                              }))}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>
              </Tabs>

              <div className="flex justify-end gap-3 pt-6 border-t mt-6">
                <Button variant="outline" onClick={() => setModalOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmit}>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Produto
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}