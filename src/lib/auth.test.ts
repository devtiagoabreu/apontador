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

  it('retorna null quando não há senha informada', async () => {
    findFirst.mockResolvedValue({ id: '1', ativo: true, nivel: 'OPERADOR', matricula: 'OP1' });
    await expect(authorize({ matricula: 'OP1' })).resolves.toBeNull();
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

  it('usa a própria matrícula como senha padrão do operador', async () => {
    findFirst.mockResolvedValue({
      id: 'op-1',
      nome: 'Operador',
      matricula: 'OP1',
      nivel: 'OPERADOR',
      ativo: true,
      senha: null,
    });
    compare.mockResolvedValue(true as never);

    const resultado = await authorize({ matricula: 'OP1', senha: 'OP1' });

    expect(compare).toHaveBeenCalledWith('OP1', 'OP1');
    expect(resultado.nivel).toBe('OPERADOR');
  });

  it('usa a senha do cadastro quando o operador possui senha', async () => {
    findFirst.mockResolvedValue({
      id: 'op-2',
      matricula: 'OP2',
      nivel: 'OPERADOR',
      ativo: true,
      senha: 'hash-op',
    });
    compare.mockResolvedValue(true as never);

    await authorize({ matricula: 'OP2', senha: 'minha-senha' });

    expect(compare).toHaveBeenCalledWith('minha-senha', 'hash-op');
  });

  it('propaga o loginMode avulso', async () => {
    findFirst.mockResolvedValue({
      id: 'op-3',
      matricula: 'OP3',
      nivel: 'OPERADOR',
      ativo: true,
      senha: null,
    });
    compare.mockResolvedValue(true as never);

    const resultado = await authorize({
      matricula: 'OP3',
      senha: 'OP3',
      loginMode: 'avulso',
    });

    expect(resultado.loginMode).toBe('avulso');
  });
});
