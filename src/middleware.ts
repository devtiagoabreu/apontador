// src/middleware.ts
import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    console.log('🔒 Middleware - Path:', path);
    console.log('🔑 Token:', token ? 'presente' : 'ausente');

    // 🔴 CORREÇÃO: Verificar se token existe antes de acessar propriedades
    if (path.startsWith('/dashboard')) {
      if (!token) {
        console.log('   ❌ Sem token, redirecionando para login');
        return NextResponse.redirect(new URL('/login', req.url));
      }
      
      if (token.nivel !== 'ADM') {
        console.log('   ❌ Nível incorreto, redirecionando para apontamento');
        return NextResponse.redirect(new URL('/apontamento', req.url));
      }
      
      console.log('   ✅ Acesso permitido ao dashboard');
      return NextResponse.next();
    }

    if (path === '/login') {
      if (token) {
        if (token.nivel === 'ADM') {
          console.log('   ✅ Usuário ADMIN já logado, redirecionando para dashboard');
          return NextResponse.redirect(new URL('/dashboard', req.url));
        } else {
          console.log('   ✅ Usuário OPERADOR já logado, redirecionando para apontamento');
          return NextResponse.redirect(new URL('/apontamento', req.url));
        }
      }
      console.log('   ✅ Acesso permitido ao login');
      return NextResponse.next();
    }

    // Para APIs e outras rotas, apenas verificar se está autenticado
    if (path.startsWith('/api/')) {
      if (!token) {
        console.log('   ❌ API sem token, retornando 401');
        return NextResponse.json(
          { error: 'Não autorizado' },
          { status: 401 }
        );
      }
      console.log('   ✅ API autorizada');
      return NextResponse.next();
    }

    console.log('   ✅ Rota pública, permitindo acesso');
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;
        
        // Páginas públicas
        if (path === '/login') {
          return true;
        }
        
        // APIs - verificamos no próprio middleware
        if (path.startsWith('/api/')) {
          return true; // Deixa passar e verificamos depois
        }
        
        // Para o resto, precisa de token
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    '/',
    '/login',
    '/dashboard/:path*',
    '/apontamento/:path*',
    '/api/:path*', // ✅ Incluir APIs no matcher
  ],
};