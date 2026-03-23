// src/app/dashboard/layout.tsx
'use client';

import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DashboardNav } from '@/components/dashboard/nav';
import { DashboardHeader } from '@/components/dashboard/header';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      const res = await fetch('/api/auth/session');
      const data = await res.json();
      setSession(data);
      setLoading(false);
    };
    fetchSession();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Carregando...</p>
      </div>
    );
  }

  if (!session) {
    redirect('/login');
  }

  if (session.user.nivel !== 'ADM') {
    redirect('/apontamento');
  }

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader 
        user={session.user} 
        onToggleNav={() => setIsNavCollapsed(!isNavCollapsed)}
        isNavCollapsed={isNavCollapsed}
      />
      <div className="flex flex-1">
        {/* Nav desktop - colapsável */}
        <div className="hidden md:block print:hidden">
          <DashboardNav 
            isCollapsed={isNavCollapsed} 
            onToggle={() => setIsNavCollapsed(!isNavCollapsed)}
          />
        </div>
        <main 
          className={cn(
            "flex-1 p-4 md:p-6 bg-gray-50 overflow-x-auto transition-all duration-300",
            "print:p-0 print:bg-white"
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}