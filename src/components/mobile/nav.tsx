// src/components/mobile/nav.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Home, QrCode, Factory, Clock, History, CalendarDays } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

export function MobileNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  
  // Identifica o perfil e o modo de login
  const nivel = session?.user?.nivel;
  const isManutencao = nivel === 'MANUTENCAO';
  const isAvulso = session?.user?.loginMode === 'avulso';

  // Badge de agendamentos pendentes (apenas perfil MANUTENCAO)
  const [agendamentosPendentes, setAgendamentosPendentes] = useState(0);

  useEffect(() => {
    if (!isManutencao) return;
    let ativo = true;
    fetch('/api/agendamentos-manutencao?status=AGENDADO')
      .then((res) => (res.ok ? res.json() : []))
      .then((data: unknown[]) => {
        if (ativo) setAgendamentosPendentes(Array.isArray(data) ? data.length : 0);
      })
      .catch(() => {
        if (ativo) setAgendamentosPendentes(0);
      });
    return () => {
      ativo = false;
    };
  }, [isManutencao]);

  // Define as rotas dinamicamente — MANUTENCAO tem nav própria (sem produção)
  const navItems = isManutencao
    ? [
        {
          label: 'Início',
          href: '/apontamento/manutencao',
          icon: Home,
        },
        {
          label: 'Leitor',
          href: '/apontamento/leitor',
          icon: QrCode,
        },
        {
          label: 'Agendamentos',
          href: '/apontamento/manutencao/agendamentos',
          icon: CalendarDays,
        },
        {
          label: 'Histórico',
          href: '/apontamento/manutencao/historico',
          icon: History,
        },
      ]
    : [
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
          const mostraBadge = isManutencao && item.href === '/apontamento/manutencao/agendamentos' && agendamentosPendentes > 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-1 relative",
                isActive ? "text-primary" : "text-gray-400"
              )}
            >
              {mostraBadge && (
                <span
                  className="absolute top-1 right-1/2 translate-x-3 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center"
                  aria-label={`${agendamentosPendentes} agendamentos pendentes`}
                >
                  {agendamentosPendentes > 9 ? '9+' : agendamentosPendentes}
                </span>
              )}
              <item.icon className="h-6 w-6" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}