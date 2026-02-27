'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { MobileCard } from '@/components/mobile/card';
import { ArrowLeft, Play, AlertCircle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Suspense } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useSession } from 'next-auth/react';

interface Estagio {
  id: string;
  codigo: string;
  nome: string;
}

function IniciarContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const machineId = searchParams.get('machine');
  const opNumero = searchParams.get('op');
  
  const { data: session, status } = useSession();
  
  const [loading, setLoading] = useState(false);
  const [estagios, setEstagios] = useState<Estagio[]>([]);
  const [estagioId, setEstagioId] = useState<string>('');
  const [isReprocesso, setIsReprocesso] = useState(false);
  const [maquina, setMaquina] = useState<any>(null);
  const [op, setOp] = useState<any>(null);
  const [carregandoDados, setCarregandoDados] = useState(true);
  const [erros, setErros] = useState<string[]>([]);

  useEffect(() => {
    console.log('🔍 Parâmetros:', { machineId, opNumero });
    console.log('🔐 Sessão:', { status, session });
    
    if (machineId && opNumero) {
      carregarDados();
    } else {
      console.log('❌ Parâmetros ausentes');
      setCarregandoDados(false);
      setErros(prev => [...prev, 'Parâmetros ausentes na URL']);
    }
  }, [machineId, opNumero, status, session]);

  async function carregarDados() {
    console.log('🔄 Carregando dados...');
    setCarregandoDados(true);
    setErros([]);
    
    try {
      // 1. Buscar máquina
      console.log('🔍 Buscando máquina:', machineId);
      const maquinaRes = await fetch(`/api/maquinas/${machineId}`);
      console.log('📊 Status máquina:', maquinaRes.status);
      
      if (!maquinaRes.ok) {
        throw new Error(`Erro ao carregar máquina: ${maquinaRes.status}`);
      }
      
      const maquinaData = await maquinaRes.json();
      console.log('✅ Máquina carregada:', maquinaData);
      setMaquina(maquinaData);

      // 2. Buscar OP
      console.log('🔍 Buscando OP:', opNumero);
      const opRes = await fetch(`/api/ops/${opNumero}`);
      console.log('📊 Status OP:', opRes.status);
      
      if (!opRes.ok) {
        throw new Error(`Erro ao carregar OP: ${opRes.status}`);
      }
      
      const opData = await opRes.json();
      console.log('✅ OP carregada:', opData);
      setOp(opData);

      // 3. Buscar estágios
      console.log('🔍 Buscando estágios...');
      const estagiosRes = await fetch('/api/estagios?ativos=true');
      console.log('📊 Status estágios:', estagiosRes.status);
      
      if (!estagiosRes.ok) {
        throw new Error(`Erro ao carregar estágios: ${estagiosRes.status}`);
      }
      
      const estagiosData = await estagiosRes.json();
      console.log('✅ Estágios carregados:', estagiosData.length);
      setEstagios(estagiosData);
      
      // Sugerir próximo estágio baseado na ordem
      if (opData.codEstagioAtual && opData.codEstagioAtual !== '00') {
        const proximoCodigo = (parseInt(opData.codEstagioAtual) + 1).toString().padStart(2, '0');
        const proximoEstagio = estagiosData.find((e: Estagio) => e.codigo === proximoCodigo);
        if (proximoEstagio) {
          console.log('🎯 Estágio sugerido:', proximoEstagio.nome);
          setEstagioId(proximoEstagio.id);
        }
      }
      
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
      setErros(prev => [...prev, error instanceof Error ? error.message : 'Erro desconhecido']);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Não foi possível carregar os dados',
        variant: 'destructive',
      });
    } finally {
      setCarregandoDados(false);
    }
  }

  async function handleIniciar() {
    console.log('🎬 handleIniciar chamado');
    console.log('📦 Dados:', { machineId, opNumero, estagioId, isReprocesso, session });
    
    if (!estagioId) {
      console.log('❌ Estágio não selecionado');
      toast({
        title: 'Erro',
        description: 'Selecione o estágio de produção',
        variant: 'destructive',
      });
      return;
    }

    if (!session?.user?.id) {
      console.log('❌ Usuário não autenticado');
      toast({
        title: 'Erro',
        description: 'Usuário não autenticado',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const dados = {
        opId: parseInt(opNumero!),
        maquinaId: machineId,
        operadorInicioId: session.user.id,
        estagioId,
        isReprocesso,
        observacoes: '',
      };
      
      console.log('📦 Enviando para API:', dados);
      
      const response = await fetch('/api/producoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados),
      });

      console.log('📊 Status resposta:', response.status);
      
      const data = await response.json();
      console.log('📦 Resposta:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao iniciar produção');
      }

      toast({
        title: 'Sucesso',
        description: isReprocesso 
          ? 'Reprocesso iniciado com sucesso' 
          : 'Produção iniciada com sucesso',
      });

      router.push(`/apontamento/machine/${machineId}`);
      
    } catch (error) {
      console.error('❌ Erro:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao iniciar',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  if (carregandoDados) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-3">
          <Link href="/apontamento">
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <ArrowLeft className="h-6 w-6" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold">Carregando...</h1>
            <p className="text-sm text-gray-500">Buscando dados da máquina e OP</p>
          </div>
        </div>
        
        {/* Mostrar logs de debug */}
        <div className="mt-4 p-4 bg-gray-100 rounded-lg text-xs font-mono">
          <p>🔍 machineId: {machineId}</p>
          <p>🔍 opNumero: {opNumero}</p>
          <p>🔐 Sessão: {status}</p>
          {erros.map((err, i) => (
            <p key={i} className="text-red-600">❌ {err}</p>
          ))}
        </div>
      </div>
    );
  }

  if (!maquina || !op) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-3">
          <Link href="/apontamento">
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <ArrowLeft className="h-6 w-6" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold">Dados não encontrados</h1>
            <p className="text-sm text-gray-500">Verifique se a máquina e OP existem</p>
          </div>
        </div>
        
        <div className="mt-4 p-4 bg-red-50 rounded-lg">
          <p className="font-medium text-red-700">Erros:</p>
          {erros.map((err, i) => (
            <p key={i} className="text-sm text-red-600 mt-1">• {err}</p>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3">
        <Link href={`/apontamento/machine/${machineId}`}>
          <Button variant="ghost" size="icon" className="h-10 w-10">
            <ArrowLeft className="h-6 w-6" />
          </Button>
        </Link>
        <h1 className="text-xl font-semibold">Iniciar Produção</h1>
      </div>

      {/* Card de confirmação */}
      <MobileCard>
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-yellow-600 bg-yellow-50 p-3 rounded-lg">
            <AlertCircle className="h-5 w-5" />
            <p className="text-sm">Confirme os dados antes de iniciar</p>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Máquina</p>
              <p className="font-medium">{maquina.nome}</p>
              <p className="text-xs text-gray-400">Código: {maquina.codigo}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Ordem de Produção</p>
              <p className="font-medium">OP {op.op}</p>
              <p className="text-sm text-gray-600 mt-1">{op.produto}</p>
              <p className="text-xs text-gray-400 mt-1">
                Programado: {Number(op.qtdeProgramado).toLocaleString('pt-BR')} {op.um}
              </p>
            </div>

            {/* Seleção de Estágio */}
            <div className="space-y-2 pt-2">
              <Label htmlFor="estagio">Estágio de Produção *</Label>
              <Select value={estagioId} onValueChange={setEstagioId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o estágio" />
                </SelectTrigger>
                <SelectContent>
                  {estagios.map((estagio) => (
                    <SelectItem key={estagio.id} value={estagio.id}>
                      {estagio.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Checkbox de Reprocesso */}
            <div className="flex items-start space-x-2 pt-2">
              <Checkbox
                id="reprocesso"
                checked={isReprocesso}
                onCheckedChange={(checked) => setIsReprocesso(checked as boolean)}
                className="mt-1"
              />
              <div className="space-y-1">
                <Label htmlFor="reprocesso" className="text-sm font-medium">
                  🔄 É reprocesso?
                </Label>
                <p className="text-xs text-gray-500">
                  Marque se este produto já passou por este estágio anteriormente
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Link href={`/apontamento/machine/${machineId}`} className="flex-1">
              <Button variant="outline" className="w-full" disabled={loading}>
                Cancelar
              </Button>
            </Link>
            <Button 
              className="flex-1" 
              onClick={handleIniciar}
              disabled={loading}
            >
              <Play className="mr-2 h-4 w-4" />
              {loading ? 'Iniciando...' : 'Confirmar Início'}
            </Button>
          </div>
        </div>
      </MobileCard>
    </div>
  );
}

export default function IniciarPage() {
  return (
    <Suspense fallback={
      <div className="p-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-10 w-10">
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-xl font-semibold">Carregando...</h1>
        </div>
      </div>
    }>
      <IniciarContent />
    </Suspense>
  );
}