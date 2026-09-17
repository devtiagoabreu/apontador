// src/lib/db/schema/manutencoes.ts
import { pgTable, uuid, varchar, text, timestamp, AnyPgColumn } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { maquinas } from './maquinas';
import { usuarios } from './usuarios';
import { tiposManutencao } from './tipos-manutencao';
import { atividadesManutencao } from './atividades-manutencao';
import { agendamentosManutencao } from './agendamentos-manutencao';

export const manutencoes = pgTable('manutencoes', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Onde?
  maquinaId: uuid('maquina_id').references(() => maquinas.id).notNull(),

  // Quem?
  operadorInicioId: uuid('operador_inicio_id').references(() => usuarios.id).notNull(),
  operadorFimId: uuid('operador_fim_id').references(() => usuarios.id),

  // O quê?
  tipoManutencaoId: uuid('tipo_manutencao_id').references(() => tiposManutencao.id).notNull(),
  atividadeManutencaoId: uuid('atividade_manutencao_id')
    .references(() => atividadesManutencao.id)
    .notNull(),
  periodicidade: varchar('periodicidade', { length: 10 }).notNull(),

  // Quando?
  dataInicio: timestamp('data_inicio').notNull().defaultNow(),
  dataFim: timestamp('data_fim'),

  // Controle
  observacoes: text('observacoes'),
  status: varchar('status', { length: 20 }).notNull().default('EM_ANDAMENTO'),

  // Origem (quando iniciado por agendamento)
  agendamentoId: uuid('agendamento_id').references((): AnyPgColumn => agendamentosManutencao.id),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const insertManutencaoSchema = createInsertSchema(manutencoes, {
  maquinaId: z.string().uuid('Máquina inválida'),
  operadorInicioId: z.string().uuid('Operador inválido'),
  operadorFimId: z.string().uuid('Operador inválido').optional(),
  tipoManutencaoId: z.string().uuid('Tipo de manutenção inválido'),
  atividadeManutencaoId: z.string().uuid('Atividade de manutenção inválida'),
  periodicidade: z.enum(['EVENTUAL', 'PERIODICA'], {
    errorMap: () => ({ message: 'Periodicidade inválida' }),
  }),
  dataInicio: z.date().optional(),
  dataFim: z.date().optional(),
  observacoes: z.string().optional(),
  status: z.enum(['EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA']).default('EM_ANDAMENTO'),
  agendamentoId: z.string().uuid('Agendamento inválido').optional(),
});

export const selectManutencaoSchema = createSelectSchema(manutencoes);

export type Manutencao = z.infer<typeof selectManutencaoSchema>;
export type NewManutencao = z.infer<typeof insertManutencaoSchema>;