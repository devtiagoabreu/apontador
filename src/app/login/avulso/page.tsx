// src/app/login/avulso/page.tsx
'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { QrCode, User, ArrowLeft, Loader2 } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { toast } from '@/components/ui/use-toast';
import { Label } from '@/components/ui/label';
import Link from 'next/link';

function LoginAvulsoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Captura dados enviados pelo Resolvedor de Operador [History]
  const matriculaUrl = searchParams.get('matricula');
  const isQr = searchParams.get('qr') === 'true';

  const [showQRReader, setShowQRReader] = useState(false);
  const [matricula, setMatricula] = useState(matriculaUrl || '');
  const [isLoading, setIsLoading] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  /**
   * AUTO-LOGIN: Se vier de um QR Code externo (câmera do celular),
   * entra automaticamente [History].
   */
  useEffect(() => {
    if (isQr && matriculaUrl && !isLoading) {
      handleLogin(matriculaUrl);
    }
  }, [isQr, matriculaUrl]);

  /**
   * SCANNER INTERNO: Inicializa o leitor se o botão for clicado.
   */
  useEffect(() => {
    if (showQRReader) {
      const scanner = new Html5QrcodeScanner(
        'qr-reader-avulso',
        { fps: 10, qrbox: { width: 250, height: 250 }, rememberLastUsedCamera: true },
        false
      );

      scanner.render(
        async (decodedText) => {
          scanner.clear();
          setShowQRReader(false);
          // Extrai a matrícula da URL do crachá
          const matriculaLida = decodedText.split('/').pop();
          if (matriculaLida) {
            await handleLogin(matriculaLida);
          }
        },
        (error) => { console.debug(error); }
      );

      return () => {
        scanner.clear().catch(console.error);
      };
    }
  }, [showQRReader]);

  const handleLogin = async (matriculaInput: string) => {
    if (!matriculaInput) return;
    setIsLoading(true);

    try {
      // Define o loginMode como 'avulso' para direcionar ao Urdimento [History]
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
        description: 'Falha crítica ao processar acesso.',
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
          <CardDescription>Acesso via Crachá ou Matrícula</CardDescription>
        </CardHeader>
        
        <CardContent>
          {!showQRReader ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Matrícula do Operador</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <Input
                    placeholder="Ex: OPERA001"
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

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-400">ou</span></div>
              </div>

              <Button 
                variant="outline" 
                className="w-full h-12 border-blue-200 text-blue-700" 
                onClick={() => setShowQRReader(true)}
                disabled={isLoading}
              >
                <QrCode className="mr-2 h-5 w-5" /> Ler Crachá (QR Code)
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div id="qr-reader-avulso" className="w-full rounded-lg overflow-hidden border-2 border-blue-100" />
              <Button variant="ghost" className="w-full text-blue-600" onClick={() => setShowQRReader(false)}>
                Voltar para digitação
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Exportação principal com Suspense Boundary para garantir build no Vercel [History]
export default function LoginAvulsoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-blue-50">Carregando acesso avulso...</div>}>
      <LoginAvulsoContent />
    </Suspense>
  );
}