import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { usuarios } from '@/lib/db/schema/usuarios';
import { eq } from 'drizzle-orm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default async function OperatorQRPage({ params }: { params: { matricula: string } }) {
  const operador = await db.query.usuarios.findFirst({
    where: eq(usuarios.matricula, params.matricula),
  });

  if (!operador || !operador.ativo) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Operador não encontrado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              O QR Code lido não corresponde a nenhum operador ativo.
            </p>
            <Link href="/login">
              <Button className="w-full">Ir para o Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Criar sessão de login automático (via token)
  // Por enquanto, redirecionar para login com matrícula
  redirect(`/login?matricula=${operador.matricula}&qr=true`);
}