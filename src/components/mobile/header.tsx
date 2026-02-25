'use client';

import { Menu, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { signOut } from 'next-auth/react';
import Link from 'next/link';

interface MobileHeaderProps {
  user: {
    nome: string;
    matricula: string;
  };
  title?: string;
  showMenu?: boolean;
}

export function MobileHeader({ user, title, showMenu = true }: MobileHeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
      {/* Menu lateral (esquerda) */}
      {showMenu ? (
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] p-0">
            <div className="p-6 border-b">
              <p className="font-medium">{user.nome}</p>
              <p className="text-sm text-gray-500">{user.matricula}</p>
            </div>
            <nav className="p-4">
              <ul className="space-y-2">
                <li>
                  <Link href="/apontamento" className="flex items-center gap-3 p-3 hover:bg-gray-100 rounded-lg">
                    Início
                  </Link>
                </li>
                <li>
                  <Link href="/apontamento/historico" className="flex items-center gap-3 p-3 hover:bg-gray-100 rounded-lg">
                    Meu Histórico
                  </Link>
                </li>
                <li>
                  <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="w-full text-left flex items-center gap-3 p-3 hover:bg-gray-100 rounded-lg text-red-600"
                  >
                    Sair
                  </button>
                </li>
              </ul>
            </nav>
          </SheetContent>
        </Sheet>
      ) : (
        <div className="w-10" /> // Espaço vazio para manter o alinhamento
      )}

      {/* Título central */}
      <h1 className="text-lg font-semibold">{title || 'Sistema de Apontamento Têxtil'}</h1>

      {/* Avatar do usuário (direita) */}
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
        <User className="h-5 w-5 text-primary" />
      </div>
    </header>
  );
}