import { describe, it, expect } from 'vitest';
import {
  conflitoParaIniciarManutencao,
  conflitoParaIniciarAgendamento,
  conflitoParaFinalizarManutencao,
  conflitoParaCancelarAgendamento,
  validarDataPrevistaReagendamento,
  validarPrioridade,
  validarDataPrevistaAgendamento,
  conflitoParaCriarAgendamento,
  sugerirDataProximaManutencao,
  finalizarManutencaoSchema,
  PERIODICIDADE_LABEL,
  PRIORIDADE_LABEL,
  PRIORIDADE_OPCOES,
  STATUS_MANUTENCAO_LABEL,
  STATUS_AGENDAMENTO_LABEL,
} from '@/lib/manutencao';

// ---------------------------------------------------------------------------
// RF9 — Conflito de máquina
// ---------------------------------------------------------------------------
describe('conflitoParaIniciarManutencao', () => {
  it('permite iniciar em máquina ativa e disponível', () => {
    expect(conflitoParaIniciarManutencao({ ativo: true, status: 'DISPONIVEL' })).toBeNull();
  });

  it('permite iniciar em máquina parada (PARADA não bloqueia)', () => {
    expect(conflitoParaIniciarManutencao({ ativo: true, status: 'PARADA' })).toBeNull();
  });

  it('bloqueia máquina inativa', () => {
    expect(conflitoParaIniciarManutencao({ ativo: false, status: 'DISPONIVEL' })).toBe(
      'Máquina inativa'
    );
  });

  it('bloqueia máquina com produção ativa (EM_PROCESSO)', () => {
    expect(conflitoParaIniciarManutencao({ ativo: true, status: 'EM_PROCESSO' })).toBe(
      'Não é possível iniciar manutenção em máquina com produção ativa'
    );
  });

  it('bloqueia máquina já em manutenção (EM_MANUTENCAO)', () => {
    expect(conflitoParaIniciarManutencao({ ativo: true, status: 'EM_MANUTENCAO' })).toBe(
      'Não é possível iniciar manutenção em máquina que já está em manutenção'
    );
  });
});

// ---------------------------------------------------------------------------
// Início por agendamento (RF6)
// ---------------------------------------------------------------------------
describe('conflitoParaIniciarAgendamento', () => {
  it('permite iniciar agendamento AGENDADO', () => {
    expect(conflitoParaIniciarAgendamento('AGENDADO')).toBeNull();
  });

  it('bloqueia agendamento que não está AGENDADO', () => {
    expect(conflitoParaIniciarAgendamento('EM_ANDAMENTO')).toBe('Agendamento não está agendado');
    expect(conflitoParaIniciarAgendamento('CONCLUIDO')).toBe('Agendamento não está agendado');
    expect(conflitoParaIniciarAgendamento('CANCELADO')).toBe('Agendamento não está agendado');
  });
});

// ---------------------------------------------------------------------------
// Término (RF4)
// ---------------------------------------------------------------------------
describe('conflitoParaFinalizarManutencao', () => {
  it('permite finalizar manutenção em andamento', () => {
    expect(conflitoParaFinalizarManutencao('EM_ANDAMENTO')).toBeNull();
  });

  it('bloqueia finalizar manutenção não EM_ANDAMENTO', () => {
    expect(conflitoParaFinalizarManutencao('CONCLUIDA')).toBe(
      'Manutenção não está em andamento'
    );
    expect(conflitoParaFinalizarManutencao('CANCELADA')).toBe(
      'Manutenção não está em andamento'
    );
  });
});

// ---------------------------------------------------------------------------
// Reagendamento (RF5)
// ---------------------------------------------------------------------------
describe('finalizarManutencaoSchema', () => {
  it('aceita finalizar sem reagendar', () => {
    const resultado = finalizarManutencaoSchema.parse({ agendar: { sim: false } });
    expect(resultado.agendar.sim).toBe(false);
  });

  it('aceita finalizar com observações', () => {
    const resultado = finalizarManutencaoSchema.parse({
      observacoes: 'Troca de rolamento',
      agendar: { sim: false },
    });
    expect(resultado.observacoes).toBe('Troca de rolamento');
  });

  it('aceita reagendar com data', () => {
    const resultado = finalizarManutencaoSchema.parse({
      agendar: { sim: true, dataPrevista: '2026-10-01T10:00:00.000Z' },
    });
    expect(resultado.agendar.sim).toBe(true);
  });

  it('rejeita reagendar sem data', () => {
    expect(
      finalizarManutencaoSchema.safeParse({ agendar: { sim: true } }).success
    ).toBe(false);
  });

  it('rejeita agendar com valor não booleano', () => {
    expect(
      finalizarManutencaoSchema.safeParse({ agendar: { sim: 'talvez' } }).success
    ).toBe(false);
  });

  it('rejeita body sem campo agendar', () => {
    expect(finalizarManutencaoSchema.safeParse({}).success).toBe(false);
  });
});

describe('validarDataPrevistaReagendamento', () => {
  it('aceita data futura', () => {
    const futura = new Date();
    futura.setDate(futura.getDate() + 7);
    expect(validarDataPrevistaReagendamento(futura.toISOString())).toBeNull();
  });

  it('rejeita data no passado', () => {
    const passada = new Date();
    passada.setDate(passada.getDate() - 1);
    expect(validarDataPrevistaReagendamento(passada.toISOString())).toBe(
      'Data prevista não pode ser no passado'
    );
  });

  it('rejeita data inválida', () => {
    expect(validarDataPrevistaReagendamento('data-invalida')).toBe('Data prevista inválida');
  });
});

// ---------------------------------------------------------------------------
// Backlog — Prioridade (0-3)
// ---------------------------------------------------------------------------
describe('validarPrioridade', () => {
  it('aceita prioridades válidas (0-3)', () => {
    expect(validarPrioridade(0)).toBeNull();
    expect(validarPrioridade(1)).toBeNull();
    expect(validarPrioridade(2)).toBeNull();
    expect(validarPrioridade(3)).toBeNull();
  });

  it('rejeita prioridade fora da faixa', () => {
    expect(validarPrioridade(-1)).toBe('Prioridade deve estar entre 0 e 3');
    expect(validarPrioridade(4)).toBe('Prioridade deve estar entre 0 e 3');
  });

  it('rejeita não-inteiro', () => {
    expect(validarPrioridade(1.5)).toBe('Prioridade inválida');
  });

  it('rejeita valor não numérico', () => {
    expect(validarPrioridade('1')).toBe('Prioridade inválida');
    expect(validarPrioridade(null)).toBe('Prioridade inválida');
  });
});

describe('rótulos de prioridade', () => {
  it('mapeia prioridade 0-3', () => {
    expect(PRIORIDADE_LABEL[0]).toBe('Baixa');
    expect(PRIORIDADE_LABEL[1]).toBe('Normal');
    expect(PRIORIDADE_LABEL[2]).toBe('Alta');
    expect(PRIORIDADE_LABEL[3]).toBe('Urgente');
  });

  it('expõe as 4 opções', () => {
    expect(PRIORIDADE_OPCOES.map((o) => o.value)).toEqual([0, 1, 2, 3]);
  });
});

// ---------------------------------------------------------------------------
// Backlog — Criação manual de agendamento
// ---------------------------------------------------------------------------
describe('conflitoParaCriarAgendamento', () => {
  it('permite criar agendamento para máquina ativa', () => {
    expect(conflitoParaCriarAgendamento({ ativo: true, status: 'DISPONIVEL' })).toBeNull();
  });

  it('bloqueia máquina inativa', () => {
    expect(conflitoParaCriarAgendamento({ ativo: false, status: 'DISPONIVEL' })).toBe(
      'Máquina inativa'
    );
  });
});

describe('validarDataPrevistaAgendamento', () => {
  it('aceita data futura', () => {
    const futura = new Date();
    futura.setDate(futura.getDate() + 10);
    expect(validarDataPrevistaAgendamento(futura.toISOString())).toBeNull();
  });

  it('aceita data de hoje', () => {
    expect(validarDataPrevistaAgendamento(new Date().toISOString())).toBeNull();
  });

  it('rejeita data no passado', () => {
    const passada = new Date();
    passada.setDate(passada.getDate() - 1);
    expect(validarDataPrevistaAgendamento(passada.toISOString())).toBe(
      'Data prevista não pode ser no passado'
    );
  });

  it('rejeita data inválida', () => {
    expect(validarDataPrevistaAgendamento('nao-eh-data')).toBe('Data prevista inválida');
  });
});

// ---------------------------------------------------------------------------
// Backlog — Plano por período (sugestão de próxima data)
// ---------------------------------------------------------------------------
describe('sugerirDataProximaManutencao', () => {
  const fim = new Date('2026-09-01T10:00:00.000Z');

  it('retorna null sem intervalo', () => {
    expect(sugerirDataProximaManutencao(fim, null)).toBeNull();
    expect(sugerirDataProximaManutencao(fim, undefined)).toBeNull();
  });

  it('retorna null para intervalo inválido', () => {
    expect(sugerirDataProximaManutencao(fim, 0)).toBeNull();
    expect(sugerirDataProximaManutencao(fim, -10)).toBeNull();
  });

  it('soma o intervalo ao fim', () => {
    expect(sugerirDataProximaManutencao(fim, 30)).toBe('2026-10-01');
  });

  it('nunca sugere data no passado (clampa para hoje)', () => {
    const antigo = new Date('2000-01-01T00:00:00.000Z');
    const hoje = new Date().toISOString().split('T')[0];
    expect(sugerirDataProximaManutencao(antigo, 1)).toBe(hoje);
  });
});

// ---------------------------------------------------------------------------
// Cancelamento (RF7)
// ---------------------------------------------------------------------------
describe('conflitoParaCancelarAgendamento', () => {
  it('permite cancelar agendamento AGENDADO', () => {
    expect(conflitoParaCancelarAgendamento('AGENDADO')).toBeNull();
  });

  it('bloqueia cancelar agendamento em andamento ou concluído', () => {
    expect(conflitoParaCancelarAgendamento('EM_ANDAMENTO')).toBe(
      'Apenas agendamentos com status AGENDADO podem ser cancelados'
    );
    expect(conflitoParaCancelarAgendamento('CONCLUIDO')).toBe(
      'Apenas agendamentos com status AGENDADO podem ser cancelados'
    );
  });
});

// ---------------------------------------------------------------------------
// Rótulos exibíveis
// ---------------------------------------------------------------------------
describe('rótulos de manutenção', () => {
  it('mapeia periodicidade', () => {
    expect(PERIODICIDADE_LABEL.EVENTUAL).toBe('Eventual');
    expect(PERIODICIDADE_LABEL.PERIODICA).toBe('Periódica');
  });

  it('mapeia status de manutenção', () => {
    expect(STATUS_MANUTENCAO_LABEL.EM_ANDAMENTO).toBe('Em Andamento');
    expect(STATUS_MANUTENCAO_LABEL.CONCLUIDA).toBe('Concluída');
    expect(STATUS_MANUTENCAO_LABEL.CANCELADA).toBe('Cancelada');
  });

  it('mapeia status de agendamento', () => {
    expect(STATUS_AGENDAMENTO_LABEL.AGENDADO).toBe('Agendado');
    expect(STATUS_AGENDAMENTO_LABEL.EM_ANDAMENTO).toBe('Em Andamento');
    expect(STATUS_AGENDAMENTO_LABEL.CONCLUIDO).toBe('Concluído');
    expect(STATUS_AGENDAMENTO_LABEL.CANCELADO).toBe('Cancelado');
  });
});