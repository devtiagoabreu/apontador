'use client';

import { useState, useEffect } from 'react';
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
  const [requestBody, setRequestBody] = useState('');
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<number | null>(null);
  const [estagios, setEstagios] = useState<any[]>([]);
  const [maquinas, setMaquinas] = useState<any[]>([]);
  const [operadores, setOperadores] = useState<any[]>([]);

  // IDs fixos que você forneceu
  const estagiosFixos = [
    { id: 'd2867968-e990-45ba-98b6-90cc160a3ad9', nome: 'PREPARAÇÃO BENEFICIAMENTO', codigo: '10' },
    { id: '698350b5-83d0-40dc-a099-4e52f45666d8', nome: 'TINGIMENTO', codigo: '18' },
    { id: 'c61c94c3-6362-4670-bf0f-f75fc150947b', nome: 'ALVEJAMENTO', codigo: '15' },
    { id: 'ac2d47d0-6c3a-4318-b999-afb57f025f67', nome: 'URDIMENTO', codigo: '05' },
    { id: '52d42555-b3af-47dd-9d26-92a05d582664', nome: 'TECELAGEM', codigo: '08' },
  ];

  // IDs que já temos do banco
  const maquinasFixas = [
    { id: 'd7bcee03-4558-4274-8a13-d15f5a9f1e00', nome: 'JIGGER 01', codigo: 'JGR001' },
    { id: '7bf3e488-9960-4fb7-8e5f-d9ca5e22a2fc', nome: 'JIGGER 02', codigo: 'JGR002' },
  ];

  const operadoresFixos = [
    { id: '5ee971b6-be6b-4b1e-9313-f0abf755ba94', nome: 'DOUGLAS', matricula: 'OPERA001' },
  ];

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    try {
      // Tenta carregar do banco, mas usa os fixos como fallback
      let estagiosData = [];
      let maquinasData = [];
      let operadoresData = [];

      try {
        const estagiosRes = await fetch('/api/estagios?ativos=true');
        if (estagiosRes.ok) {
          estagiosData = await estagiosRes.json();
        }
      } catch (e) {
        console.log('Erro ao carregar estágios, usando fixos');
      }

      try {
        const maquinasRes = await fetch('/api/maquinas');
        if (maquinasRes.ok) {
          maquinasData = await maquinasRes.json();
        }
      } catch (e) {
        console.log('Erro ao carregar máquinas, usando fixos');
      }

      try {
        const operadoresRes = await fetch('/api/usuarios?nivel=OPERADOR');
        if (operadoresRes.ok) {
          operadoresData = await operadoresRes.json();
        }
      } catch (e) {
        console.log('Erro ao carregar operadores, usando fixos');
      }

      // Usa dados da API se existirem, senão usa os fixos
      setEstagios(estagiosData.length > 0 ? estagiosData : estagiosFixos);
      setMaquinas(maquinasData.length > 0 ? maquinasData : maquinasFixas);
      setOperadores(operadoresData.length > 0 ? operadoresData : operadoresFixos);

      // Criar exemplo com dados reais
      const estagio = estagiosData[0] || estagiosFixos[0];
      const maquina = maquinasData[0] || maquinasFixas[0];
      const operador = operadoresData[0] || operadoresFixos[0];

      const exemplo = {
        tipo: "PRODUCAO",
        maquinaId: maquina.id,
        operadorInicioId: operador.id,
        dataInicio: new Date().toISOString(),
        dataFim: new Date().toISOString(),
        status: "EM_ANDAMENTO",
        opId: 8209,
        estagioId: estagio.id,
      };
      setRequestBody(JSON.stringify(exemplo, null, 2));
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      // Fallback para dados fixos
      setEstagios(estagiosFixos);
      setMaquinas(maquinasFixas);
      setOperadores(operadoresFixos);
      
      const exemplo = {
        tipo: "PRODUCAO",
        maquinaId: maquinasFixas[0].id,
        operadorInicioId: operadoresFixos[0].id,
        dataInicio: new Date().toISOString(),
        dataFim: new Date().toISOString(),
        status: "EM_ANDAMENTO",
        opId: 8209,
        estagioId: estagiosFixos[0].id,
      };
      setRequestBody(JSON.stringify(exemplo, null, 2));
    }
  }

  async function handleSubmit() {
    setLoading(true);
    setResponse(null);
    setStatus(null);

    try {
      // Validar JSON
      try {
        JSON.parse(requestBody);
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
        body: method !== 'GET' ? requestBody : undefined,
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

  const getExemploProducao = () => {
    const estagio = estagios[0] || estagiosFixos[0];
    const maquina = maquinas[0] || maquinasFixas[0];
    const operador = operadores[0] || operadoresFixos[0];
    
    return JSON.stringify({
      tipo: "PRODUCAO",
      maquinaId: maquina.id,
      operadorInicioId: operador.id,
      dataInicio: new Date().toISOString(),
      dataFim: new Date().toISOString(),
      status: "EM_ANDAMENTO",
      opId: 8209,
      estagioId: estagio.id,
    }, null, 2);
  };

  const getExemploParada = () => {
    const maquina = maquinas[0] || maquinasFixas[0];
    const operador = operadores[0] || operadoresFixos[0];
    
    return JSON.stringify({
      tipo: "PARADA",
      maquinaId: maquina.id,
      operadorInicioId: operador.id,
      dataInicio: new Date().toISOString(),
      dataFim: new Date().toISOString(),
      status: "EM_ANDAMENTO",
      motivoParadaId: "id-do-motivo-aqui", // Você precisa adicionar motivos de parada
    }, null, 2);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Teste de API</h1>

      <div className="grid grid-cols-2 gap-6">
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
                  <SelectValue placeholder="Selecione o método" />
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
                  onClick={() => setRequestBody(getExemploProducao())}
                >
                  Produção
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRequestBody(getExemploParada())}
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
                placeholder="Cole seu JSON aqui..."
              />
            </div>

            <Button onClick={handleSubmit} disabled={loading} className="w-full">
              {loading ? 'Enviando...' : 'Enviar Requisição'}
            </Button>
          </CardContent>
        </Card>

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

      {/* Dados do sistema */}
      <Card>
        <CardHeader>
          <CardTitle>Dados do Sistema (UUIDs válidos)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <h3 className="font-medium mb-2">Estágios</h3>
              <ul className="space-y-1 text-sm">
                {estagios.map((e: any) => (
                  <li key={e.id} className="font-mono text-xs border-b pb-1">
                    <span className="font-bold">{e.nome}</span><br />
                    {e.id}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-2">Máquinas</h3>
              <ul className="space-y-1 text-sm">
                {maquinas.map((m: any) => (
                  <li key={m.id} className="font-mono text-xs border-b pb-1">
                    <span className="font-bold">{m.nome} ({m.codigo})</span><br />
                    {m.id}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-2">Operadores</h3>
              <ul className="space-y-1 text-sm">
                {operadores.map((o: any) => (
                  <li key={o.id} className="font-mono text-xs border-b pb-1">
                    <span className="font-bold">{o.nome} ({o.matricula})</span><br />
                    {o.id}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}