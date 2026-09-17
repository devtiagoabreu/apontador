import { describe, it, expect } from 'vitest';
import {
  cn,
  formatDate,
  formatNumber,
  formatDateWithoutSeconds,
  formatDateForInput,
  fromInputToISO,
  generateCode,
  isValidUUID,
  delay,
} from '@/lib/utils';

describe('cn', () => {
  it('combina classes simples', () => {
    expect(cn('p-2', 'text-sm')).toBe('p-2 text-sm');
  });

  it('resolve conflitos do Tailwind (a última vence)', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it('ignora valores falsy', () => {
    expect(cn('p-2', false, undefined, null, 'm-1')).toBe('p-2 m-1');
  });
});

describe('formatDate', () => {
  it('retorna uma string contendo o ano', () => {
    const resultado = formatDate(new Date(2026, 8, 16, 14, 5));
    expect(typeof resultado).toBe('string');
    expect(resultado).toContain('2026');
  });
});

describe('formatNumber', () => {
  it('formata número no padrão brasileiro com 2 casas', () => {
    expect(formatNumber(1234.5)).toBe('1.234,50');
  });

  it('aceita string numérica', () => {
    expect(formatNumber('1234.5')).toBe('1.234,50');
  });

  it('formata negativos', () => {
    expect(formatNumber(-10)).toBe('-10,00');
  });
});

describe('formatDateWithoutSeconds', () => {
  it('zera segundos e milissegundos mantendo ISO', () => {
    expect(formatDateWithoutSeconds(new Date('2026-09-16T14:05:30.500Z'))).toBe(
      '2026-09-16T14:05:00.000Z'
    );
  });

  it('aceita string de data', () => {
    expect(formatDateWithoutSeconds('2026-09-16T14:05:59.999Z')).toBe(
      '2026-09-16T14:05:00.000Z'
    );
  });
});

describe('formatDateForInput', () => {
  it('gera o formato datetime-local', () => {
    expect(formatDateForInput(new Date(2026, 8, 16, 14, 5))).toBe('2026-09-16T14:05');
  });

  it('preenche zeros à esquerda', () => {
    expect(formatDateForInput(new Date(2026, 0, 3, 4, 9))).toBe('2026-01-03T04:09');
  });
});

describe('fromInputToISO', () => {
  it('converte datetime-local para ISO com segundos zerados', () => {
    expect(fromInputToISO('2026-09-16T14:05')).toBe('2026-09-16T14:05:00.000Z');
  });

  it('usa a data atual quando o valor é vazio', () => {
    const resultado = fromInputToISO('');
    expect(resultado).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\.000Z$/);
  });
});

describe('generateCode', () => {
  it('gera código com o prefixo informado', () => {
    const codigo = generateCode('OP');
    expect(codigo.startsWith('OP')).toBe(true);
    expect(codigo).toHaveLength(8);
    expect(codigo).toBe(codigo.toUpperCase());
  });

  it('respeita o comprimento solicitado', () => {
    expect(generateCode('X', 4)).toHaveLength(5);
  });
});

describe('isValidUUID', () => {
  it('aceita UUID válido', () => {
    expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('é case-insensitive', () => {
    expect(isValidUUID('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
  });

  it('rejeita valores inválidos', () => {
    expect(isValidUUID('nao-e-uuid')).toBe(false);
    expect(isValidUUID('')).toBe(false);
  });
});

describe('delay', () => {
  it('resolve após o tempo informado', async () => {
    await expect(delay(1)).resolves.toBeUndefined();
  });
});
