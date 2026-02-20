import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { maquinas } from '@/lib/db/schema/maquinas';
import { eq } from 'drizzle-orm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default async function MachineQRPage({ params }: { params: { id: string } }) {
  const maquina = await db.query.maquinas.findFirst({
    where: eq(maquinas.id, params.id),
  });

  if (!maquina) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Máquina não encontrada</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              O QR Code lido não corresponde a nenhuma máquina cadastrada.
            </p>
            <Link href="/">
              <Button className="w-full">Ir para o Início</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Redirecionar para a página de apontamento da máquina
  redirect(`/apontamento/machine/${maquina.id}`);
}