import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { dbSelect } = vi.hoisted(() => ({ dbSelect: vi.fn() }));

vi.mock('@/lib/db', () => ({
  db: { select: dbSelect },
}));

import { systextilService } from '@/lib/systextil';

/**
 * Configura a cadeia `db.select().from().where()` para resolver,
 * em ordem, os arrays informados.
 */
function configurarSelect(resultados: unknown[][]) {
  const where = vi.fn();
  const from = vi.fn(() => ({ where }));
  dbSelect.mockReturnValue({ from });
  resultados.forEach((r) => where.mockResolvedValueOnce(r));
  return { where, from };
}

const fetchMock = vi.fn();

function tokenOk(accessToken = 'token-abc') {
  return {
    ok: true,
    json: async () => ({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600,
      scope: '',
    }),
  };
}

function apiOk(items: unknown[]) {
  return { ok: true, json: async () => ({ items }) };
}

let contadorCliente = 0;
function criarSistema(id: string, overrides: Record<string, unknown> = {}) {
  // clientId único por chamada para não colidir com o cache de token do serviço
  contadorCliente += 1;
  return {
    id,
    clientId: `cliente-${contadorCliente}`,
    clientSecret: 'segredo',
    tokenUrl: 'https://erp.exemplo.com/oauth/token',
    ...overrides,
  };
}

const apiConfigurada = {
  id: 'a1',
  nome: 'Consulta OPs',
  apiUrl: 'https://erp.exemplo.com/ops',
  metodo: 'GET',
  ativa: true,
};

describe('systextilService.importarOps', () => {
  beforeEach(() => {
    dbSelect.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lança erro quando o sistema não é encontrado', async () => {
    configurarSelect([[]]);
    await expect(systextilService.importarOps('inexistente')).rejects.toThrow(
      'Sistema de integração não encontrado'
    );
  });

  it('lança erro quando não há API configurada', async () => {
    configurarSelect([[criarSistema('s1')], []]);
    await expect(systextilService.importarOps('s1')).rejects.toThrow(
      'Nenhuma API configurada para este sistema'
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('lança erro quando as credenciais estão incompletas', async () => {
    configurarSelect([
      [{ id: 's1', clientId: null, clientSecret: null, tokenUrl: null }],
      [apiConfigurada],
    ]);
    await expect(systextilService.importarOps('s1')).rejects.toThrow(
      'Credenciais incompletas'
    );
  });

  it('lança erro quando a obtenção do token falha', async () => {
    configurarSelect([[criarSistema('s1')], [apiConfigurada]]);
    fetchMock.mockResolvedValueOnce({ ok: false, statusText: 'Unauthorized' });
    await expect(systextilService.importarOps('s1')).rejects.toThrow(
      'Erro ao obter token: Unauthorized'
    );
  });

  it('obtém token, chama a API e retorna os itens', async () => {
    const sistema = criarSistema('s1');
    configurarSelect([[sistema], [apiConfigurada]]);
    fetchMock.mockResolvedValueOnce(tokenOk()).mockResolvedValueOnce(apiOk([{ op: 1 }, { op: 2 }]));

    const ops = await systextilService.importarOps('s1');

    expect(ops).toEqual([{ op: 1 }, { op: 2 }]);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      sistema.tokenUrl,
      expect.objectContaining({ method: 'POST' })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      apiConfigurada.apiUrl,
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('lança erro quando a API responde com falha', async () => {
    configurarSelect([[criarSistema('s1')], [apiConfigurada]]);
    fetchMock
      .mockResolvedValueOnce(tokenOk())
      .mockResolvedValueOnce({ ok: false, statusText: 'Not Found' });

    await expect(systextilService.importarOps('s1')).rejects.toThrow(
      'Erro na API (Consulta OPs): Not Found'
    );
  });

  it('usa a API informada por id', async () => {
    configurarSelect([[criarSistema('s1')], [apiConfigurada]]);
    fetchMock.mockResolvedValueOnce(tokenOk()).mockResolvedValueOnce(apiOk([]));

    await systextilService.importarOps('s1', 'a1');

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      apiConfigurada.apiUrl,
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('reutiliza o token em cache nas chamadas seguintes', async () => {
    const sistemaCache = {
      id: 's-cache',
      clientId: 'cliente-cache',
      clientSecret: 'segredo',
      tokenUrl: 'https://erp.exemplo.com/oauth/token',
    };

    configurarSelect([[sistemaCache], [apiConfigurada]]);
    fetchMock.mockResolvedValueOnce(tokenOk()).mockResolvedValueOnce(apiOk([]));
    await systextilService.importarOps('s-cache');

    configurarSelect([[sistemaCache], [apiConfigurada]]);
    fetchMock.mockResolvedValueOnce(apiOk([]));
    await systextilService.importarOps('s-cache');

    // 1 token + 2 chamadas de API = 3 chamadas de fetch
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
