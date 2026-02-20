import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    if (path.startsWith('/dashboard') && token?.nivel !== 'ADM') {
      return NextResponse.redirect(new URL('/apontamento', req.url));
    }

    if (path === '/login' && token) {
      if (token.nivel === 'ADM') {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      } else {
        return NextResponse.redirect(new URL('/apontamento', req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        if (req.nextUrl.pathname === '/login') {
          return true;
        }
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
  ],
};