// src/app/apontamento/leitor/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { toast } from '@/components/ui/use-toast';

export default function LeitorPage() {
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    const scanner = new Html5QrcodeScanner('qr-reader', { fps: 10, qrbox: 250 }, false);

    scanner.render(async (decodedText) => {
      if (decodedText.includes('/machine/')) {
        const id = decodedText.split('/machine/').pop();
        scanner.clear();

        // REDIRECIONAMENTO AUTOMÁTICO POR SESSÃO
        if (session?.user?.loginMode === 'avulso') {
          router.push(`/apontamento/avulso/iniciar?machine=${id}`);
        } else {
          router.push(`/apontamento/machine/${id}`);
        }
      } else {
        toast({ title: 'QR Code Inválido', variant: 'destructive' });
      }
    }, (err) => console.debug(err));

    return () => { scanner.clear().catch(console.error); };
  }, [session, router]);

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Escanear Máquina</h1>
      <div id="qr-reader" className="border-2 border-primary rounded-lg overflow-hidden" />
    </div>
  );
}