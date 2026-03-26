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
import { User, QrCode } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

export default function LoginAvulsoPage() {
  const router = useRouter();
  const [showQRReader, setShowQRReader] = useState(false);
  const [matricula, setMatricula] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  // Lógica de redirecionamento específica para o módulo avulso
  const targetUrl = '/apontamento/avulso/iniciar';

  useEffect(() => {
    if (showQRReader) {
      const scanner = new Html5QrcodeScanner(
        'qr-reader',
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );

      scanner.render(
        async (decodedText) => {
          scanner.clear();
          setShowQRReader(false);
          const scannedMatricula = decodedText.split('/').pop();
          if (scannedMatricula) await handleLogin(scannedMatricula);
        },
        (error) => console.debug(error)
      );

      scannerRef.current = scanner;
      return () => { scanner.clear().catch(console.error); };
    }
  }, [showQRReader]);

  const handleLogin = async (userMatricula: string) => {
    setIsLoading(true);
    try {
      // Realiza o login via NextAuth conforme padrão do sistema [10, 11]
      const result = await signIn('credentials', {
        matricula: userMatricula,
        redirect: false,
        callbackUrl: targetUrl
      });

      if (result?.error) {
        toast({
          title: 'Erro no acesso',
          description: 'Matrícula inválida ou operador inativo.',
          variant: 'destructive',
        });
      } else {
        // Redireciona diretamente para o início da produção avulsa
        router.push(targetUrl);
        router.refresh();
      }
    } catch (error) {
      toast({ title: 'Erro', description: 'Ocorreu um erro inesperado', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md border-t-4 border-t-primary">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl italic font-bold text-primary">Produção Avulsa</CardTitle>
          <CardDescription>Acesse para registrar portadas e carrolões</CardDescription>
        </CardHeader>
        <CardContent>
          {!showQRReader ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="matricula">Matrícula do Operador</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <Input
                    id="matricula"
                    placeholder="Digite sua matrícula"
                    className="pl-10"
                    value={matricula}
                    onChange={(e) => setMatricula(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>
              
              <Button 
                onClick={() => handleLogin(matricula)} 
                className="w-full h-12" 
                disabled={isLoading || !matricula}
              >
                {isLoading ? 'Entrando...' : 'Acessar Módulo'}
              </Button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div>
                <div className="relative flex justify-center text-sm text-gray-500"><span className="px-2 bg-white">ou use o QR Code</span></div>
              </div>

              <Button variant="outline" className="w-full h-12" onClick={() => setShowQRReader(true)}>
                <QrCode className="mr-2 h-5 w-5" /> Escanear Crachá
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div id="qr-reader" className="w-full overflow-hidden rounded-lg" />
              <Button variant="ghost" className="w-full" onClick={() => setShowQRReader(false)}>Voltar</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}