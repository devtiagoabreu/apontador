'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

alert('🚨 ALERTA: O código está executando!');

export default function KanbanPage() {
  alert('🚨 ALERTA: O componente renderizou!');
  
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    alert('🚨 ALERTA: useEffect executou!');
    testarAPI();
  }, []);

  async function testarAPI() {
    alert('1️⃣ Iniciando teste...');
    
    try {
      alert('2️⃣ Tentando buscar estágios...');
      const estagiosRes = await fetch('/api/estagios?kanban=true&ativos=true');
      alert(`3️⃣ Status da resposta: ${estagiosRes.status}`);
      
      if (!estagiosRes.ok) {
        throw new Error(`Erro ${estagiosRes.status}`);
      }
      
      const estagiosData = await estagiosRes.json();
      alert(`4️⃣ Estágios carregados: ${estagiosData.length} estágios`);
      
      alert('5️⃣ Teste concluído com sucesso!');
    } catch (error) {
      alert(`❌ Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      setErro(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setCarregando(false);
    }
  }

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Testando...</span>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="text-red-500 text-lg font-semibold">Erro no teste</div>
        <div className="text-gray-600 max-w-md text-center">{erro}</div>
        <Button onClick={() => window.location.reload()} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-green-600 text-lg">Teste concluído! Verifique o console.</div>
    </div>
  );
}