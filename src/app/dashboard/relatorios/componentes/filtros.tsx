'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarIcon, Search } from 'lucide-react';

interface FiltrosDataProps {
  periodo: { inicio: Date; fim: Date };
  setPeriodo: (periodo: { inicio: Date; fim: Date }) => void;
  onBuscar: () => void;
}

export function FiltrosData({ periodo, setPeriodo, onBuscar }: FiltrosDataProps) {
  const [inicioStr, setInicioStr] = useState(
    periodo.inicio.toISOString().split('T')[0]
  );
  const [fimStr, setFimStr] = useState(
    periodo.fim.toISOString().split('T')[0]
  );

  const handleAplicar = () => {
    setPeriodo({
      inicio: new Date(inicioStr + 'T00:00:00'),
      fim: new Date(fimStr + 'T23:59:59'),
    });
    onBuscar();
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="inicio">Data Início</Label>
            <Input
              id="inicio"
              type="date"
              value={inicioStr}
              onChange={(e) => setInicioStr(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fim">Data Fim</Label>
            <Input
              id="fim"
              type="date"
              value={fimStr}
              onChange={(e) => setFimStr(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={handleAplicar} className="w-full">
              <Search className="mr-2 h-4 w-4" />
              Aplicar Filtros
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}