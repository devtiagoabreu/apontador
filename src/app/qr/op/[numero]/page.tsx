import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { ops } from '@/lib/db/schema/ops';
import { eq } from 'drizzle-orm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default async function OpQRPage({ params }: { params: { numero: string } }) {
  const op = await db.query.ops.findFirst({
    where: eq(ops.op, parseInt(params.numero)),
  });

  if (!op) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>OP não encontrada</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              O QR Code lido não corresponde a nenhuma ordem de produção.
            </p>
            <Link href="/">
              <Button className="w-full">Ir para o Início</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Redirecionar para a página de apontamento da OP
  redirect(`/apontamento/op/${op.op}`);
}