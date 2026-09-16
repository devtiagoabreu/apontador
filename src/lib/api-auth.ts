// src/lib/api-auth.ts
import { getServerSession } from 'next-auth';
import type { Session } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

type AuthResult =
  | { session: Session; error: null }
  | { session: null; error: NextResponse };

/**
 * Verifica autenticação e nível de acesso do usuário.
 * Retorna a sessão se autenticado, ou NextResponse com erro 401/403.
 *
 * @param options.requiredLevel - Nível mínimo exigido ('OPERADOR' ou 'ADM')
 */
export async function requireAuth(options?: {
  requiredLevel?: 'OPERADOR' | 'ADM';
}): Promise<AuthResult> {
  const session = (await getServerSession(authOptions)) as Session | null;

  if (!session) {
    return {
      session: null,
      error: NextResponse.json({ error: 'Não autorizado' }, { status: 401 }),
    };
  }

  if (options?.requiredLevel === 'ADM' && session.user.nivel !== 'ADM') {
    return {
      session: null,
      error: NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 }),
    };
  }

  return { session, error: null };
}
