// src/app/apontamento/manutencao/page.tsx
// Home do perfil MANUTENCAO — versão inicial navegável (Fase 4 completa com dados).
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Link from 'next/link';
import { QrCode, CalendarDays, History, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default async function ManutencaoHomePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  const nome = session.user.nome?.split(' ')[0] ?? '';

  return (
    <div className="p-4 space-y-4">
      <header>
        <p className="text-sm text-gray-500">O que vamos manter hoje?</p>
        <h1 className="text-2xl font-bold text-gray-800">Olá, {nome}!</h1>
      </header>

      <section aria-label="Ação principal">
        <Link href="/apontamento/leitor" className="block">
          <Button className="w-full h-16 text-lg" size="lg">
            <QrCode className="mr-2 h-6 w-6" aria-hidden="true" />
            Ler QR Code
          </Button>
        </Link>
      </section>

      <section aria-label="Agendamentos">
        <Link href="/apontamento/manutencao/agendamentos" className="block">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="flex items-center gap-3 p-4">
              <CalendarDays className="h-8 w-8 text-primary flex-shrink-0" aria-hidden="true" />
              <div>
                <p className="font-semibold">Agendamentos</p>
                <p className="text-sm text-gray-500">Manutenções programadas</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </section>

      <section aria-label="Em andamento">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Wrench className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 className="font-semibold">Em andamento</h2>
            </div>
            <p className="text-sm text-gray-500">
              Nenhuma manutenção em andamento no momento.
            </p>
          </CardContent>
        </Card>
      </section>

      <section aria-label="Histórico recente">
        <Link href="/apontamento/manutencao/historico" className="block">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="flex items-center gap-3 p-4">
              <History className="h-8 w-8 text-primary flex-shrink-0" aria-hidden="true" />
              <div>
                <p className="font-semibold">Histórico recente</p>
                <p className="text-sm text-gray-500">Suas últimas manutenções</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </section>
    </div>
  );
}