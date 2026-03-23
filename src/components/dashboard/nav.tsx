//src/components/dashboard/nav.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
import {
  LayoutDashboard,
  Factory,
  Settings,
  QrCode,
  BarChart3,
  FileText,
  Users,
  Package,
  AlertTriangle,
  Layers,
  XCircle,
  Play,
} from 'lucide-react';

const navItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Produções',
    href: '/dashboard/producoes',
    icon: Play,
  },
  {
    title: 'Paradas de Máquina',
    href: '/dashboard/paradas-maquina',
    icon: AlertTriangle,
  },
  {
    title: 'Áreas',
    href: '/dashboard/areas',
    icon: Factory,
  },
  {
    title: 'Setores',
    href: '/dashboard/setores',
    icon: Factory,
  },
  {
    title: 'Máquinas',
    href: '/dashboard/maquinas',
    icon: Settings,
  },
  {
    title: 'Usuários',
    href: '/dashboard/usuarios',
    icon: Users,
  },
  {
    title: 'Produtos',
    href: '/dashboard/produtos',
    icon: Package,
  },
  {
    title: 'Estágios de Produção',
    href: '/dashboard/estagios',
    icon: Layers,
  },
  {
    title: 'Motivos de Parada',
    href: '/dashboard/motivos-parada',
    icon: AlertTriangle,
  },
  {
    title: 'Motivos de Cancelamento',
    href: '/dashboard/motivos-cancelamento',
    icon: XCircle,
  },
  {
    title: 'Ordens de Produção',
    href: '/dashboard/ops',
    icon: FileText,
  },
  {
    title: 'QR Codes',
    href: '/dashboard/qrcodes',
    icon: QrCode,
  },
  {
    title: 'Relatórios',
    href: '/dashboard/relatorios',
    icon: BarChart3,
  },
  {
    title: 'Modo Kanban',
    href: '/dashboard/kanban',
    icon: LayoutDashboard,
  },
  {
    title: 'Teste API',
    href: '/teste-api',
    icon: FileText,
  },
];

interface DashboardNavProps {
  onClose?: () => void;
  isMobile?: boolean;
}

export function DashboardNav({ onClose, isMobile }: DashboardNavProps) {
  const pathname = usePathname();

  const NavLinks = () => (
    <div className="space-y-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-gray-700 hover:bg-gray-100'
            )}
          >
            <Icon className="h-5 w-5 flex-shrink-0" />
            <span className="truncate">{item.title}</span>
          </Link>
        );
      })}
    </div>
  );

  // Versão mobile (menu hamburguer) - retorna o trigger do Sheet
  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden bg-primary text-primary-foreground rounded-full shadow-lg h-10 w-10"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-80 p-0">
          <div className="flex flex-col h-full">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">Menu</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <NavLinks />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Versão desktop (menu lateral fixo)
  return (
    <nav className="w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto h-[calc(100vh-4rem)] sticky top-16">
      <NavLinks />
    </nav>
  );
}