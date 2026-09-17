'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { FormModal } from '@/components/ui/form-modal';
import { z } from 'zod';
import { toast } from '@/components/ui/use-toast';

const atividadeManutencaoSchema = z.object({
  codigo: z.string().min(1, 'Código é obrigatório').max(20),
  nome: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres').max(100),
  ativo: z.boolean().default(true),
});

type AtividadeManutencao = z.infer<typeof atividadeManutencaoSchema> & { id: string };

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

export default function AtividadesManutencaoPage() {
  const [atividades, setAtividades] = useState<AtividadeManutencao[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAtividade, setSelectedAtividade] = useState<AtividadeManutencao | null>(null);

  useEffect(() => {
    carregarAtividades();
  }, []);

  async function carregarAtividades() {
    try {
      const response = await fetch('/api/atividades-manutencao');
      const data = await response.json();
      setAtividades(data);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as atividades de manutenção',
        variant: 'destructive',
      });
    }
  }

  async function handleSubmit(data: any) {
    try {
      const url = selectedAtividade ? `/api/atividades-manutencao/${selectedAtividade.id}` : '/api/atividades-manutencao';
      const method = selectedAtividade ? 'PUT' : 'POST';
      
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
        description: `Atividade ${selectedAtividade ? 'atualizada' : 'criada'} com sucesso`,
      });

      setModalOpen(false);
      setSelectedAtividade(null);
      carregarAtividades();
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao salvar',
        variant: 'destructive',
      });
    }
  }

  async function handleDelete(atividade: AtividadeManutencao) {
    if (!confirm(`Tem certeza que deseja excluir a atividade ${atividade.nome}?`)) return;

    try {
      const response = await fetch(`/api/atividades-manutencao/${atividade.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao excluir');
      }

      toast({
        title: 'Sucesso',
        description: 'Atividade excluída com sucesso',
      });

      carregarAtividades();
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Não foi possível excluir a atividade',
        variant: 'destructive',
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Atividades de Manutenção</h1>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Atividade
        </Button>
      </div>

      <DataTable
        data={atividades}
        columns={columns}
        onEdit={setSelectedAtividade}
        onDelete={handleDelete}
      />

      <FormModal
        open={modalOpen || !!selectedAtividade}
        onClose={() => {
          setModalOpen(false);
          setSelectedAtividade(null);
        }}
        onSubmit={handleSubmit}
        title={selectedAtividade ? 'Editar Atividade' : 'Nova Atividade'}
        fields={formFields}
        initialData={selectedAtividade}
        schema={atividadeManutencaoSchema}
      />
    </div>
  );
}