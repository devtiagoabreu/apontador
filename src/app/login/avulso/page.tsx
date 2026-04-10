// src/app/login/avulso/page.tsx
'use client';

import { useState, useEffect, Suspense } from 'react'; // Suspense adicionado
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { QrCode, User, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Label } from '@/components/ui/label';
import Link from 'next/link';

function LoginAvulsoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const matriculaUrl = searchParams.get('matricula');
  const isQr = searchParams.get('qr') === 'true';

  const [matricula, setMatricula] = useState(matriculaUrl || '');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isQr && matriculaUrl && !isLoading) {
      handleLogin(matriculaUrl);
    }
  }, [isQr, matriculaUrl]);

  const handleLogin = async (matriculaInput: string) => {
    if (!matriculaInput) return;
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        matricula: matriculaInput,
        loginMode: 'avulso',
        redirect: false,
      });

      if (result?.error) {
        toast({ title: 'Erro', description: 'Operador inválido', variant: 'destructive' });
      } else {
        router.push('/apontamento/avulso');
        router.refresh();
      }
    } finally { setIsLoading(false) }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-blue-50 p-4">
      <Card className="w-full max-w-md shadow-xl border-t-4 border-blue-600">
        <CardHeader className="text-center">
          <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <QrCode className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl text-blue-900 font-bold italic">Produção Avulsa</CardTitle>
          <CardDescription>Acesso rápido via Crachá</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Matrícula</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <Input 
                className="pl-10 h-12 text-lg uppercase" 
                value={matricula} 
                onChange={(e) => setMatricula(e.target.value.toUpperCase())} 
              />
            </div>
          </div>
          <Button className="w-full h-12 bg-blue-600 hover:bg-blue-700 font-bold text-lg" onClick={() => handleLogin(matricula)} disabled={isLoading}>
            {isLoading ? <Loader2 className="animate-spin" /> : 'Entrar no Sistema'}
          </Button>
          <Link href="/login" className="block text-center text-sm text-blue-600 font-medium">
             <ArrowLeft size={14} className="inline mr-1" /> Voltar ao login normal
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

// Exportação principal com Suspense
export default function LoginAvulsoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Carregando...</div>}>
      <LoginAvulsoContent />
    </Suspense>
  )
}