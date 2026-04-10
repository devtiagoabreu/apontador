// src/app/login/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation' // useSearchParams adicionado
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { QrCode, User, Loader2 } from 'lucide-react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { toast } from '@/components/ui/use-toast'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Captura os dados da URL enviados pelo resolvedor /qr/operator/ [Histórico]
  const matriculaUrl = searchParams.get('matricula')
  const isQr = searchParams.get('qr') === 'true'

  const [showQRReader, setShowQRReader] = useState(false)
  const [matricula, setMatricula] = useState(matriculaUrl || '')
  const [senha, setSenha] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)

  /**
   * FUNCIONALIDADE NOVA: Auto-Login para Modo Normal
   * Dispara o login assim que a página carrega se os dados vierem de um QR Code [Histórico].
   */
  useEffect(() => {
    if (isQr && matriculaUrl && !isLoading) {
      handleLogin(matriculaUrl)
    }
  }, [isQr, matriculaUrl])

  useEffect(() => {
    if (showQRReader) {
      const scanner = new Html5QrcodeScanner(
        'qr-reader',
        { fps: 10, qrbox: { width: 250, height: 250 }, rememberLastUsedCamera: true },
        false
      )

      scanner.render(
        async (decodedText) => {
          scanner.clear()
          setShowQRReader(false)
          // Extrai a matrícula da URL do QR Code [2]
          const matriculaLida = decodedText.split('/').pop()
          if (matriculaLida) {
            await handleLogin(matriculaLida)
          }
        },
        (error) => { console.debug(error) }
      )

      return () => { scanner.clear().catch(console.error) }
    }
  }, [showQRReader])

  const handleLogin = async (matriculaInput: string, password?: string) => {
    setIsLoading(true)
    try {
      // Inicia a sessão garantindo o contexto 'normal' [Histórico]
      const result = await signIn('credentials', {
        matricula: matriculaInput,
        senha: password,
        loginMode: 'normal',
        redirect: false,
      })

      if (result?.error) {
        toast({
          title: 'Erro ao fazer login',
          description: 'Matrícula ou senha inválidos.',
          variant: 'destructive',
        })
      } else {
        router.push('/')
        router.refresh()
      }
    } catch (error) {
      toast({
        title: 'Erro inesperado',
        description: 'Não foi possível processar o login automático.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await handleLogin(matricula, senha)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold italic">Apontador Pro Moda</CardTitle>
          <CardDescription>Faça login com sua matrícula ou QR Code</CardDescription>
        </CardHeader>
        <CardContent>
          {!showQRReader ? (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="matricula">Matrícula</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <Input
                      id="matricula"
                      placeholder="Ex: OPERA001"
                      className="pl-10 h-12 text-lg uppercase"
                      value={matricula}
                      onChange={(e) => setMatricula(e.target.value.toUpperCase())}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="senha">Senha (Apenas ADM)</Label>
                  <Input
                    id="senha"
                    type="password"
                    placeholder="Digite sua senha"
                    className="h-12"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <Button type="submit" className="w-full h-12 text-lg" disabled={isLoading}>
                  {isLoading ? <Loader2 className="animate-spin mr-2" /> : 'Entrar'}
                </Button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500 uppercase font-bold">ou</span>
                </div>
              </div>

              <Button variant="outline" className="w-full h-12" onClick={() => setShowQRReader(true)}>
                <QrCode className="mr-2 h-5 w-5" /> Ler Crachá (QR Code)
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <div id="qr-reader" className="w-full rounded-lg overflow-hidden border" />
              <Button variant="ghost" className="w-full" onClick={() => setShowQRReader(false)}>
                Voltar para digitação
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 