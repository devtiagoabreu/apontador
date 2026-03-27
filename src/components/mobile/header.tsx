// src/components/mobile/header.tsx
'use client';

import { Menu, User, Home, QrCode, Factory, Clock, History, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

/**
 * Propriedades do cabeçalho móvel.
 * O loginMode é essencial para o redirecionamento automático [Histórico da Conversa].
 */
interface MobileHeaderProps {
  user: {
    nome: string;
    matricula: string;
    loginMode?: 'normal' | 'avulso';
  };
  title?: string;
}

// Mapeamento de rotas para títulos amigáveis [1, 2]
const pageTitles: Record<string, string> = {
  '/apontamento': 'Painel de Produção',
  '/apontamento/avulso': 'Produção Avulsa',
  '/apontamento/leitor': 'Ler QR Code',
  '/apontamento/producoes': 'Minhas Produções',
  '/apontamento/paradas': 'Máquinas Paradas',
  '/apontamento/parada': 'Registrar Parada',
  '/apontamento/historico': 'Meu Histórico',
  '/apontamento/perfil': 'Meu Perfil',
};

export function MobileHeader({ user, title }: MobileHeaderProps) {
  const pathname = usePathname();
  
  // Identifica o modo de login para ajustar a navegação [Histórico da Conversa]
  const isAvulso = user?.loginMode === 'avulso';

  /**
   * Resolve o título da página com base na rota atual ou prop manual [1, 2].
   */
  const getPageTitle = () => {
    if (title) return title;
    if (pageTitles[pathname]) return pageTitles[pathname];

    // Tratamento para rotas dinâmicas [1, 3]
    if (pathname.startsWith('/apontamento/machine/')) return 'Detalhes da Máquina';
    if (pathname.startsWith('/apontamento/producoes/finalizar')) return 'Finalizar Produção';
    if (pathname.startsWith('/apontamento/producoes/iniciar')) return 'Iniciar Produção';
    if (pathname.startsWith('/apontamento/avulso/iniciar')) return 'Novo Apontamento Avulso';

    return 'Apontador Pro Moda';
  };

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-sm">
      {/* Menu Sanduíche com Sheet do Radix UI [1, 4, 5] */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="h-10 w-10">
            <Menu className="h-6 w-6 text-gray-700" />
          </Button>
        </SheetTrigger>
        
        <SheetContent side="left" className="w-[280px] p-0">
          {/* Perfil do Usuário no Menu Lateral [1, 6, 7] */}
          <div className="p-6 border-b bg-primary/5">
            <p className="font-bold text-primary text-lg truncate">{user.nome}</p>
            <p className="text-sm text-gray-500 font-medium">Matrícula: {user.matricula}</p>
            {isAvulso && (
              <span className="inline-block mt-2 text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                Modo Avulso
              </span>
            )}
          </div>

          {/* Links de Navegação Inteligentes [Histórico da Conversa] */}
          <nav className="p-4">
            <ul className="space-y-1">
              <li>
                <Link
                  href={isAvulso ? "/apontamento/avulso" : "/apontamento"}
                  className="flex items-center gap-3 p-3 hover:bg-gray-100 rounded-lg transition-colors font-medium text-gray-700"
                >
                  <Home className="h-5 w-5 text-primary" /> Início
                </Link>
              </li>
              <li>
                <Link
                  href="/apontamento/leitor"
                  className="flex items-center gap-3 p-3 hover:bg-gray-100 rounded-lg transition-colors font-medium text-gray-700"
                >
                  <QrCode className="h-5 w-5 text-primary" /> Escanear Máquina
                </Link>
              </li>
              <li>
                <Link
                  href={isAvulso ? "/apontamento/avulso" : "/apontamento/producoes"}
                  className="flex items-center gap-3 p-3 hover:bg-gray-100 rounded-lg transition-colors font-medium text-gray-700"
                >
                  <Factory className="h-5 w-5 text-primary" /> Produções
                </Link>
              </li>
              <li>
                <Link
                  href="/apontamento/paradas"
                  className="flex items-center gap-3 p-3 hover:bg-gray-100 rounded-lg transition-colors font-medium text-gray-700"
                >
                  <Clock className="h-5 w-5 text-primary" /> Paradas Ativas
                </Link>
              </li>
              <li>
                <Link
                  href="/apontamento/historico"
                  className="flex items-center gap-3 p-3 hover:bg-gray-100 rounded-lg transition-colors font-medium text-gray-700"
                >
                  <History className="h-5 w-5 text-primary" /> Histórico
                </Link>
              </li>

              {/* Botão de Logout com Redirecionamento [6, 7] */}
              <li className="border-t my-2 pt-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 p-3 text-red-600 hover:text-red-700 hover:bg-red-50 font-semibold"
                  onClick={() => signOut({ callbackUrl: '/login' })}
                >
                  <LogOut className="h-5 w-5" /> Sair do Sistema
                </Button>
              </li>
            </ul>
          </nav>
        </SheetContent>
      </Sheet>

      {/* Título Centralizado Dinâmico [1] */}
      <h1 className="text-base font-bold text-gray-800 italic truncate max-w-[200px]">
        {getPageTitle()}
      </h1>

      {/* Indicador Visual do Usuário [1, 8] */}
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border-2 border-white shadow-sm">
        <User className="h-5 w-5 text-primary" />
      </div>
    </header>
  );
}