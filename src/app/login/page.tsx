// src/app/login/page.tsx
'use client'

import { useState, useEffect, useRef, Suspense } from 'react' // Suspense adicionado
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { QrCode, User, Loader2 } from 'lucide-react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { toast } from '@/components/ui/use-toast'

// Componente interno para lidar com searchParams
function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const matriculaUrl = searchParams.get('matricula')
  const isQr = searchParams.get('qr') === 'true'

  const [showQRReader, setShowQRReader] = useState(false)
  const [matricula, setMatricula] = useState(matriculaUrl || '')
  const [senha, setSenha] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isQr && matriculaUrl && !isLoading) {
      handleLogin(matriculaUrl)
    }
  }, [isQr, matriculaUrl])

  useEffect(() => {
    if (showQRReader) {
      const scanner = new Html5QrcodeScanner(
        'qr-reader',
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      )
      scanner.render(async (text) => {
        scanner.clear();
        setShowQRReader(false);
        const lida = text.split('/').pop();
        if (lida) await handleLogin(lida);
      }, () => {});
      return () => { scanner.clear().catch(() => {}) }
    }
  }, [showQRReader])

  const handleLogin = async (id: string, pass?: string) => {
    setIsLoading(true)
    try {
      const result = await signIn('credentials', {
        matricula: id,
        senha: pass,
        loginMode: 'normal',
        redirect: false,
      })
      if (result?.error) {
        toast({ title: 'Erro', description: 'Credenciais inválidas', variant: 'destructive' })
      } else {
        router.push('/')
        router.refresh()
      }
    } finally { setIsLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold italic">Apontador Pro Moda</CardTitle>
          <CardDescription>Login do Operador</CardDescription>
        </CardHeader>
        <CardContent>
          {!showQRReader ? (
            <div className="space-y-4">
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
              <div className="space-y-2">
                <Label>Senha (ADM)</Label>
                <Input className="h-12" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} />
              </div>
              <Button className="w-full h-12 text-lg" onClick={() => handleLogin(matricula, senha)} disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : 'Entrar'}
              </Button>
              <Button variant="outline" className="w-full h-12" onClick={() => setShowQRReader(true)}>
                <QrCode className="mr-2 h-5 w-5" /> Ler QR Code
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div id="qr-reader" className="w-full rounded-lg overflow-hidden border" />
              <Button variant="ghost" className="w-full" onClick={() => setShowQRReader(false)}>Voltar</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Exportação principal envolvida em Suspense para corrigir erro de build
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Carregando...</div>}>
      <LoginContent />
    </Suspense>
  )
} 