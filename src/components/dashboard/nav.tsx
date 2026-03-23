//src/components/dashboard/nav.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
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
  isCollapsed?: boolean;
  onToggle?: () => void;
}

export function DashboardNav({ isCollapsed = false, onToggle }: DashboardNavProps) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "bg-white border-r border-gray-200 transition-all duration-300 ease-in-out flex flex-col",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Botão de colapsar no topo */}
      <div className="p-2 border-b flex justify-end">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-8 w-8"
          title={isCollapsed ? "Expandir menu" : "Recolher menu"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Links do menu */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-gray-700 hover:bg-gray-100",
                isCollapsed && "justify-center px-2"
              )}
              title={isCollapsed ? item.title : undefined}
            >
              <Icon className={cn("h-5 w-5 flex-shrink-0", isCollapsed && "h-5 w-5")} />
              {!isCollapsed && <span className="truncate">{item.title}</span>}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}