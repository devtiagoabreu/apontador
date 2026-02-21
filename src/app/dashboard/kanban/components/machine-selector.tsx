'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface Maquina {
  id: string;
  nome: string;
  codigo: string;
  status: string;
}

interface MachineSelectorProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (maquinaId: string) => void;
  estagioId: string;
  estagioNome: string;
}

export function MachineSelector({
  open,
  onClose,
  onConfirm,
  estagioId,
  estagioNome,
}: MachineSelectorProps) {
  const [maquinas, setMaquinas] = useState<Maquina[]>([]);
  const [selectedMaquina, setSelectedMaquina] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && estagioId) {
      carregarMaquinas();
    }
  }, [open, estagioId]);

  async function carregarMaquinas() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/maquinas/disponiveis?estagioId=${estagioId}`);
      if (!response.ok) throw new Error('Erro ao carregar máquinas');
      const data = await response.json();
      setMaquinas(data);
      
      if (data.length === 0) {
        setError('Nenhuma máquina disponível para este estágio');
      }
    } catch (error) {
      setError('Erro ao carregar máquinas disponíveis');
    } finally {
      setLoading(false);
    }
  }

  function handleConfirm() {
    if (!selectedMaquina) {
      alert('Selecione uma máquina');
      return;
    }
    onConfirm(selectedMaquina);
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Selecionar Máquina - {estagioNome}</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-500 mb-4">{error}</p>
              <Button variant="outline" onClick={carregarMaquinas}>
                Tentar novamente
              </Button>
            </div>
          ) : maquinas.length > 0 ? (
            <RadioGroup value={selectedMaquina} onValueChange={setSelectedMaquina}>
              <div className="space-y-3">
                {maquinas.map((maquina) => (
                  <div
                    key={maquina.id}
                    className="flex items-center space-x-3 border rounded-lg p-4 hover:bg-gray-50"
                  >
                    <RadioGroupItem value={maquina.id} id={maquina.id} />
                    <Label htmlFor={maquina.id} className="flex-1 cursor-pointer">
                      <div className="font-medium">{maquina.nome}</div>
                      <div className="text-sm text-gray-500">Código: {maquina.codigo}</div>
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          ) : (
            <p className="text-center py-8 text-gray-500">
              Nenhuma máquina disponível
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedMaquina || loading}>
            Confirmar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}