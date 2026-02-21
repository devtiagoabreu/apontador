'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { FormModal } from '@/components/ui/form-modal';
import { z } from 'zod';
import { toast } from '@/components/ui/use-toast';

const estagioSchema = z.object({
  codigo: z.string().length(2, 'Código deve ter 2 caracteres'),
  nome: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres').max(50),
  ordem: z.coerce.number().int().positive('Ordem deve ser um número positivo'),
  descricao: z.string().optional(),
  cor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve estar no formato HEX').default('#3b82f6'),
  mostrarNoKanban: z.boolean().default(true),
  ativo: z.boolean().default(true),
});

type Estagio = z.infer<typeof estagioSchema> & { id: string };

const columns = [
  { key: 'codigo' as const, title: 'Código' },
  { key: 'nome' as const, title: 'Nome' },
  { key: 'ordem' as const, title: 'Ordem' },
  { 
    key: 'cor' as const, 
    title: 'Cor',
    format: (value: string) => (
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full border" style={{ backgroundColor: value }} />
        <span className="text-xs font-mono">{value}</span>
      </div>
    )
  },
  {
    key: 'mostrarNoKanban' as const,
    title: 'Kanban',
    format: (value: boolean) => value ? '✅ Sim' : '❌ Não'
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

const formFields = [
  { name: 'codigo', label: 'Código', type: 'text' as const, required: true },
  { name: 'nome', label: 'Nome', type: 'text' as const, required: true },
  { name: 'ordem', label: 'Ordem', type: 'number' as const, required: true },
  { name: 'descricao', label: 'Descrição', type: 'textarea' as const },
  { name: 'cor', label: 'Cor do Cabeçalho', type: 'color' as const },
  { name: 'mostrarNoKanban', label: 'Mostrar no Kanban', type: 'switch' as const },
  { name: 'ativo', label: 'Ativo', type: 'switch' as const },
];

export default function EstagiosPage() {
  const [estagios, setEstagios] = useState<Estagio[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEstagio, setSelectedEstagio] = useState<Estagio | null>(null);

  useEffect(() => {
    carregarEstagios();
  }, []);

  async function carregarEstagios() {
    try {
      const response = await fetch('/api/estagios');
      const data = await response.json();
      setEstagios(data);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os estágios',
        variant: 'destructive',
      });
    }
  }

  async function handleSubmit(data: any) {
    try {
      const url = selectedEstagio ? `/api/estagios/${selectedEstagio.id}` : '/api/estagios';
      const method = selectedEstagio ? 'PUT' : 'POST';
      
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
        description: `Estágio ${selectedEstagio ? 'atualizado' : 'criado'} com sucesso`,
      });

      setModalOpen(false);
      setSelectedEstagio(null);
      carregarEstagios();
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao salvar',
        variant: 'destructive',
      });
    }
  }

  async function handleDelete(estagio: Estagio) {
    if (!confirm(`Tem certeza que deseja excluir o estágio ${estagio.nome}?`)) return;

    try {
      const response = await fetch(`/api/estagios/${estagio.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Erro ao excluir');

      toast({
        title: 'Sucesso',
        description: 'Estágio excluído com sucesso',
      });

      carregarEstagios();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o estágio',
        variant: 'destructive',
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Estágios de Produção</h1>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Estágio
        </Button>
      </div>

      <DataTable
        data={estagios}
        columns={columns}
        onEdit={setSelectedEstagio}
        onDelete={handleDelete}
      />

      <FormModal
        open={modalOpen || !!selectedEstagio}
        onClose={() => {
          setModalOpen(false);
          setSelectedEstagio(null);
        }}
        onSubmit={handleSubmit}
        title={selectedEstagio ? 'Editar Estágio' : 'Novo Estágio'}
        fields={formFields}
        initialData={selectedEstagio}
        schema={estagioSchema}
      />
    </div>
  );
}