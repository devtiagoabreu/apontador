// src/lib/db/schema/agendamentos-manutencao.ts
import { pgTable, uuid, varchar, text, timestamp, AnyPgColumn } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { maquinas } from './maquinas';
import { tiposManutencao } from './tipos-manutencao';
import { atividadesManutencao } from './atividades-manutencao';
import { manutencoes } from './manutencoes';

export const agendamentosManutencao = pgTable('agendamentos_manutencao', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Onde?
  maquinaId: uuid('maquina_id').references(() => maquinas.id).notNull(),

  // O quê?
  tipoManutencaoId: uuid('tipo_manutencao_id').references(() => tiposManutencao.id).notNull(),
  atividadeManutencaoId: uuid('atividade_manutencao_id')
    .references(() => atividadesManutencao.id)
    .notNull(),
  periodicidade: varchar('periodicidade', { length: 10 }).notNull(),

  // Quando?
  dataPrevista: timestamp('data_prevista').notNull(),

  // Controle
  status: varchar('status', { length: 20 }).notNull().default('AGENDADO'),
  // Apontamento que gerou (opcional)
  origemManutencaoId: uuid('origem_manutencao_id').references((): AnyPgColumn => manutencoes.id),
  // Motivo de cancelamento, por exemplo
  observacoes: text('observacoes'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const insertAgendamentoManutencaoSchema = createInsertSchema(agendamentosManutencao, {
  maquinaId: z.string().uuid('Máquina inválida'),
  tipoManutencaoId: z.string().uuid('Tipo de manutenção inválido'),
  atividadeManutencaoId: z.string().uuid('Atividade de manutenção inválida'),
  periodicidade: z.enum(['EVENTUAL', 'PERIODICA'], {
    errorMap: () => ({ message: 'Periodicidade inválida' }),
  }),
  dataPrevista: z.date({ errorMap: () => ({ message: 'Data prevista inválida' }) }),
  status: z.enum(['AGENDADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO']).default('AGENDADO'),
  origemManutencaoId: z.string().uuid('Apontamento inválido').optional(),
  observacoes: z.string().optional(),
});

export const selectAgendamentoManutencaoSchema = createSelectSchema(agendamentosManutencao);

export type AgendamentoManutencao = z.infer<typeof selectAgendamentoManutencaoSchema>;
export type NewAgendamentoManutencao = z.infer<typeof insertAgendamentoManutencaoSchema>;