'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { FormModal } from '@/components/ui/form-modal';
import { z } from 'zod';
import { toast } from '@/components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui'; // Se estiver usando o index.ts
import { Label } from '@/components/ui/label';

// Definir o tipo para status
type StatusMaquina = 'DISPONIVEL' | 'EM_PROCESSO' | 'PARADA';

const maquinaSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  codigo: z.string().min(1, 'Código é obrigatório').max(20),
  setores: z.array(z.string()).min(1, 'Selecione pelo menos um setor'),
  status: z.enum(['DISPONIVEL', 'EM_PROCESSO', 'PARADA']).default('DISPONIVEL'),
  ativo: z.boolean().default(true),
});

type Maquina = z.infer<typeof maquinaSchema> & { id: string; setoresNomes?: string };

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
      return statusMap[value as keyof typeof statusMap] || value;
    }
  },
  {
    key: 'ativo' as const,
    title: 'Status',
    format: (value: boolean) => value ? 'Ativo' : 'Inativo',
  },
];

export default function MaquinasPage() {
  const [maquinas, setMaquinas] = useState<Maquina[]>([]);
  const [setores, setSetores] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedMaquina, setSelectedMaquina] = useState<Maquina | null>(null);
  const [selectedSetores, setSelectedSetores] = useState<string[]>([]);
  const [formData, setFormData] = useState<Partial<Maquina>>({
    nome: '',
    codigo: '',
    status: 'DISPONIVEL',
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
      fetch(`/api/maquinas/${selectedMaquina.id}/setores`)
        .then(res => res.json())
        .then(data => setSelectedSetores(data.map((s: any) => s.setorId)));
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
    await Promise.all([carregarMaquinas(), carregarSetores()]);
  }

  async function carregarMaquinas() {
    try {
      const response = await fetch('/api/maquinas');
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
      if (!formData.nome || formData.nome.length < 3) {
        toast({
          title: 'Erro',
          description: 'Nome deve ter no mínimo 3 caracteres',
          variant: 'destructive',
        });
        return;
      }

      if (!formData.codigo) {
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
        setores: selectedSetores,
      };

      const url = selectedMaquina ? `/api/maquinas/${selectedMaquina.id}` : '/api/maquinas';
      const method = selectedMaquina ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSubmit),
      });

      if (!response.ok) throw new Error('Erro ao salvar');

      toast({
        title: 'Sucesso',
        description: `Máquina ${selectedMaquina ? 'atualizada' : 'criada'} com sucesso`,
      });

      setModalOpen(false);
      setSelectedMaquina(null);
      setSelectedSetores([]);
      setFormData({
        nome: '',
        codigo: '',
        status: 'DISPONIVEL',
        ativo: true,
      });
      carregarMaquinas();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar a máquina',
        variant: 'destructive',
      });
    }
  }

  async function handleDelete(maquina: Maquina) {
    if (!confirm('Tem certeza que deseja excluir esta máquina?')) return;

    try {
      const response = await fetch(`/api/maquinas/${maquina.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Erro ao excluir');

      toast({
        title: 'Sucesso',
        description: 'Máquina excluída com sucesso',
      });

      carregarMaquinas();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir a máquina',
        variant: 'destructive',
      });
    }
  }

  const handleInputChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Custom form for máquina with multiple setores
  const renderMaquinaForm = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nome">Nome *</Label>
        <input
          id="nome"
          className="w-full rounded-md border border-input bg-background px-3 py-2"
          value={formData.nome || ''}
          onChange={(e) => handleInputChange('nome', e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="codigo">Código *</Label>
        <input
          id="codigo"
          className="w-full rounded-md border border-input bg-background px-3 py-2"
          value={formData.codigo || ''}
          onChange={(e) => handleInputChange('codigo', e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Setores * (múltiplos)</Label>
        <div className="border rounded-md p-4 space-y-2 max-h-48 overflow-y-auto">
          {setores.map((setor) => (
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
              <Label htmlFor={setor.id} className="text-sm">
                {setor.nome}
              </Label>
            </div>
          ))}
        </div>
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

      <div className="flex items-center space-x-2">
        <Checkbox
          id="ativo"
          checked={formData.ativo}
          onCheckedChange={(checked) => handleInputChange('ativo', checked)}
        />
        <Label htmlFor="ativo">Ativo</Label>
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

      <DataTable
        data={maquinas}
        columns={columns}
        onEdit={(maquina) => {
          setSelectedMaquina(maquina);
          setModalOpen(true);
        }}
        onDelete={handleDelete}
      />

      {/* Modal personalizado para máquina */}
      <FormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedMaquina(null);
          setSelectedSetores([]);
          setFormData({
            nome: '',
            codigo: '',
            status: 'DISPONIVEL',
            ativo: true,
          });
        }}
        onSubmit={handleSubmit}
        title={selectedMaquina ? 'Editar Máquina' : 'Nova Máquina'}
        fields={[]}
        schema={maquinaSchema}
      >
        {renderMaquinaForm()}
      </FormModal>
    </div>
  );
}