// src/app/login/avulso/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { QrCode, User, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Label } from '@/components/ui/label';
import Link from 'next/link';

export default function LoginAvulsoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Captura dados enviados pelo Resolvedor de Operador [Histórico]
  const matriculaUrl = searchParams.get('matricula');
  const isQr = searchParams.get('qr') === 'true';

  const [matricula, setMatricula] = useState(matriculaUrl || '');
  const [isLoading, setIsLoading] = useState(false);

  /**
   * FUNCIONALIDADE NOVA: Auto-Login via QR Code
   * Detecta a flag 'qr=true' e entra no sistema instantaneamente [Histórico].
   */
  useEffect(() => {
    if (isQr && matriculaUrl && !isLoading) {
      handleLogin(matriculaUrl);
    }
  }, [isQr, matriculaUrl]);

  const handleLogin = async (matriculaInput: string) => {
    if (!matriculaInput) return;
    setIsLoading(true);

    try {
      // Importante: Passa loginMode 'avulso' para carimbar o contexto na sessão [Histórico]
      const result = await signIn('credentials', {
        matricula: matriculaInput,
        loginMode: 'avulso', 
        redirect: false,
      });

      if (result?.error) {
        toast({
          title: 'Erro no Login',
          description: 'Operador inválido ou inativo para produção avulsa.',
          variant: 'destructive',
        });
      } else {
        router.push('/apontamento/avulso');
        router.refresh();
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha crítica ao processar login automático.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-blue-50 p-4">
      <Link href="/login" className="mb-4 text-blue-600 flex items-center gap-2 text-sm font-medium self-start max-w-md mx-auto">
        <ArrowLeft size={16} /> Voltar ao login normal
      </Link>

      <Card className="w-full max-w-md border-t-4 border-blue-600 shadow-xl">
        <CardHeader className="text-center">
          <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <QrCode className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl text-blue-900 font-bold italic">Produção Avulsa</CardTitle>
          <CardDescription>Acesso rápido via Crachá (Urdimento)</CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Matrícula do Operador</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <Input
                  placeholder="OPERA..."
                  className="pl-10 h-12 text-lg uppercase"
                  value={matricula}
                  onChange={(e) => setMatricula(e.target.value.toUpperCase())}
                  disabled={isLoading}
                />
              </div>
            </div>

            <Button 
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-lg font-bold" 
              onClick={() => handleLogin(matricula)}
              disabled={isLoading || !matricula}
            >
              {isLoading ? <Loader2 className="animate-spin mr-2" /> : 'Entrar no Sistema'}
            </Button>
            
            <p className="text-[10px] text-center text-gray-400 uppercase tracking-tighter">
              Sistema Apontador Pro Moda Têxtil
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}