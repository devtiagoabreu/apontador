// src/app/login/avulso/page.tsx --> https://apontador.vercel.app/login/avulso
'use client';

import { useState, useEffect, useRef } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Html5QrcodeScanner } from 'html5-qrcode'; // Biblioteca utilizada para leitura móvel [3, 4]
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

  // Redirecionamento corrigido para o novo Dashboard Avulso conforme solicitado
  const targetUrl = '/apontamento/avulso'; 

  useEffect(() => {
    if (showQRReader) {
      // Inicialização do scanner seguindo o padrão de configuração do LeitorPage [4, 5]
      const scanner = new Html5QrcodeScanner(
        'qr-reader',
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );

      scanner.render(
        async (decodedText) => {
          // Extrai a matrícula da URL do QR Code (ex: .../operator/1234) [6, 7]
          const scannedMatricula = decodedText.split('/').pop();
          if (scannedMatricula) {
            scanner.clear();
            setShowQRReader(false);
            await handleLogin(scannedMatricula);
          }
        },
        (error) => console.debug(error)
      );

      scannerRef.current = scanner;
      return () => {
        if (scannerRef.current) {
          scannerRef.current.clear().catch(console.error);
        }
      };
    }
  }, [showQRReader]);

  const handleLogin = async (userMatricula: string) => {
    setIsLoading(true);
    try {
      // Autenticação via CredentialsProvider do NextAuth [8, 9]
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
        // Redirecionamento bem-sucedido para o contexto avulso
        router.push(targetUrl);
        router.refresh();
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro inesperado ao realizar o login.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md border-t-4 border-t-primary shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl italic font-bold text-primary">Produção Avulsa</CardTitle>
          <CardDescription>Acesse para portadas e carrolões</CardDescription>
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
                    className="pl-10 h-12"
                    value={matricula}
                    onChange={(e) => setMatricula(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>
              
              <Button 
                onClick={() => handleLogin(matricula)} 
                className="w-full h-12 text-lg" 
                disabled={isLoading || !matricula}
              >
                {isLoading ? 'Autenticando...' : 'Acessar Painel'}
              </Button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500 font-medium">OU</span>
                </div>
              </div>

              <Button variant="outline" className="w-full h-12" onClick={() => setShowQRReader(true)}>
                <QrCode className="mr-2 h-5 w-5" /> Ler QR Code do Crachá
              </Button>

              <div className="pt-4 text-center">
                <Link href="/login" className="text-sm text-muted-foreground hover:text-primary flex items-center justify-center gap-1">
                   <ArrowLeft className="h-4 w-4" /> Voltar ao login padrão
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div id="qr-reader" className="w-full overflow-hidden rounded-lg border-2 border-primary/20 shadow-inner" />
              <Button variant="ghost" className="w-full" onClick={() => setShowQRReader(false)}>
                Cancelar Leitura
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}