'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { FormModal } from '@/components/ui/form-modal';
import { z } from 'zod';
import { toast } from '@/components/ui/use-toast';
import { Plus, QrCode, Key } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { QRCodeSVG } from 'qrcode.react';

const usuarioSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  matricula: z.string().min(1, 'Matrícula é obrigatória'),
  nivel: z.enum(['ADM', 'OPERADOR']).default('OPERADOR'),
  senha: z.string().optional(),
  ativo: z.boolean().default(true),
}).refine((data) => {
  // Se for admin, senha é obrigatória
  if (data.nivel === 'ADM' && !data.senha) {
    return false;
  }
  return true;
}, {
  message: 'Senha é obrigatória para administradores',
  path: ['senha'],
});

type Usuario = z.infer<typeof usuarioSchema> & { id: string };

const columns = [
  { key: 'matricula' as const, title: 'Matrícula' },
  { key: 'nome' as const, title: 'Nome' },
  { 
    key: 'nivel' as const, 
    title: 'Nível',
    format: (value: string) => value === 'ADM' ? 'Administrador' : 'Operador'
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
  { name: 'nome', label: 'Nome', type: 'text' as const, required: true },
  { name: 'matricula', label: 'Matrícula', type: 'text' as const, required: true },
  { 
    name: 'nivel', 
    label: 'Nível', 
    type: 'select' as const,
    options: [
      { value: 'OPERADOR', label: 'Operador' },
      { value: 'ADM', label: 'Administrador' }
    ]
  },
  { name: 'senha', label: 'Senha (apenas para admin)', type: 'password' as const },
  { name: 'ativo', label: 'Ativo', type: 'switch' as const },
];

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedUsuario, setSelectedUsuario] = useState<Usuario | null>(null);
  const [selectedForQr, setSelectedForQr] = useState<Usuario | null>(null);

  useEffect(() => {
    carregarUsuarios();
  }, []);

  async function carregarUsuarios() {
    try {
      const response = await fetch('/api/usuarios');
      const data = await response.json();
      setUsuarios(data);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os usuários',
        variant: 'destructive',
      });
    }
  }

  async function handleSubmit(data: any) {
    try {
      // Se for operador, remover senha
      if (data.nivel === 'OPERADOR') {
        delete data.senha;
      }

      // Se for admin mas não tem senha, avisar
      if (data.nivel === 'ADM' && !data.senha) {
        toast({
          title: 'Aviso',
          description: 'Administradores devem ter uma senha definida',
          variant: 'warning',
        });
        return;
      }

      const url = selectedUsuario ? `/api/usuarios/${selectedUsuario.id}` : '/api/usuarios';
      const method = selectedUsuario ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      // Tentar parsear o JSON da resposta
      let result;
      try {
        result = await response.json();
      } catch (e) {
        // Se não conseguir parsear o JSON, pegar o texto da resposta
        const text = await response.text();
        throw new Error(`Resposta inválida do servidor: ${text.substring(0, 100)}`);
      }

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao salvar');
      }

      toast({
        title: 'Sucesso',
        description: `Usuário ${selectedUsuario ? 'atualizado' : 'criado'} com sucesso`,
      });

      setModalOpen(false);
      setSelectedUsuario(null);
      carregarUsuarios();
      
    } catch (error) {
      console.error('Erro detalhado:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao salvar usuário',
        variant: 'destructive',
      });
    }
  }

  async function handleDelete(usuario: Usuario) {
    if (!confirm(`Tem certeza que deseja excluir o usuário ${usuario.nome}?`)) return;

    try {
      const response = await fetch(`/api/usuarios/${usuario.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Erro ao excluir');

      toast({
        title: 'Sucesso',
        description: 'Usuário excluído com sucesso',
      });

      carregarUsuarios();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o usuário',
        variant: 'destructive',
      });
    }
  }

  function gerarQRCode(usuario: Usuario) {
    setSelectedForQr(usuario);
    setQrModalOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Usuários</h1>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Usuário
        </Button>
      </div>

      <DataTable
        data={usuarios}
        columns={columns}
        onEdit={setSelectedUsuario}
        onDelete={handleDelete}
        extraActions={(usuario) => (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => gerarQRCode(usuario)}
            className="h-8 w-8"
            title="Gerar QR Code"
          >
            <QrCode className="h-4 w-4" />
          </Button>
        )}
      />

      {/* Modal de usuário */}
      <FormModal
        open={modalOpen || !!selectedUsuario}
        onClose={() => {
          setModalOpen(false);
          setSelectedUsuario(null);
        }}
        onSubmit={handleSubmit}
        title={selectedUsuario ? 'Editar Usuário' : 'Novo Usuário'}
        fields={formFields}
        initialData={selectedUsuario}
        schema={usuarioSchema}
      />

      {/* Modal de QR Code */}
      <Dialog open={qrModalOpen} onOpenChange={setQrModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>QR Code do Operador</DialogTitle>
          </DialogHeader>
          
          {selectedForQr && (
            <div className="flex flex-col items-center space-y-4">
              <div className="bg-white p-4 rounded-lg">
                <QRCodeSVG 
                  value={`${window.location.origin}/qr/operator/${selectedForQr.matricula}`} 
                  size={200} 
                />
              </div>
              
              <div className="text-center">
                <p className="font-medium">{selectedForQr.nome}</p>
                <p className="text-sm text-gray-500">Matrícula: {selectedForQr.matricula}</p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    const canvas = document.querySelector('canvas');
                    if (canvas) {
                      const link = document.createElement('a');
                      link.download = `qrcode-${selectedForQr.matricula}.png`;
                      link.href = canvas.toDataURL();
                      link.click();
                    }
                  }}
                >
                  Download
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.print()}
                >
                  Imprimir
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}