//src/components/dashboard/header.tsx
'use client';

import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { LogOut, Printer, Menu } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { DashboardNav } from './nav';
import { useState, useEffect } from 'react';

interface DashboardHeaderProps {
  user: {
    nome: string;
    matricula: string;
    nivel: string;
  };
  onToggleNav?: () => void;
  isNavCollapsed?: boolean;
}

export function DashboardHeader({ user, onToggleNav, isNavCollapsed }: DashboardHeaderProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const initials = user.nome
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Função para imprimir a página
  const handlePrint = () => {
    window.print();
  };

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-40 print:shadow-none print:border-none">
      <div className="flex items-center justify-between">
        {/* Logo e título */}
        <div className="flex items-center gap-3">
          {/* Botão para recolher/expandir nav em desktop */}
          {!isMobile && onToggleNav && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleNav}
              className="h-8 w-8 hidden md:flex"
              title={isNavCollapsed ? "Expandir menu" : "Recolher menu"}
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          
          {/* Menu mobile */}
          {isMobile && (
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0">
                <div className="flex flex-col h-full">
                  <div className="p-4 border-b">
                    <h2 className="text-lg font-semibold">Menu</h2>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                    <DashboardNav />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          )}
          
          <h1 className="text-sm md:text-xl font-semibold text-gray-800 truncate max-w-[180px] md:max-w-none">
            Apontador - Pro Moda
          </h1>
        </div>

        {/* Botões de ação */}
        <div className="flex items-center gap-2">
          {/* Botão de impressão */}
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="hidden sm:flex items-center gap-2"
            title="Imprimir página"
          >
            <Printer className="h-4 w-4" />
            <span className="hidden md:inline">Imprimir</span>
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            onClick={handlePrint}
            className="sm:hidden"
            title="Imprimir página"
          >
            <Printer className="h-4 w-4" />
          </Button>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-sm">{initials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none truncate max-w-[200px]">
                    {user.nome}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.matricula} - {user.nivel}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => signOut({ callbackUrl: '/login' })}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}