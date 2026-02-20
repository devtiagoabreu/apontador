'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { FormModal } from '@/components/ui/form-modal';
import { z } from 'zod';
import { toast } from '@/components/ui/use-toast';

const areaSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  descricao: z.string().optional(),
  ativo: z.boolean().default(true),
});

type Area = z.infer<typeof areaSchema> & { id: string };

const columns = [
  { key: 'nome' as const, title: 'Nome' },
  { key: 'descricao' as const, title: 'Descrição' },
  {
    key: 'ativo' as const,
    title: 'Status',
    format: (value: boolean) => value ? 'Ativo' : 'Inativo',
  },
];

const formFields = [
  { name: 'nome', label: 'Nome', type: 'text' as const, required: true },
  { name: 'descricao', label: 'Descrição', type: 'textarea' as const },
  { name: 'ativo', label: 'Ativo', type: 'switch' as const },
];

export default function AreasPage() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);

  useEffect(() => {
    carregarAreas();
  }, []);

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
      const url = selectedArea ? `/api/areas/${selectedArea.id}` : '/api/areas';
      const method = selectedArea ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Erro ao salvar');

      toast({
        title: 'Sucesso',
        description: `Área ${selectedArea ? 'atualizada' : 'criada'} com sucesso`,
      });

      setModalOpen(false);
      setSelectedArea(null);
      carregarAreas();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar a área',
        variant: 'destructive',
      });
    }
  }

  async function handleDelete(area: Area) {
    if (!confirm('Tem certeza que deseja excluir esta área?')) return;

    try {
      const response = await fetch(`/api/areas/${area.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Erro ao excluir');

      toast({
        title: 'Sucesso',
        description: 'Área excluída com sucesso',
      });

      carregarAreas();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir a área',
        variant: 'destructive',
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Áreas</h1>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Área
        </Button>
      </div>

      <DataTable
        data={areas}
        columns={columns}
        onEdit={setSelectedArea}
        onDelete={handleDelete}
      />

      <FormModal
        open={modalOpen || !!selectedArea}
        onClose={() => {
          setModalOpen(false);
          setSelectedArea(null);
        }}
        onSubmit={handleSubmit}
        title={selectedArea ? 'Editar Área' : 'Nova Área'}
        fields={formFields}
        initialData={selectedArea}
        schema={areaSchema}
      />
    </div>
  );
}