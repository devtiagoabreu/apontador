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

// ---------------------------------------------------------------------------
// Prioridade de manutenção (0-3) — padrão Odoo simplificado
// ---------------------------------------------------------------------------

export const PRIORIDADE_LABEL: Record<number, string> = {
  0: 'Baixa',
  1: 'Normal',
  2: 'Alta',
  3: 'Urgente',
};

export const PRIORIDADE_OPCOES = [
  { value: 0, label: '0 - Baixa' },
  { value: 1, label: '1 - Normal' },
  { value: 2, label: '2 - Alta' },
  { value: 3, label: '3 - Urgente' },
];

export function validarPrioridade(prioridade: unknown): string | null {
  if (typeof prioridade !== 'number' || !Number.isInteger(prioridade)) {
    return 'Prioridade inválida';
  }
  if (prioridade < 0 || prioridade > 3) {
    return 'Prioridade deve estar entre 0 e 3';
  }
  return null;
}

// ---------------------------------------------------------------------------
// Plano por intervalo em dias (Backlog): sugere a próxima data no
// reagendamento a partir da data de fim + intervaloEmDias do tipo.
// ---------------------------------------------------------------------------

/**
 * Calcula a data prevista sugerida para a próxima manutenção.
 * @param fim data de fim da manutenção (dataInicio se não houver).
 * @param intervaloEmDias intervalo do tipo de manutenção (pode ser null).
 * @returns data ISO (yyyy-mm-dd) ou null se não houver intervalo definido.
 */
export function sugerirDataProximaManutencao(
  fim: Date,
  intervaloEmDias: number | null | undefined
): string | null {
  if (!intervaloEmDias || intervaloEmDias <= 0) return null;
  const sugestao = new Date(fim);
  sugestao.setDate(sugestao.getDate() + intervaloEmDias);
  // Nunca sugere data no passado
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  if (sugestao < hoje) return hoje.toISOString().split('T')[0];
  return sugestao.toISOString().split('T')[0];
}

// ---------------------------------------------------------------------------
// Criação manual de agendamento (Backlog — dashboard ADM)
// ---------------------------------------------------------------------------

/** Valida se uma máquina pode receber um agendamento manual. */
export function conflitoParaCriarAgendamento(maquina: {
  ativo: boolean | null;
  status: string;
}): string | null {
  if (!maquina.ativo) return 'Máquina inativa';
  return null;
}

/**
 * Valida se a data prevista de um agendamento manual não está no passado.
 * @returns mensagem de erro ou null se válida.
 */
export function validarDataPrevistaAgendamento(dataIso: string): string | null {
  const data = new Date(dataIso);
  if (Number.isNaN(data.getTime())) return 'Data prevista inválida';
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  if (data < hoje) return 'Data prevista não pode ser no passado';
  return null;
}