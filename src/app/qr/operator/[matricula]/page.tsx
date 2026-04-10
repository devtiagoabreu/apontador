// src/app/qr/operator/[matricula]/page.tsx
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { usuarios } from '@/lib/db/schema/usuarios';
import { eq } from 'drizzle-orm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

/**
 * Resolvedor de QR Code para Colaboradores.
 * Redireciona para o fluxo de login correto com auto-login ativado [18, Histórico].
 */
export default async function OperatorQRPage({ 
  params, 
  searchParams 
}: { 
  params: { matricula: string },
  searchParams: { mode?: string } 
}) {
  // Busca o operador no banco de dados
  const operador = await db.query.usuarios.findFirst({
    where: eq(usuarios.matricula, params.matricula),
  });

  // Validação de segurança: operador deve existir e estar ativo no sistema [1]
  if (!operador || !operador.ativo) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Operador não encontrado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              O QR Code lido não corresponde a nenhum operador ativo no sistema MES.
            </p>
            <Link href="/login">
              <Button className="w-full">Ir para o Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Define o caminho de destino baseado no modo passado na URL do QR Code
  const loginPath = searchParams.mode === 'avulso' ? '/login/avulso' : '/login';

  // Redireciona com parâmetros que acionam o auto-login nas páginas de entrada [Histórico]
  redirect(`${loginPath}?matricula=${operador.matricula}&qr=true`);
}