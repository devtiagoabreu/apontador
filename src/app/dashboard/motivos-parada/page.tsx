'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { FormModal } from '@/components/ui/form-modal';
import { z } from 'zod';
import { toast } from '@/components/ui/use-toast';

const motivoParadaSchema = z.object({
  codigo: z.string().min(1, 'Código é obrigatório').max(10),
  descricao: z.string().min(3, 'Descrição deve ter no mínimo 3 caracteres'),
  ativo: z.boolean().default(true),
});

type MotivoParada = z.infer<typeof motivoParadaSchema> & { id: string };

const columns = [
  { key: 'codigo' as const, title: 'Código' },
  { key: 'descricao' as const, title: 'Descrição' },
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

const formFields = [
  { name: 'codigo', label: 'Código', type: 'text' as const, required: true },
  { name: 'descricao', label: 'Descrição', type: 'textarea' as const, required: true },
  { name: 'ativo', label: 'Ativo', type: 'switch' as const },
];

export default function MotivosParadaPage() {
  const [motivos, setMotivos] = useState<MotivoParada[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedMotivo, setSelectedMotivo] = useState<MotivoParada | null>(null);

  useEffect(() => {
    carregarMotivos();
  }, []);

  async function carregarMotivos() {
    try {
      const response = await fetch('/api/motivos-parada');
      const data = await response.json();
      setMotivos(data);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os motivos',
        variant: 'destructive',
      });
    }
  }

  async function handleSubmit(data: any) {
    try {
      const url = selectedMotivo ? `/api/motivos-parada/${selectedMotivo.id}` : '/api/motivos-parada';
      const method = selectedMotivo ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao salvar');
      }

      toast({
        title: 'Sucesso',
        description: `Motivo ${selectedMotivo ? 'atualizado' : 'criado'} com sucesso`,
      });

      setModalOpen(false);
      setSelectedMotivo(null);
      carregarMotivos();
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao salvar',
        variant: 'destructive',
      });
    }
  }

  async function handleDelete(motivo: MotivoParada) {
    if (!confirm(`Tem certeza que deseja excluir o motivo ${motivo.descricao}?`)) return;

    try {
      const response = await fetch(`/api/motivos-parada/${motivo.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao excluir');
      }

      toast({
        title: 'Sucesso',
        description: 'Motivo excluído com sucesso',
      });

      carregarMotivos();
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Não foi possível excluir o motivo',
        variant: 'destructive',
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Motivos de Parada</h1>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Motivo
        </Button>
      </div>

      <DataTable
        data={motivos}
        columns={columns}
        onEdit={setSelectedMotivo}
        onDelete={handleDelete}
      />

      <FormModal
        open={modalOpen || !!selectedMotivo}
        onClose={() => {
          setModalOpen(false);
          setSelectedMotivo(null);
        }}
        onSubmit={handleSubmit}
        title={selectedMotivo ? 'Editar Motivo' : 'Novo Motivo'}
        fields={formFields}
        initialData={selectedMotivo}
        schema={motivoParadaSchema}
      />
    </div>
  );
}