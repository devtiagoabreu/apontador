import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import { authOptions } from '@/lib/auth';

const { dbMock } = vi.hoisted(() => ({
  dbMock: {
    query: {
      usuarios: {
        findFirst: vi.fn(),
      },
    },
  },
}));

vi.mock('@/lib/db', () => ({ db: dbMock }));
vi.mock('bcryptjs', () => ({ default: { compare: vi.fn() } }));

const findFirst = dbMock.query.usuarios.findFirst as unknown as ReturnType<typeof vi.fn>;
const compare = vi.mocked(bcrypt.compare);

// A dependência next-auth instalada nesta máquina stubba `authorize`
// e guarda a configuração real em `options.authorize`.
const authorize = ((authOptions.providers[0] as any).options.authorize) as (
  credentials: Record<string, string | undefined>
) => Promise<any>;

describe('NextAuth authorize (CredentialsProvider)', () => {
  beforeEach(() => {
    findFirst.mockReset();
    compare.mockReset();
  });

  it('retorna null sem matrícula', async () => {
    await expect(authorize({})).resolves.toBeNull();
    expect(findFirst).not.toHaveBeenCalled();
  });

  it('retorna null quando o usuário não existe', async () => {
    findFirst.mockResolvedValue(null);
    await expect(authorize({ matricula: 'X', senha: 'Y' })).resolves.toBeNull();
  });

  it('retorna null quando o usuário está inativo', async () => {
    findFirst.mockResolvedValue({ id: '1', ativo: false, nivel: 'OPERADOR' });
    await expect(authorize({ matricula: 'OP1', senha: 'OP1' })).resolves.toBeNull();
  });

  it('autentica operador com a matrícula, sem exigir senha (login QR)', async () => {
    findFirst.mockResolvedValue({
      id: 'op-1',
      nome: 'Operador',
      matricula: 'OP1',
      nivel: 'OPERADOR',
      ativo: true,
      senha: null,
    });

    const resultado = await authorize({ matricula: 'OP1' });

    expect(compare).not.toHaveBeenCalled();
    expect(resultado).toMatchObject({
      id: 'op-1',
      nome: 'Operador',
      matricula: 'OP1',
      nivel: 'OPERADOR',
      loginMode: 'normal',
    });
  });

  it('autentica ADM com senha válida (hash bcrypt)', async () => {
    findFirst.mockResolvedValue({
      id: 'adm-1',
      nome: 'Admin',
      matricula: 'ADM',
      nivel: 'ADM',
      ativo: true,
      senha: 'hash-admin',
    });
    compare.mockResolvedValue(true as never);

    const resultado = await authorize({ matricula: 'ADM', senha: 'segredo' });

    expect(compare).toHaveBeenCalledWith('segredo', 'hash-admin');
    expect(resultado).toMatchObject({
      id: 'adm-1',
      nome: 'Admin',
      matricula: 'ADM',
      nivel: 'ADM',
      loginMode: 'normal',
    });
  });

  it('retorna null para ADM sem senha informada', async () => {
    findFirst.mockResolvedValue({
      id: 'adm-1',
      nivel: 'ADM',
      ativo: true,
      senha: 'hash-admin',
    });
    await expect(authorize({ matricula: 'ADM' })).resolves.toBeNull();
    expect(compare).not.toHaveBeenCalled();
  });

  it('retorna null para ADM com senha inválida', async () => {
    findFirst.mockResolvedValue({
      id: 'adm-1',
      nivel: 'ADM',
      ativo: true,
      senha: 'hash-admin',
    });
    compare.mockResolvedValue(false as never);
    await expect(authorize({ matricula: 'ADM', senha: 'errada' })).resolves.toBeNull();
  });

  it('propaga o loginMode avulso', async () => {
    findFirst.mockResolvedValue({
      id: 'op-3',
      matricula: 'OP3',
      nivel: 'OPERADOR',
      ativo: true,
      senha: null,
    });

    const resultado = await authorize({
      matricula: 'OP3',
      loginMode: 'avulso',
    });

    expect(resultado.loginMode).toBe('avulso');
  });
});