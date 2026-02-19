// src/middleware.ts
import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    // Proteger rotas de admin
    if (path.startsWith('/dashboard') && token?.nivel !== 'ADM') {
      return NextResponse.redirect(new URL('/apontamento', req.url))
    }

    // Redirecionar usuários logados
    if (path === '/login' && token) {
      if (token.nivel === 'ADM') {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      } else {
        return NextResponse.redirect(new URL('/apontamento', req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Permitir acesso à página de login sem token
        if (req.nextUrl.pathname === '/login') {
          return true
        }
        // Para outras rotas, precisa de token
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    '/',
    '/login',
    '/dashboard/:path*',
    '/apontamento/:path*',
    '/api/protected/:path*',
  ],
}