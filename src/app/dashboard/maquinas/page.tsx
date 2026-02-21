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

type StatusMaquina = 'DISPONIVEL' | 'EM_PROCESSO' | 'PARADA';

interface Maquina {
  id: string;
  nome: string;
  codigo: string;
  status: StatusMaquina;
  ativo: boolean;
  setoresNomes?: string;
  setores?: string[];
}

interface Setor {
  id: string;
  nome: string;
}

const columns = [
  { key: 'codigo' as const, title: 'Código' },
  { key: 'nome' as const, title: 'Nome' },
  { key: 'setoresNomes' as const, title: 'Setores' },
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
  const [formData, setFormData] = useState({
    nome: '',
    codigo: '',
    status: 'DISPONIVEL' as StatusMaquina,
    ativo: true,
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
      });
      // Carregar setores da máquina
      if (selectedMaquina.id) {
        fetch(`/api/maquinas/${selectedMaquina.id}/setores`)
          .then(res => res.json())
          .then(data => setSelectedSetores(data.map((s: any) => s.setorId)))
          .catch(err => console.error('Erro ao carregar setores:', err));
      }
    } else {
      setFormData({
        nome: '',
        codigo: '',
        status: 'DISPONIVEL',
        ativo: true,
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
        nome: formData.nome.trim(),
        codigo: formData.codigo.trim().toUpperCase(),
        status: formData.status,
        ativo: formData.ativo,
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
      setFormData({
        nome: '',
        codigo: '',
        status: 'DISPONIVEL',
        ativo: true,
      });
      
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

  const handleInputChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Renderização do formulário
  const renderForm = () => (
    <div className="space-y-4 py-4">
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
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
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