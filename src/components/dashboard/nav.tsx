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
  Wrench,
  ClipboardList,
  CalendarDays,
  History,
} from 'lucide-react';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  group?: string; // Cabeçalho de grupo visual (ex.: "Manutenção")
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
    title: 'Prod. Avulsa',
    href: '/dashboard/producao-avulsa',
    icon: Package, // Use o ícone Package da lucide-react
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
    title: 'Manutenção',
    href: '/dashboard/manutencao',
    icon: Wrench,
    group: 'Manutenção',
  },
  {
    title: 'Agendamentos Manut.',
    href: '/dashboard/manutencao/agendamentos',
    icon: CalendarDays,
    group: 'Manutenção',
  },
  {
    title: 'Histórico Manut.',
    href: '/dashboard/manutencao/historico',
    icon: History,
    group: 'Manutenção',
  },
  {
    title: 'Tipos de Manutenção',
    href: '/dashboard/tipos-manutencao',
    icon: Wrench,
    group: 'Manutenção',
  },
  {
    title: 'Atividades de Manutenção',
    href: '/dashboard/atividades-manutencao',
    icon: ClipboardList,
    group: 'Manutenção',
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
    title: 'Configurações',
    href: '/dashboard/configuracoes',
    icon: Settings,
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
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          const mostraGrupo = item.group && (index === 0 || navItems[index - 1].group !== item.group);
          
          return (
            <div key={item.href}>
              {mostraGrupo && (
                <div className={cn(
                  "px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400",
                  isCollapsed && "text-center px-0"
                )}>
                  {item.group}
                </div>
              )}
              <Link
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
            </div>
          );
        })}
      </div>
    </nav>
  );
}