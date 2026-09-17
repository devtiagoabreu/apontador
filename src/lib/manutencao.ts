// src/lib/manutencao.ts
// Lógica de negócio pura do módulo de manutenção — sem dependência de banco/HTTP,
// testável em isolamento e reutilizada pelas rotas de API.

import { z } from 'zod';

// Status possíveis de máquina (ver schema maquinas)
export type StatusMaquina = 'DISPONIVEL' | 'EM_PROCESSO' | 'PARADA' | 'EM_MANUTENCAO';

// Status de manutenção
export type StatusManutencao = 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA';

// Status de agendamento
export type StatusAgendamento = 'AGENDADO' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'CANCELADO';

// ---------------------------------------------------------------------------
// RF9 — Conflito de máquina: não é possível iniciar manutenção em máquina com
// produção ativa (EM_PROCESSO) nem com manutenção ativa (EM_MANUTENCAO).
// ---------------------------------------------------------------------------

/**
 * Valida se uma máquina pode receber início de manutenção.
 * @returns mensagem de erro ou null se pode iniciar.
 */
export function conflitoParaIniciarManutencao(maquina: {
  ativo: boolean | null;
  status: string;
}): string | null {
  if (!maquina.ativo) return 'Máquina inativa';
  if (maquina.status === 'EM_PROCESSO') {
    return 'Não é possível iniciar manutenção em máquina com produção ativa';
  }
  if (maquina.status === 'EM_MANUTENCAO') {
    return 'Não é possível iniciar manutenção em máquina que já está em manutenção';
  }
  return null;
}

// ---------------------------------------------------------------------------
// Fluxo de início (RF3/RF6): validação de agendamento
// ---------------------------------------------------------------------------

/** Valida se um agendamento pode ser iniciado. */
export function conflitoParaIniciarAgendamento(status: string): string | null {
  if (status !== 'AGENDADO') return 'Agendamento não está agendado';
  return null;
}

// ---------------------------------------------------------------------------
// Fluxo de término (RF4/RF5): schema do body + reagendamento
// ---------------------------------------------------------------------------

/** Schema de finalização — reagendamento opcional (discriminated union). */
export const finalizarManutencaoSchema = z.object({
  observacoes: z.string().optional(),
  agendar: z.discriminatedUnion('sim', [
    z.object({ sim: z.literal(true), dataPrevista: z.string().min(1, 'Data é obrigatória') }),
    z.object({ sim: z.literal(false) }),
  ]),
});

/** Valida se uma manutenção pode ser finalizada. */
export function conflitoParaFinalizarManutencao(status: string): string | null {
  if (status !== 'EM_ANDAMENTO') return 'Manutenção não está em andamento';
  return null;
}

/**
 * Valida se a data prevista de reagendamento não está no passado.
 * @returns mensagem de erro ou null se válida.
 */
export function validarDataPrevistaReagendamento(dataIso: string): string | null {
  const data = new Date(dataIso);
  if (Number.isNaN(data.getTime())) return 'Data prevista inválida';
  if (data < new Date()) return 'Data prevista não pode ser no passado';
  return null;
}

// ---------------------------------------------------------------------------
// Fluxo de cancelamento (RF7/RF3 mobile): só AGENDADO pode ser cancelado
// ---------------------------------------------------------------------------

/** Valida se um agendamento pode ser cancelado. */
export function conflitoParaCancelarAgendamento(status: string): string | null {
  if (status !== 'AGENDADO') return 'Apenas agendamentos com status AGENDADO podem ser cancelados';
  return null;
}

// ---------------------------------------------------------------------------
// Rótulos exibíveis (evita duplicação de strings em telas/APIs)
// ---------------------------------------------------------------------------

export const PERIODICIDADE_LABEL: Record<string, string> = {
  EVENTUAL: 'Eventual',
  PERIODICA: 'Periódica',
};

export const STATUS_MANUTENCAO_LABEL: Record<StatusManutencao, string> = {
  EM_ANDAMENTO: 'Em Andamento',
  CONCLUIDA: 'Concluída',
  CANCELADA: 'Cancelada',
};

export const STATUS_AGENDAMENTO_LABEL: Record<StatusAgendamento, string> = {
  AGENDADO: 'Agendado',
  EM_ANDAMENTO: 'Em Andamento',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
};