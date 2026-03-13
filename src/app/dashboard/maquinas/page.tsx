// src/app/dashboard/maquinas/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { toast } from '@/components/ui/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Maquina, MaquinaFormData } from '@/types/maquinas';

type StatusMaquina = 'DISPONIVEL' | 'EM_PROCESSO' | 'PARADA';

interface Setor {
  id: string;
  nome: string;
}

const columns = [
  { key: 'codigo' as const, title: 'Código' },
  { key: 'nome' as const, title: 'Nome' },
  { key: 'setoresNomes' as const, title: 'Setores' },
  { 
    key: 'velocidadePadrao' as const, 
    title: 'Velocidade (m/min)',
    format: (value: number) => value ? value.toFixed(2) : '0'
  },
  { 
    key: 'capacidadeKg' as const, 
    title: 'Capacidade (kg)',
    format: (value: number) => value ? value.toFixed(2) : '0'
  },
  { 
    key: 'capacidadeLitros' as const, 
    title: 'Capacidade (L)',
    format: (value: number) => value ? value.toFixed(2) : '0'
  },
  { 
    key: 'tempoDiarioDisponivel' as const, 
    title: 'Tempo Disponível (min)',
    format: (value: number) => value.toString()
  },
  { 
    key: 'status' as const, 
    title: 'Status',
    format: (value: string) => {
      const statusMap = {
        'DISPONIVEL': 'Disponível',
        'EM_PROCESSO': 'Em Processo',
        'PARADA': 'Parada'
      };
      const colors = {
        'DISPONIVEL': 'bg-green-100 text-green-800',
        'EM_PROCESSO': 'bg-blue-100 text-blue-800',
        'PARADA': 'bg-yellow-100 text-yellow-800'
      };
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[value as keyof typeof colors] || 'bg-gray-100'}`}>
          {statusMap[value as keyof typeof statusMap] || value}
        </span>
      );
    }
  },
  {
    key: 'ativo' as const,
    title: 'Ativo',
    format: (value: boolean) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`}>
        {value ? 'Sim' : 'Não'}
      </span>
    )
  },
];

export default function MaquinasPage() {
  const [maquinas, setMaquinas] = useState<Maquina[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedMaquina, setSelectedMaquina] = useState<Maquina | null>(null);
  const [selectedSetores, setSelectedSetores] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basico');
  const [formData, setFormData] = useState<MaquinaFormData>({
    nome: '',
    codigo: '',
    status: 'DISPONIVEL',
    ativo: true,
    velocidadePadrao: 0,
    capacidadeKg: 0,
    capacidadeLitros: 0,
    tempoDiarioDisponivel: 1440,
    setores: [],
  });

  useEffect(() => {
    carregarDados();
  }, []);

  useEffect(() => {
    if (selectedMaquina) {
      setFormData({
        nome: selectedMaquina.nome,
        codigo: selectedMaquina.codigo,
        status: selectedMaquina.status,
        ativo: selectedMaquina.ativo,
        velocidadePadrao: selectedMaquina.velocidadePadrao || 0,
        capacidadeKg: selectedMaquina.capacidadeKg || 0,
        capacidadeLitros: selectedMaquina.capacidadeLitros || 0,
        tempoDiarioDisponivel: selectedMaquina.tempoDiarioDisponivel || 1440,
        setores: selectedMaquina.setores || [],
      });
      setSelectedSetores(selectedMaquina.setores || []);
    } else {
      setFormData({
        nome: '',
        codigo: '',
        status: 'DISPONIVEL',
        ativo: true,
        velocidadePadrao: 0,
        capacidadeKg: 0,
        capacidadeLitros: 0,
        tempoDiarioDisponivel: 1440,
        setores: [],
      });
      setSelectedSetores([]);
    }
  }, [selectedMaquina]);

  async function carregarDados() {
    setLoading(true);
    try {
      await Promise.all([carregarMaquinas(), carregarSetores()]);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  }

  async function carregarMaquinas() {
    try {
      const response = await fetch('/api/maquinas');
      if (!response.ok) throw new Error('Erro ao carregar máquinas');
      const data = await response.json();
      setMaquinas(data);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as máquinas',
        variant: 'destructive',
      });
    }
  }

  async function carregarSetores() {
    try {
      const response = await fetch('/api/setores');
      if (!response.ok) throw new Error('Erro ao carregar setores');
      const data = await response.json();
      setSetores(data);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os setores',
        variant: 'destructive',
      });
    }
  }

  async function handleSubmit() {
    try {
      // Validar dados
      if (!formData.nome || formData.nome.trim().length < 3) {
        toast({
          title: 'Erro',
          description: 'Nome deve ter no mínimo 3 caracteres',
          variant: 'destructive',
        });
        return;
      }

      if (!formData.codigo || formData.codigo.trim().length === 0) {
        toast({
          title: 'Erro',
          description: 'Código é obrigatório',
          variant: 'destructive',
        });
        return;
      }

      if (selectedSetores.length === 0) {
        toast({
          title: 'Erro',
          description: 'Selecione pelo menos um setor',
          variant: 'destructive',
        });
        return;
      }

      const dataToSubmit = {
        ...formData,
        codigo: formData.codigo.trim().toUpperCase(),
        setores: selectedSetores,
      };

      console.log('📦 Enviando dados:', dataToSubmit);

      const url = selectedMaquina ? `/api/maquinas/${selectedMaquina.id}` : '/api/maquinas';
      const method = selectedMaquina ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSubmit),
      });

      const data = await response.json();
      console.log('📦 Resposta:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao salvar máquina');
      }

      toast({
        title: 'Sucesso',
        description: `Máquina ${selectedMaquina ? 'atualizada' : 'criada'} com sucesso`,
      });

      // Fechar modal e limpar formulário
      setModalOpen(false);
      setSelectedMaquina(null);
      setSelectedSetores([]);
      
      // Recarregar lista
      await carregarMaquinas();
      
    } catch (error) {
      console.error('❌ Erro detalhado:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao salvar máquina',
        variant: 'destructive',
      });
    }
  }

  async function handleDelete(maquina: Maquina) {
    if (!confirm(`Tem certeza que deseja excluir a máquina ${maquina.nome}?`)) return;

    try {
      const response = await fetch(`/api/maquinas/${maquina.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao excluir');
      }

      toast({
        title: 'Sucesso',
        description: 'Máquina excluída com sucesso',
      });

      carregarMaquinas();
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Não foi possível excluir a máquina',
        variant: 'destructive',
      });
    }
  }

  const handleInputChange = (field: keyof MaquinaFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Renderização do formulário com abas
  const renderForm = () => (
    <div className="py-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="basico">Básico</TabsTrigger>
          <TabsTrigger value="parametros">Parâmetros</TabsTrigger>
        </TabsList>

        <TabsContent value="basico" className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome *</Label>
            <Input
              id="nome"
              value={formData.nome}
              onChange={(e) => handleInputChange('nome', e.target.value)}
              placeholder="Ex: JIGGER 01"
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="codigo">Código *</Label>
            <Input
              id="codigo"
              value={formData.codigo}
              onChange={(e) => handleInputChange('codigo', e.target.value.toUpperCase())}
              placeholder="Ex: JG001"
              className="w-full uppercase"
            />
          </div>

          <div className="space-y-2">
            <Label>Setores * (múltiplos)</Label>
            <div className="border rounded-md p-4 space-y-2 max-h-48 overflow-y-auto">
              {setores.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  Nenhum setor encontrado. Cadastre setores primeiro.
                </p>
              ) : (
                setores.map((setor) => (
                  <div key={setor.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={setor.id}
                      checked={selectedSetores.includes(setor.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedSetores([...selectedSetores, setor.id]);
                        } else {
                          setSelectedSetores(selectedSetores.filter(id => id !== setor.id));
                        }
                      }}
                    />
                    <Label htmlFor={setor.id} className="text-sm cursor-pointer">
                      {setor.nome}
                    </Label>
                  </div>
                ))
              )}
            </div>
            {selectedSetores.length > 0 && (
              <p className="text-xs text-gray-500">
                {selectedSetores.length} setor(es) selecionado(s)
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value: StatusMaquina) => handleInputChange('status', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DISPONIVEL">Disponível</SelectItem>
                <SelectItem value="EM_PROCESSO">Em Processo</SelectItem>
                <SelectItem value="PARADA">Parada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="ativo"
              checked={formData.ativo}
              onCheckedChange={(checked) => handleInputChange('ativo', checked)}
            />
            <Label htmlFor="ativo" className="text-sm cursor-pointer">
              Máquina Ativa
            </Label>
          </div>
        </TabsContent>

        <TabsContent value="parametros" className="space-y-4 py-4">
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base">Parâmetros de Desempenho</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="velocidadePadrao">Velocidade Padrão (m/min)</Label>
                <Input
                  id="velocidadePadrao"
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.velocidadePadrao}
                  onChange={(e) => handleInputChange('velocidadePadrao', Number(e.target.value))}
                  placeholder="0"
                />
                <p className="text-xs text-gray-500">
                  Velocidade média de processamento em metros por minuto
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="capacidadeKg">Capacidade (kg)</Label>
                <Input
                  id="capacidadeKg"
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.capacidadeKg}
                  onChange={(e) => handleInputChange('capacidadeKg', Number(e.target.value))}
                  placeholder="0"
                />
                <p className="text-xs text-gray-500">
                  Capacidade máxima em quilogramas por lote
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="capacidadeLitros">Capacidade (litros)</Label>
                <Input
                  id="capacidadeLitros"
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.capacidadeLitros}
                  onChange={(e) => handleInputChange('capacidadeLitros', Number(e.target.value))}
                  placeholder="0"
                />
                <p className="text-xs text-gray-500">
                  Capacidade máxima em litros por lote
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tempoDiarioDisponivel">Tempo Diário Disponível (min)</Label>
                <Input
                  id="tempoDiarioDisponivel"
                  type="number"
                  step="1"
                  min="0"
                  max="1440"
                  value={formData.tempoDiarioDisponivel}
                  onChange={(e) => handleInputChange('tempoDiarioDisponivel', Number(e.target.value))}
                  placeholder="1440"
                />
                <p className="text-xs text-gray-500">
                  Tempo total disponível por dia em minutos (padrão: 1440 min = 24h)
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Máquinas</h1>
        <Button onClick={() => {
          setSelectedMaquina(null);
          setModalOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Máquina
        </Button>
      </div>

      {loading && !maquinas.length ? (
        <div className="text-center py-8 text-gray-500">
          Carregando máquinas...
        </div>
      ) : (
        <DataTable
          data={maquinas}
          columns={columns}
          onEdit={(maquina) => {
            setSelectedMaquina(maquina);
            setModalOpen(true);
          }}
          onDelete={handleDelete}
        />
      )}

      {/* Modal de máquina */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedMaquina ? 'Editar Máquina' : 'Nova Máquina'}
            </DialogTitle>
          </DialogHeader>

          {renderForm()}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setModalOpen(false);
                setSelectedMaquina(null);
              }}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={handleSubmit}>
              {selectedMaquina ? 'Atualizar' : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}