// src/app/dashboard/layout.tsx
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DashboardNav } from '@/components/dashboard/nav';
import { DashboardHeader } from '@/components/dashboard/header';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  if (session.user.nivel !== 'ADM') {
    redirect('/apontamento');
  }

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader user={session.user} />
      <div className="flex flex-1">
        {/* Nav desktop - só aparece em telas maiores */}
        <div className="hidden md:block">
          <DashboardNav />
        </div>
        <main className="flex-1 p-4 md:p-6 bg-gray-50 overflow-x-auto">
          {children}
        </main>
      </div>
    </div>
  );
}