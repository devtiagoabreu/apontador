'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';

// EXATAMENTE os dados que funcionaram na API
const DADOS_FUNCIONAIS = {
  tipo: "PRODUCAO",
  maquinaId: "d7bcee03-4558-4274-8a13-d15f5a9f1e00",
  operadorInicioId: "5ee971b6-be6b-4b1e-9313-f0abf755ba94",
  dataInicio: new Date().toISOString(),
  dataFim: new Date().toISOString(),
  status: "EM_ANDAMENTO",
  opId: 8209,
  estagioId: "ac2d47d0-6c3a-4318-b999-afb57f025f67",
  isReprocesso: false
};

export default function ApontamentosSimplesPage() {
  const [loading, setLoading] = useState(false);
  const [resposta, setResposta] = useState<any>(null);

  async function testarAPI() {
    setLoading(true);
    setResposta(null);
    
    try {
      console.log('📦 Enviando:', DADOS_FUNCIONAIS);
      
      const response = await fetch('/api/apontamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(DADOS_FUNCIONAIS),
      });

      const data = await response.json();
      console.log('📦 Resposta:', { status: response.status, data });
      
      setResposta({ status: response.status, data });

      if (response.ok) {
        toast({ title: 'Sucesso', description: 'Apontamento criado!' });
      } else {
        toast({ title: 'Erro', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      console.error('❌ Erro:', error);
      setResposta({ error: String(error) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold">Teste Direto da API</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Dados que funcionam na API</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">
            {JSON.stringify(DADOS_FUNCIONAIS, null, 2)}
          </pre>
          
          <Button 
            onClick={testarAPI} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Enviando...' : 'Testar API'}
          </Button>
        </CardContent>
      </Card>

      {resposta && (
        <Card>
          <CardHeader>
            <CardTitle>
              Resposta 
              {resposta.status && (
                <span className={`ml-2 px-2 py-1 text-sm rounded ${
                  resposta.status >= 200 && resposta.status < 300 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  Status: {resposta.status}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">
              {JSON.stringify(resposta, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}