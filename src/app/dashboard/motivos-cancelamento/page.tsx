'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { FormModal } from '@/components/ui/form-modal';
import { z } from 'zod';
import { toast } from '@/components/ui/use-toast';

const motivoCancelamentoSchema = z.object({
  codigo: z.string().min(1, 'Código é obrigatório').max(10),
  descricao: z.string().min(3, 'Descrição deve ter no mínimo 3 caracteres'),
  ativo: z.boolean().default(true),
});

type MotivoCancelamento = z.infer<typeof motivoCancelamentoSchema> & { id: string };

const columns = [
  { key: 'codigo' as const, title: 'Código' },
  { key: 'descricao' as const, title: 'Descrição' },
  {
    key: 'ativo' as const,
    title: 'Status',
    format: (value: boolean) => value ? 'Ativo' : 'Inativo',
  },
];

const formFields = [
  { name: 'codigo', label: 'Código', type: 'text' as const, required: true },
  { name: 'descricao', label: 'Descrição', type: 'textarea' as const, required: true },
  { name: 'ativo', label: 'Ativo', type: 'switch' as const },
];

export default function MotivosCancelamentoPage() {
  const [motivos, setMotivos] = useState<MotivoCancelamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedMotivo, setSelectedMotivo] = useState<MotivoCancelamento | null>(null);

  useEffect(() => {
    carregarMotivos();
  }, []);

  async function carregarMotivos() {
    try {
      const response = await fetch('/api/motivos-cancelamento');
      const data = await response.json();
      setMotivos(data);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os motivos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(data: any) {
    try {
      const url = selectedMotivo 
        ? `/api/motivos-cancelamento/${selectedMotivo.id}`
        : '/api/motivos-cancelamento';
      
      const method = selectedMotivo ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Erro ao salvar');

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
        description: 'Não foi possível salvar o motivo',
        variant: 'destructive',
      });
    }
  }

  async function handleDelete(motivo: MotivoCancelamento) {
    if (!confirm('Tem certeza que deseja excluir este motivo?')) return;

    try {
      const response = await fetch(`/api/motivos-cancelamento/${motivo.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Erro ao excluir');

      toast({
        title: 'Sucesso',
        description: 'Motivo excluído com sucesso',
      });

      carregarMotivos();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o motivo',
        variant: 'destructive',
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Motivos de Cancelamento</h1>
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
        schema={motivoCancelamentoSchema}
      />
    </div>
  );
}