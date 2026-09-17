'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { FormModal } from '@/components/ui/form-modal';
import { z } from 'zod';
import { toast } from '@/components/ui/use-toast';

const tipoManutencaoSchema = z.object({
  codigo: z.string().min(1, 'Código é obrigatório').max(20),
  nome: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres').max(100),
  ativo: z.boolean().default(true),
});

type TipoManutencao = z.infer<typeof tipoManutencaoSchema> & { id: string };

const columns = [
  { key: 'codigo' as const, title: 'Código' },
  { key: 'nome' as const, title: 'Nome' },
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
  { name: 'nome', label: 'Nome', type: 'text' as const, required: true },
  { name: 'ativo', label: 'Ativo', type: 'switch' as const },
];

export default function TiposManutencaoPage() {
  const [tipos, setTipos] = useState<TipoManutencao[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTipo, setSelectedTipo] = useState<TipoManutencao | null>(null);

  useEffect(() => {
    carregarTipos();
  }, []);

  async function carregarTipos() {
    try {
      const response = await fetch('/api/tipos-manutencao');
      const data = await response.json();
      setTipos(data);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os tipos de manutenção',
        variant: 'destructive',
      });
    }
  }

  async function handleSubmit(data: any) {
    try {
      const url = selectedTipo ? `/api/tipos-manutencao/${selectedTipo.id}` : '/api/tipos-manutencao';
      const method = selectedTipo ? 'PUT' : 'POST';
      
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
        description: `Tipo ${selectedTipo ? 'atualizado' : 'criado'} com sucesso`,
      });

      setModalOpen(false);
      setSelectedTipo(null);
      carregarTipos();
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao salvar',
        variant: 'destructive',
      });
    }
  }

  async function handleDelete(tipo: TipoManutencao) {
    if (!confirm(`Tem certeza que deseja excluir o tipo ${tipo.nome}?`)) return;

    try {
      const response = await fetch(`/api/tipos-manutencao/${tipo.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao excluir');
      }

      toast({
        title: 'Sucesso',
        description: 'Tipo excluído com sucesso',
      });

      carregarTipos();
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Não foi possível excluir o tipo',
        variant: 'destructive',
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Tipos de Manutenção</h1>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Tipo
        </Button>
      </div>

      <DataTable
        data={tipos}
        columns={columns}
        onEdit={setSelectedTipo}
        onDelete={handleDelete}
      />

      <FormModal
        open={modalOpen || !!selectedTipo}
        onClose={() => {
          setModalOpen(false);
          setSelectedTipo(null);
        }}
        onSubmit={handleSubmit}
        title={selectedTipo ? 'Editar Tipo' : 'Novo Tipo'}
        fields={formFields}
        initialData={selectedTipo}
        schema={tipoManutencaoSchema}
      />
    </div>
  );
}