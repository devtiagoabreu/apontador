// src/app/login/page.tsx
'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { QrCode, User } from 'lucide-react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { useEffect, useRef } from 'react'
import { toast } from '@/components/ui/use-toast'

export default function LoginPage() {
  const router = useRouter()
  const [showQRReader, setShowQRReader] = useState(false)
  const [matricula, setMatricula] = useState('')
  const [senha, setSenha] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)

  useEffect(() => {
    if (showQRReader) {
      // Inicializar leitor QR Code
      const scanner = new Html5QrcodeScanner(
        'qr-reader',
        { 
          fps: 10,
          qrbox: { width: 250, height: 250 },
          rememberLastUsedCamera: true,
        },
        false
      )

      scanner.render(
        async (decodedText) => {
          // Sucesso na leitura
          scanner.clear()
          setShowQRReader(false)
          
          // Extrair matrícula do QR Code (formato: URL/base/operator/[MATRICULA])
          const matricula = decodedText.split('/').pop()
          
          if (matricula) {
            await handleLogin(matricula)
          }
        },
        (error) => {
          // Erro na leitura (ignorar, apenas log)
          console.debug(error)
        }
      )

      scannerRef.current = scanner

      return () => {
        scanner.clear().catch(console.error)
      }
    }
  }, [showQRReader])

  const handleLogin = async (matricula: string, password?: string) => {
    setIsLoading(true)
    
    try {
      const result = await signIn('credentials', {
        matricula,
        senha: password,
        redirect: false,
      })

      if (result?.error) {
        toast({
          title: 'Erro ao fazer login',
          description: 'Matrícula ou senha inválidos',
          variant: 'destructive',
        })
      } else {
        router.push('/')
        router.refresh()
      }
    } catch (error) {
      toast({
        title: 'Erro ao fazer login',
        description: 'Ocorreu um erro inesperado',
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
          <CardTitle className="text-2xl">Sistema de Apontamento - Pro Moda Têxtil</CardTitle>
          <CardDescription>
            Faça login com sua matrícula ou QR Code
          </CardDescription>
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
                      placeholder="Digite sua matrícula"
                      className="pl-10"
                      value={matricula}
                      onChange={(e) => setMatricula(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="senha">Senha (apenas administradores)</Label>
                  <Input
                    id="senha"
                    type="password"
                    placeholder="Digite sua senha"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  size="lg"
                  disabled={isLoading}
                >
                  {isLoading ? 'Entrando...' : 'Entrar'}
                </Button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">ou</span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full"
                size="lg"
                onClick={() => setShowQRReader(true)}
              >
                <QrCode className="mr-2 h-5 w-5" />
                Ler QR Code
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <div id="qr-reader" className="w-full" />
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setShowQRReader(false)}
              >
                Voltar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}