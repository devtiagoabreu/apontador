import { describe, it, expect } from 'vitest';
import { getEstagioStyle, getEstagioNome } from '@/lib/estagio-utils';

describe('getEstagioStyle', () => {
  it('usa estilo neutro quando o estágio é nulo', () => {
    expect(getEstagioStyle(null)).toEqual({
      backgroundColor: '#f3f4f6',
      color: '#374151',
      border: '1px solid #e5e7eb',
    });
  });

  it('usa estilo neutro quando não há cor', () => {
    expect(getEstagioStyle({ nome: 'Tecelagem', cor: null }).backgroundColor).toBe(
      '#f3f4f6'
    );
  });

  it('gera cor translúcida e destaque quando há cor definida', () => {
    const estilo = getEstagioStyle({ nome: 'Tingimento', cor: '#ff0000' });
    expect(estilo.backgroundColor).toBe('#ff000015');
    expect(estilo.color).toBe('#ff0000');
    expect(estilo.fontWeight).toBe('500');
  });
});

describe('getEstagioNome', () => {
  it('retorna o nome do estágio', () => {
    expect(getEstagioNome({ nome: 'Acabamento' })).toBe('Acabamento');
  });

  it('retorna fallback quando não informado', () => {
    expect(getEstagioNome(null)).toBe('Sem estágio');
    expect(getEstagioNome(undefined)).toBe('Sem estágio');
  });
});
