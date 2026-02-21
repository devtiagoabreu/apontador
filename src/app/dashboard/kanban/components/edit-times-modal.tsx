'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';

interface EditTimesModalProps {
  open: boolean;
  onClose: () => void;
  op: any;
}

export function EditTimesModal({ open, onClose, op }: EditTimesModalProps) {
  const [loading, setLoading] = useState(false);
  const [apontamentos, setApontamentos] = useState<any[]>([]);
  const [editData, setEditData] = useState<Record<string, any>>({});

  useEffect(() => {
    if (open && op) {
      carregarApontamentos();
    }
  }, [open, op]);

  async function carregarApontamentos() {
    try {
      const response = await fetch(`/api/apontamentos?opId=${op.op}`);
      const data = await response.json();
      setApontamentos(data);
      
      // Inicializar dados de edição
      const initialData: Record<string, any> = {};
      data.forEach((ap: any, index: number) => {
        initialData[`inicio_${index}`] = ap.dataInicio ? new Date(ap.dataInicio).toISOString().slice(0, 16) : '';
        initialData[`fim_${index}`] = ap.dataFim ? new Date(ap.dataFim).toISOString().slice(0, 16) : '';
      });
      setEditData(initialData);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os apontamentos',
        variant: 'destructive',
      });
    }
  }

  async function handleSave() {
    setLoading(true);
    try {
      // Validar se as datas são coerentes
      for (let i = 0; i < apontamentos.length; i++) {
        const inicio = new Date(editData[`inicio_${i}`]);
        const fim = new Date(editData[`fim_${i}`]);
        
        if (fim < inicio) {
          toast({
            title: 'Erro',
            description: `Apontamento ${i + 1}: data fim não pode ser menor que data início`,
            variant: 'destructive',
          });
          return;
        }

        if (i > 0) {
          const fimAnterior = new Date(editData[`fim_${i-1}`]);
          if (inicio < fimAnterior) {
            toast({
              title: 'Erro',
              description: `Apontamento ${i + 1}: data início não pode ser anterior ao fim do apontamento anterior`,
              variant: 'destructive',
            });
            return;
          }
        }
      }

      // Enviar alterações
      const response = await fetch(`/api/ops/${op.op}/editar-tempos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apontamentos: editData }),
      });

      if (!response.ok) throw new Error('Erro ao salvar');

      toast({
        title: 'Sucesso',
        description: 'Tempos atualizados com sucesso',
      });

      onClose();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao salvar alterações',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Tempos - OP {op?.op}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {apontamentos.map((ap, index) => (
            <div key={ap.id} className="border rounded-lg p-4 space-y-3">
              <h3 className="font-medium">
                Apontamento {index + 1} - {ap.estagio}
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data Início</Label>
                  <Input
                    type="datetime-local"
                    value={editData[`inicio_${index}`] || ''}
                    onChange={(e) => setEditData(prev => ({
                      ...prev,
                      [`inicio_${index}`]: e.target.value
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data Fim</Label>
                  <Input
                    type="datetime-local"
                    value={editData[`fim_${index}`] || ''}
                    onChange={(e) => setEditData(prev => ({
                      ...prev,
                      [`fim_${index}`]: e.target.value
                    }))}
                  />
                </div>
              </div>

              {ap.maquina && (
                <p className="text-sm text-gray-500">
                  Máquina: {ap.maquina}
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}