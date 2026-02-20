'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
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
} from 'lucide-react';

const navItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
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
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="w-64 bg-white border-r border-gray-200 p-4">
      <div className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-gray-700 hover:bg-gray-100'
              )}
            >
              <Icon className="h-5 w-5" />
              {item.title}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}