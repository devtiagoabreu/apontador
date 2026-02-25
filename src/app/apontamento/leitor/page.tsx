'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { MobileHeader } from '@/components/mobile/header';
import { MobileNav } from '@/components/mobile/nav';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { toast } from '@/components/ui/use-toast';

export default function LeitorPage() {
  const router = useRouter();
  const [scanning, setScanning] = useState(true);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        rememberLastUsedCamera: true,
      },
      false
    );

    scanner.render(
      async (decodedText) => {
        scanner.clear();
        setScanning(false);
        
        // Extrair informações do QR Code
        if (decodedText.includes('/machine/')) {
          const machineId = decodedText.split('/machine/').pop();
          router.push(`/apontamento/machine/${machineId}`);
        } else if (decodedText.includes('/op/')) {
          const opNumero = decodedText.split('/op/').pop();
          router.push(`/apontamento/op/${opNumero}`);
        } else {
          toast({
            title: 'QR Code inválido',
            description: 'Este QR Code não é válido para o sistema',
            variant: 'destructive',
          });
          setTimeout(() => setScanning(true), 2000);
        }
      },
      (error) => {
        console.debug(error);
      }
    );

    return () => {
      scanner.clear().catch(console.error);
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50">
      <MobileHeader user={{ nome: 'Operador', matricula: '123' }} title="Ler QR Code" />
      
      <main className="p-4 pb-20">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/apontamento">
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <ArrowLeft className="h-6 w-6" />
            </Button>
          </Link>
          <h1 className="text-xl font-semibold">Ler QR Code</h1>
        </div>

        {scanning ? (
          <div id="qr-reader" className="w-full max-w-md mx-auto" />
        ) : (
          <div className="text-center p-8">
            <p className="text-gray-500">Processando...</p>
          </div>
        )}
      </main>
      
      <MobileNav />
    </div>
  );
}