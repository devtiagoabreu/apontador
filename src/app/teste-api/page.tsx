'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function TesteApiPage() {
  const [endpoint, setEndpoint] = useState('/api/apontamentos');
  const [method, setMethod] = useState('POST');
  const [requestBody, setRequestBody] = useState(`{
  "tipo": "PRODUCAO",
  "maquinaId": "7bf3e488-9960-4fb7-8e5f-d9ca5e22a2fc",
  "operadorInicioId": "5ee971b6-be6b-4b1e-9313-f0abf755ba94",
  "dataInicio": "${new Date().toISOString()}",
  "dataFim": "${new Date().toISOString()}",
  "status": "EM_ANDAMENTO",
  "opId": 8209,
  "estagioId": "id-do-estagio-aqui"
}`);
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<number | null>(null);

  const idsDisponiveis = {
    maquinas: [
      { id: '7bf3e488-9960-4fb7-8e5f-d9ca5e22a2fc', nome: 'JIGGER 02' },
      { id: 'd7bcee03-4558-4274-8a13-d15f5a9f1e00', nome: 'JIGGER 01' },
    ],
    operadores: [
      { id: '5ee971b6-be6b-4b1e-9313-f0abf755ba94', nome: 'DOUGLAS' },
    ],
    ops: [8209, 8185],
  };

  const exemplos = {
    producao: `{
  "tipo": "PRODUCAO",
  "maquinaId": "7bf3e488-9960-4fb7-8e5f-d9ca5e22a2fc",
  "operadorInicioId": "5ee971b6-be6b-4b1e-9313-f0abf755ba94",
  "dataInicio": "${new Date().toISOString()}",
  "dataFim": "${new Date().toISOString()}",
  "status": "EM_ANDAMENTO",
  "opId": 8209,
  "estagioId": "id-do-estagio-aqui"
}`,
    parada: `{
  "tipo": "PARADA",
  "maquinaId": "7bf3e488-9960-4fb7-8e5f-d9ca5e22a2fc",
  "operadorInicioId": "5ee971b6-be6b-4b1e-9313-f0abf755ba94",
  "dataInicio": "${new Date().toISOString()}",
  "dataFim": "${new Date().toISOString()}",
  "status": "EM_ANDAMENTO",
  "motivoParadaId": "id-do-motivo-aqui"
}`,
  };

  async function handleSubmit() {
    setLoading(true);
    setResponse(null);
    setStatus(null);

    try {
      let body = requestBody;
      try {
        // Tentar parsear para validar JSON
        JSON.parse(body);
      } catch (e) {
        setResponse({ error: 'JSON inválido', details: String(e) });
        setLoading(false);
        return;
      }

      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: method !== 'GET' ? body : undefined,
      });

      setStatus(res.status);

      const text = await res.text();
      try {
        const json = JSON.parse(text);
        setResponse(json);
      } catch {
        setResponse({ text });
      }
    } catch (error) {
      setResponse({ error: String(error) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Teste de API</h1>

      <div className="grid grid-cols-2 gap-6">
        {/* Painel de controle */}
        <Card>
          <CardHeader>
            <CardTitle>Requisição</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="endpoint">Endpoint</Label>
              <Input
                id="endpoint"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder="/api/apontamentos"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="method">Método</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Exemplos</Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRequestBody(exemplos.producao)}
                >
                  Produção
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRequestBody(exemplos.parada)}
                >
                  Parada
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">Body (JSON)</Label>
              <Textarea
                id="body"
                value={requestBody}
                onChange={(e) => setRequestBody(e.target.value)}
                rows={15}
                className="font-mono text-sm"
              />
            </div>

            <Button onClick={handleSubmit} disabled={loading} className="w-full">
              {loading ? 'Enviando...' : 'Enviar Requisição'}
            </Button>
          </CardContent>
        </Card>

        {/* Painel de resposta */}
        <Card>
          <CardHeader>
            <CardTitle>
              Resposta
              {status && (
                <span
                  className={`ml-2 px-2 py-1 text-sm rounded ${
                    status >= 200 && status < 300
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  Status: {status}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-[600px] text-sm font-mono">
              {response ? JSON.stringify(response, null, 2) : 'Nenhuma resposta ainda'}
            </pre>
          </CardContent>
        </Card>
      </div>

      {/* Informações úteis */}
      <Card>
        <CardHeader>
          <CardTitle>IDs Disponíveis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <h3 className="font-medium mb-2">Máquinas</h3>
              <ul className="space-y-1 text-sm">
                {idsDisponiveis.maquinas.map(m => (
                  <li key={m.id}>
                    <span className="font-mono text-xs">{m.id}</span> - {m.nome}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-2">Operadores</h3>
              <ul className="space-y-1 text-sm">
                {idsDisponiveis.operadores.map(o => (
                  <li key={o.id}>
                    <span className="font-mono text-xs">{o.id}</span> - {o.nome}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-2">OPs</h3>
              <ul className="space-y-1 text-sm">
                {idsDisponiveis.ops.map(op => (
                  <li key={op}>OP {op}</li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}