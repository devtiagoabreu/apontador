// src/lib/api-auth.ts
import { getServerSession } from 'next-auth';
import type { Session } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import type { NivelUsuario } from '@/lib/db/schema/usuarios';

type AuthResult =
  | { session: Session; error: null }
  | { session: null; error: NextResponse };

/**
 * Verifica autenticação e nível de acesso do usuário.
 * Retorna a sessão se autenticado, ou NextResponse com erro 401/403.
 *
 * @param options.requiredLevel - Nível mínimo exigido ('OPERADOR' ou 'ADM').
 *   'OPERADOR' aceita qualquer usuário autenticado (compatibilidade).
 * @param options.allowedNiveis - Lista explícita de níveis permitidos
 *   (ex.: ['MANUTENCAO', 'ADM']). Quando informada, tem precedência sobre requiredLevel.
 */
export async function requireAuth(options?: {
  requiredLevel?: 'OPERADOR' | 'ADM';
  allowedNiveis?: NivelUsuario[];
}): Promise<AuthResult> {
  const session = (await getServerSession(authOptions)) as Session | null;

  if (!session) {
    return {
      session: null,
      error: NextResponse.json({ error: 'Não autorizado' }, { status: 401 }),
    };
  }

  const nivel = session.user.nivel as NivelUsuario;

  // Lista explícita de níveis permitidos (Fase 2: manutenção)
  if (options?.allowedNiveis) {
    if (!options.allowedNiveis.includes(nivel)) {
      return {
        session: null,
        error: NextResponse.json(
          { error: 'Acesso restrito ao perfil solicitado' },
          { status: 403 }
        ),
      };
    }
    return { session, error: null };
  }

  if (options?.requiredLevel === 'ADM' && nivel !== 'ADM') {
    return {
      session: null,
      error: NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 }),
    };
  }

  return { session, error: null };
}