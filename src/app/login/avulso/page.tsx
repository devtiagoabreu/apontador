// src/app/login/avulso/page.tsx --> https://apontador.vercel.app/login/avulso
'use client';

import { useState, useEffect, useRef } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { User, QrCode, ArrowLeft } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import Link from 'next/link';

export default function LoginAvulsoPage() {
  const router = useRouter();
  const [showQRReader, setShowQRReader] = useState(false);
  const [matricula, setMatricula] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  const handleLogin = async (userMatricula: string) => {
    setIsLoading(true);
    try {
      const result = await signIn('credentials', {
        matricula: userMatricula,
        loginMode: 'avulso', // Define o contexto da sessão
        redirect: false,
        callbackUrl: '/apontamento/avulso'
      });

      if (result?.error) {
        toast({ title: 'Erro', description: 'Matrícula inválida.', variant: 'destructive' });
      } else {
        router.push('/apontamento/avulso');
        router.refresh();
      }
    } catch (error) {
      toast({ title: 'Erro', description: 'Erro inesperado', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (showQRReader) {
      const scanner = new Html5QrcodeScanner('qr-reader', { fps: 10, qrbox: 250 }, false);
      scanner.render(async (text) => {
        const mat = text.split('/').pop();
        if (mat) { scanner.clear(); await handleLogin(mat); }
      }, (err) => console.debug(err));
      scannerRef.current = scanner;
      return () => { if (scannerRef.current) scannerRef.current.clear().catch(console.error); };
    }
  }, [showQRReader]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md border-t-4 border-t-primary">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl italic font-bold text-primary">Produção Avulsa</CardTitle>
          <CardDescription>Acesso para portadas e carrolões</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showQRReader ? (
            <>
              <div className="space-y-2">
                <Label>Matrícula</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <Input className="pl-10" value={matricula} onChange={(e) => setMatricula(e.target.value)} disabled={isLoading} />
                </div>
              </div>
              <Button onClick={() => handleLogin(matricula)} className="w-full h-12" disabled={isLoading || !matricula}>Entrar</Button>
              <Button variant="outline" className="w-full h-12" onClick={() => setShowQRReader(true)}><QrCode className="mr-2" /> Ler Crachá</Button>
              <Link href="/login" className="text-sm block text-center text-muted-foreground"><ArrowLeft className="inline h-3 w-3" /> Voltar</Link>
            </>
          ) : (
            <div id="qr-reader" className="overflow-hidden rounded-lg border-2 border-primary/20" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}