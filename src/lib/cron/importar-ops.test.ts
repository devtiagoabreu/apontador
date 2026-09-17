import { describe, it, expect, vi, beforeEach } from 'vitest';

const { dbMock, valuesMock, importarOpsMock } = vi.hoisted(() => ({
  dbMock: {
    select: vi.fn(),
    query: {
      ops: { findFirst: vi.fn() },
      produtos: { findFirst: vi.fn() },
    },
    insert: vi.fn(),
  },
  valuesMock: vi.fn(),
  importarOpsMock: vi.fn(),
}));

vi.mock('@/lib/db', () => ({ db: dbMock }));
vi.mock('@/lib/systextil', () => ({
  systextilService: { importarOps: importarOpsMock },
}));

import { importarOpsAutomatico } from '@/lib/cron/importar-ops';

function configurarSelectSistema(resultado: unknown[]) {
  const where = vi.fn().mockResolvedValue(resultado);
  dbMock.select.mockReturnValue({ from: vi.fn(() => ({ where })) });
  return where;
}

function opImportada(op: number, produto: string) {
  return {
    op,
    produto,
    deposito_final: 'D1',
    pecas_vinculadas: 'P1',
    qtde_programado: 100,
    qtde_carregado: 0,
    qtde_produzida: 0,
    calculo_quebra: 0,
    obs: '',
    um: 'M',
    narrativa: '',
    nivel: '1',
    grupo: 'G',
    sub: 'S',
    item: 'I',
  };
}

describe('importarOpsAutomatico', () => {
  beforeEach(() => {
    dbMock.select.mockReset();
    dbMock.query.ops.findFirst.mockReset();
    dbMock.query.produtos.findFirst.mockReset();
    valuesMock.mockReset();
    importarOpsMock.mockReset();
    dbMock.insert.mockReturnValue({ values: valuesMock });
  });

  it('encerra quando não há sistema ativo', async () => {
    configurarSelectSistema([]);
    await importarOpsAutomatico();
    expect(importarOpsMock).not.toHaveBeenCalled();
    expect(valuesMock).not.toHaveBeenCalled();
  });

  it('usa o sistema ativo quando nenhum id é informado', async () => {
    configurarSelectSistema([{ id: 'auto' }]);
    importarOpsMock.mockResolvedValue([]);

    await importarOpsAutomatico();

    expect(importarOpsMock).toHaveBeenCalledWith('auto');
  });

  it('ignora OPs existentes e importa as novas vinculando o produto', async () => {
    importarOpsMock.mockResolvedValue([opImportada(1, 'T1'), opImportada(2, 'T2')]);
    dbMock.query.ops.findFirst
      .mockResolvedValueOnce({ op: 1 }) // já existe
      .mockResolvedValueOnce(null); // nova
    dbMock.query.produtos.findFirst.mockResolvedValue({ id: 'produto-2' });

    await importarOpsAutomatico('s1');

    expect(valuesMock).toHaveBeenCalledTimes(1);
    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        op: 2,
        produto: 'T2',
        produtoId: 'produto-2',
        status: 'ABERTA',
        codEstagioAtual: '00',
        estagioAtual: 'NENHUM',
      })
    );
  });

  it('importa OP sem produto vinculado (produtoId nulo)', async () => {
    importarOpsMock.mockResolvedValue([opImportada(3, 'T3')]);
    dbMock.query.ops.findFirst.mockResolvedValue(null);
    dbMock.query.produtos.findFirst.mockResolvedValue(null);

    await importarOpsAutomatico('s1');

    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({ op: 3, produtoId: null })
    );
  });

  it('não propaga erros da importação', async () => {
    importarOpsMock.mockRejectedValue(new Error('falha na API'));

    await expect(importarOpsAutomatico('s1')).resolves.toBeUndefined();
    expect(valuesMock).not.toHaveBeenCalled();
  });
});
