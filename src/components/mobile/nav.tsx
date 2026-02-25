'use client';

import { Home, QrCode, Clock, History } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export function MobileNav() {
  const pathname = usePathname();

  const items = [
    { href: '/apontamento', icon: Home, label: 'Início' },
    { href: '/apontamento/leitor', icon: QrCode, label: 'Ler QR' },
    { href: '/apontamento/paradas', icon: Clock, label: 'Paradas' }, // PLURAL!
    { href: '/apontamento/historico', icon: History, label: 'Histórico' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 py-1 z-50">
      <div className="flex justify-around">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center py-2 px-3 rounded-lg transition-colors',
                isActive ? 'text-primary' : 'text-gray-500 hover:text-gray-900'
              )}
            >
              <Icon className="h-6 w-6" />
              <span className="text-xs mt-1">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}