// src/components/mobile/header.tsx
'use client';

import { Menu, User, Home, QrCode, Factory, Clock, History, CalendarDays, LogOut, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

/**
 * Propriedades do cabeçalho móvel.
 * O loginMode é utilizado para manter o contexto durante o uso e no logout.
 */
interface MobileHeaderProps {
  user: {
    nome: string;
    matricula: string;
    nivel?: string;
    loginMode?: 'normal' | 'avulso';
  };
  title?: string;
}

const pageTitles: Record<string, string> = {
  '/apontamento': 'Painel de Produção',
  '/apontamento/avulso': 'Produção Avulsa',
  '/apontamento/leitor': 'Ler QR Code',
  '/apontamento/producoes': 'Minhas Produções',
  '/apontamento/paradas': 'Máquinas Paradas',
  '/apontamento/parada': 'Registrar Parada',
  '/apontamento/historico': 'Meu Histórico',
  '/apontamento/perfil': 'Meu Perfil',
  '/apontamento/manutencao': 'Manutenção',
  '/apontamento/manutencao/agendamentos': 'Agendamentos',
  '/apontamento/manutencao/historico': 'Histórico Manutenção',
};

export function MobileHeader({ user, title }: MobileHeaderProps) {
  const pathname = usePathname();
  
  // Identifica o perfil e o modo de login para ajustar a navegação e o logout
  const isManutencao = user?.nivel === 'MANUTENCAO';
  const isAvulso = user?.loginMode === 'avulso';

  const getPageTitle = () => {
    if (title) return title;
    if (pageTitles[pathname]) return pageTitles[pathname];

    if (pathname.startsWith('/apontamento/machine/')) return 'Detalhes da Máquina';
    if (pathname.startsWith('/apontamento/producoes/finalizar')) return 'Finalizar Produção';
    if (pathname.startsWith('/apontamento/producoes/iniciar')) return 'Iniciar Produção';
    if (pathname.startsWith('/apontamento/avulso/iniciar')) return 'Novo Apontamento Avulso';
    if (pathname.startsWith('/apontamento/manutencao/iniciar')) return 'Iniciar Manutenção';
    if (pathname.startsWith('/apontamento/manutencao/finalizar')) return 'Finalizar Manutenção';

    return 'Apontador Pro Moda';
  };

  const navLinks = isManutencao
    ? [
        { href: '/apontamento/manutencao', label: 'Início', icon: Home },
        { href: '/apontamento/leitor', label: 'Escanear Máquina', icon: QrCode },
        { href: '/apontamento/manutencao/agendamentos', label: 'Agendamentos', icon: CalendarDays },
        { href: '/apontamento/manutencao/historico', label: 'Histórico', icon: History },
      ]
    : [
        { href: isAvulso ? '/apontamento/avulso' : '/apontamento', label: 'Início', icon: Home },
        { href: '/apontamento/leitor', label: 'Escanear Máquina', icon: QrCode },
        { href: isAvulso ? '/apontamento/avulso' : '/apontamento/producoes', label: 'Produções', icon: Factory },
        { href: '/apontamento/paradas', label: 'Paradas Ativas', icon: Clock },
        { href: '/apontamento/historico', label: 'Histórico', icon: History },
      ];

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-sm">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="h-10 w-10" aria-label="Abrir menu">
            <Menu className="h-6 w-6 text-gray-700" />
          </Button>
        </SheetTrigger>
        
        <SheetContent side="left" className="w-[280px] p-0">
          <div className="p-6 border-b bg-primary/5">
            <p className="font-bold text-primary text-lg truncate">{user.nome}</p>
            <p className="text-sm text-gray-500 font-medium">Matrícula: {user.matricula}</p>
            {isManutencao ? (
              <span className="inline-block mt-2 text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                Manutenção
              </span>
            ) : isAvulso ? (
              <span className="inline-block mt-2 text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                Modo Avulso
              </span>
            ) : null}
          </div>

          <nav className="p-4" aria-label="Menu principal">
            <ul className="space-y-1">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="flex items-center gap-3 p-3 hover:bg-gray-100 rounded-lg transition-colors font-medium text-gray-700"
                  >
                    <link.icon className="h-5 w-5 text-primary" /> {link.label}
                  </Link>
                </li>
              ))}

              {/* LÓGICA DE LOGOUT: Detecta o loginMode para decidir o redirecionamento */}
              <li className="border-t my-2 pt-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 p-3 text-red-600 hover:text-red-700 hover:bg-red-50 font-semibold"
                  onClick={() => signOut({ 
                    callbackUrl: isAvulso ? '/login/avulso' : '/login' 
                  })}
                >
                  <LogOut className="h-5 w-5" /> Sair do Sistema
                </Button>
              </li>
            </ul>
          </nav>
        </SheetContent>
      </Sheet>

      <h1 className="text-base font-bold text-gray-800 italic truncate max-w-[200px]">
        {getPageTitle()}
      </h1>

      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border-2 border-white shadow-sm">
        {isManutencao ? (
          <Wrench className="h-5 w-5 text-primary" />
        ) : (
          <User className="h-5 w-5 text-primary" />
        )}
      </div>
    </header>
  );
}