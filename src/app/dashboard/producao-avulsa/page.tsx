// src/app/dashboard/producao-avulsa/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { formatDate, formatNumber } from '@/lib/utils';
import { Package, Factory, User } from 'lucide-react';

const columns = [
  { 
    key: 'status' as const, 
    title: 'Status',
    format: (value: string) => (
      <Badge variant={value === 'CONCLUIDO' ? 'success' : 'warning'}>
        {value}
      </Badge>
    )
  },
  { key: 'produto_codigo' as const, title: 'Cód. Produto' },
  { key: 'maquina_nome' as const, title: 'Máquina' },
  { key: 'operador_inicio_nome' as const, title: 'Iniciado por' },
  { 
    key: 'data_inicio' as const, 
    title: 'Início',
    format: (value: string) => formatDate(value)
  },
  { 
    key: 'metragem' as const, 
    title: 'Metragem',
    format: (value: string) => value ? `${formatNumber(Number(value))} m` : '-'
  }
];

export default function ProducaoAvulsaPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/producoes-avulsas')
      .then(res => res.json())
      .then(json => {
        setData(json.data || []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold italic text-primary">Produção Avulsa</h1>
        <p className="text-sm text-muted-foreground">Gestão de Portadas e Carrolões</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Cards de resumo rápido baseados no estilo do seu sistema */}
        <div className="bg-white p-4 rounded-xl border shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-100 rounded-lg text-blue-600"><Package /></div>
          <div>
            <p className="text-sm text-gray-500">Total de Registros</p>
            <p className="text-2xl font-bold">{data.length}</p>
          </div>
        </div>
      </div>

      <DataTable 
        data={data} 
        columns={columns} 
        onRowClick={(row) => console.log('Detalhes:', row)}
      />
    </div>
  );
}