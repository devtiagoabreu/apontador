'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { FormModal } from '@/components/ui/form-modal';
import { z } from 'zod';
import { toast } from '@/components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const setorSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  areaId: z.string().min(1, 'Selecione uma área'),
  descricao: z.string().optional(),
  ativo: z.boolean().default(true),
});

type Setor = z.infer<typeof setorSchema> & { id: string; areaNome?: string };

const columns = [
  { key: 'nome' as const, title: 'Nome' },
  { key: 'areaNome' as const, title: 'Área' },
  { key: 'descricao' as const, title: 'Descrição' },
  {
    key: 'ativo' as const,
    title: 'Status',
    format: (value: boolean) => value ? 'Ativo' : 'Inativo',
  },
];

export default function SetoresPage() {
  const [setores, setSetores] = useState<Setor[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSetor, setSelectedSetor] = useState<Setor | null>(null);

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    await Promise.all([carregarSetores(), carregarAreas()]);
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

  async function carregarAreas() {
    try {
      const response = await fetch('/api/areas');
      const data = await response.json();
      setAreas(data);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as áreas',
        variant: 'destructive',
      });
    }
  }

  async function handleSubmit(data: any) {
    try {
      const url = selectedSetor ? `/api/setores/${selectedSetor.id}` : '/api/setores';
      const method = selectedSetor ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Erro ao salvar');

      toast({
        title: 'Sucesso',
        description: `Setor ${selectedSetor ? 'atualizado' : 'criado'} com sucesso`,
      });

      setModalOpen(false);
      setSelectedSetor(null);
      carregarSetores();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar o setor',
        variant: 'destructive',
      });
    }
  }

  async function handleDelete(setor: Setor) {
    if (!confirm('Tem certeza que deseja excluir este setor?')) return;

    try {
      const response = await fetch(`/api/setores/${setor.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Erro ao excluir');

      toast({
        title: 'Sucesso',
        description: 'Setor excluído com sucesso',
      });

      carregarSetores();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o setor',
        variant: 'destructive',
      });
    }
  }

  const formFields = [
    { name: 'nome', label: 'Nome', type: 'text' as const, required: true },
    { 
      name: 'areaId', 
      label: 'Área', 
      type: 'select' as const, 
      required: true,
      options: areas.map(a => ({ value: a.id, label: a.nome }))
    },
    { name: 'descricao', label: 'Descrição', type: 'textarea' as const },
    { name: 'ativo', label: 'Ativo', type: 'switch' as const },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Setores</h1>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Setor
        </Button>
      </div>

      <DataTable
        data={setores}
        columns={columns}
        onEdit={setSelectedSetor}
        onDelete={handleDelete}
      />

      <FormModal
        open={modalOpen || !!selectedSetor}
        onClose={() => {
          setModalOpen(false);
          setSelectedSetor(null);
        }}
        onSubmit={handleSubmit}
        title={selectedSetor ? 'Editar Setor' : 'Novo Setor'}
        fields={formFields}
        initialData={selectedSetor}
        schema={setorSchema}
      />
    </div>
  );
}