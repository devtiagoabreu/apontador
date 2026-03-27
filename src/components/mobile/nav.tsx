// src/components/mobile/nav.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Home, QrCode, Factory, Clock, History } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MobileNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  
  // Identifica se o usuário está no modo avulso
  const isAvulso = session?.user?.loginMode === 'avulso';

  // Define as rotas dinamicamente
  const navItems = [
    {
      label: 'Início',
      href: isAvulso ? '/apontamento/avulso' : '/apontamento',
      icon: Home,
    },
    {
      label: 'Leitor',
      href: '/apontamento/leitor',
      icon: QrCode,
    },
    {
      label: 'Produções',
      href: isAvulso ? '/apontamento/avulso' : '/apontamento/producoes',
      icon: Factory,
    },
    {
      label: 'Paradas',
      href: '/apontamento/paradas',
      icon: Clock,
    },
    {
      label: 'Histórico',
      href: '/apontamento/historico',
      icon: History,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 pb-safe">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-1",
                isActive ? "text-primary" : "text-gray-400"
              )}
            >
              <item.icon className="h-6 w-6" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}