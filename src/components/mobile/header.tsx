'use client';

import { Menu, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface MobileHeaderProps {
  user: {
    nome: string;
    matricula: string;
  };
}

// Mapeamento de rotas para títulos
const pageTitles: Record<string, string> = {
  '/apontamento': 'Início',
  '/apontamento/leitor': 'Ler QR Code',
  '/apontamento/producoes': 'Produções',
  '/apontamento/paradas': 'Paradas',
  '/apontamento/parada': 'Registrar Parada',
  '/apontamento/historico': 'Histórico',
  '/apontamento/perfil': 'Meu Perfil',
};

export function MobileHeader({ user }: MobileHeaderProps) {
  const pathname = usePathname();
  
  // Determinar o título baseado na rota atual
  const getPageTitle = () => {
    // Tenta encontrar um título exato
    if (pageTitles[pathname]) {
      return pageTitles[pathname];
    }
    
    // Para rotas dinâmicas como /apontamento/machine/[id]
    if (pathname.startsWith('/apontamento/machine/')) {
      return 'Detalhes da Máquina';
    }
    if (pathname.startsWith('/apontamento/producoes/finalizar')) {
      return 'Finalizar Produção';
    }
    if (pathname.startsWith('/apontamento/producoes/iniciar')) {
      return 'Iniciar Produção';
    }
    
    // Fallback
    return 'Sistema de Apontamento';
  };

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
      {/* Menu sanduíche (esquerda) */}
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
                <Link href="/apontamento/producoes" className="flex items-center gap-3 p-3 hover:bg-gray-100 rounded-lg">
                  Produções
                </Link>
              </li>
              <li>
                <Link href="/apontamento/paradas" className="flex items-center gap-3 p-3 hover:bg-gray-100 rounded-lg">
                  Paradas
                </Link>
              </li>
              <li>
                <Link href="/apontamento/historico" className="flex items-center gap-3 p-3 hover:bg-gray-100 rounded-lg">
                  Histórico
                </Link>
              </li>
              <li className="border-t pt-2 mt-2">
                <Link href="/apontamento/perfil" className="flex items-center gap-3 p-3 hover:bg-gray-100 rounded-lg">
                  Meu Perfil
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

      {/* Título da página (centro) - DINÂMICO */}
      <h1 className="text-lg font-semibold">{getPageTitle()}</h1>

      {/* Avatar do usuário (direita) */}
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
        <User className="h-5 w-5 text-primary" />
      </div>
    </header>
  );
}