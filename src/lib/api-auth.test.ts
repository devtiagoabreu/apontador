import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';
import { requireAuth } from '@/lib/api-auth';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

const mockedGetServerSession = vi.mocked(getServerSession);

function sessao(nivel: 'ADM' | 'OPERADOR' | 'MANUTENCAO') {
  return {
    user: { id: 'u1', nome: 'Usuário', matricula: 'MAT1', nivel },
    expires: '2099-01-01T00:00:00.000Z',
  } as any;
}

describe('requireAuth', () => {
  beforeEach(() => {
    mockedGetServerSession.mockReset();
  });

  it('retorna 401 quando não há sessão', async () => {
    mockedGetServerSession.mockResolvedValue(null);
    const resultado = await requireAuth();
    expect(resultado.error).not.toBeNull();
    expect(resultado.error?.status).toBe(401);
    await expect(resultado.error?.json()).resolves.toEqual({
      error: 'Não autorizado',
    });
  });

  it('retorna 403 quando exige ADM e o usuário é OPERADOR', async () => {
    mockedGetServerSession.mockResolvedValue(sessao('OPERADOR'));
    const resultado = await requireAuth({ requiredLevel: 'ADM' });
    expect(resultado.error?.status).toBe(403);
  });

  it('autoriza ADM quando exige ADM', async () => {
    mockedGetServerSession.mockResolvedValue(sessao('ADM'));
    const resultado = await requireAuth({ requiredLevel: 'ADM' });
    expect(resultado.error).toBeNull();
    expect(resultado.session?.user.nivel).toBe('ADM');
  });

  it('autoriza OPERADOR quando não há nível exigido', async () => {
    mockedGetServerSession.mockResolvedValue(sessao('OPERADOR'));
    const resultado = await requireAuth();
    expect(resultado.error).toBeNull();
    expect(resultado.session?.user.nivel).toBe('OPERADOR');
  });

  it('autoriza MANUTENCAO quando está em allowedNiveis', async () => {
    mockedGetServerSession.mockResolvedValue(sessao('MANUTENCAO'));
    const resultado = await requireAuth({ allowedNiveis: ['MANUTENCAO', 'ADM'] });
    expect(resultado.error).toBeNull();
    expect(resultado.session?.user.nivel).toBe('MANUTENCAO');
  });

  it('retorna 403 para OPERADOR fora de allowedNiveis', async () => {
    mockedGetServerSession.mockResolvedValue(sessao('OPERADOR'));
    const resultado = await requireAuth({ allowedNiveis: ['MANUTENCAO', 'ADM'] });
    expect(resultado.error?.status).toBe(403);
  });

  it('retorna 403 para ADM fora de allowedNiveis', async () => {
    mockedGetServerSession.mockResolvedValue(sessao('ADM'));
    const resultado = await requireAuth({ allowedNiveis: ['MANUTENCAO'] });
    expect(resultado.error?.status).toBe(403);
  });

  it('autoriza ADM em allowedNiveis', async () => {
    mockedGetServerSession.mockResolvedValue(sessao('ADM'));
    const resultado = await requireAuth({ allowedNiveis: ['MANUTENCAO', 'ADM'] });
    expect(resultado.error).toBeNull();
  });

  it('allowedNiveis tem precedência sobre requiredLevel', async () => {
    mockedGetServerSession.mockResolvedValue(sessao('MANUTENCAO'));
    const resultado = await requireAuth({
      requiredLevel: 'ADM',
      allowedNiveis: ['MANUTENCAO', 'ADM'],
    });
    expect(resultado.error).toBeNull();
  });
});
