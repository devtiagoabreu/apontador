import { pgTable, uuid, varchar, text, timestamp, integer } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { maquinas } from './maquinas';
import { usuarios } from './usuarios';
import { motivosParada } from './motivos-parada';
import { ops } from './ops';

export const paradasMaquina = pgTable('paradas_maquina', {
  id: uuid('id').primaryKey().defaultRandom(),
  maquinaId: uuid('maquina_id').references(() => maquinas.id).notNull(),
  operadorId: uuid('operador_id').references(() => usuarios.id).notNull(),
  motivoParadaId: uuid('motivo_parada_id').references(() => motivosParada.id).notNull(),
  observacoes: text('observacoes'),
  dataInicio: timestamp('data_inicio').notNull(),
  dataFim: timestamp('data_fim'),
  opId: integer('op_id').references(() => ops.op),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// RENOMEADO para evitar conflito
export const insertParadaMaquinaSchema = createInsertSchema(paradasMaquina, {
  maquinaId: z.string().uuid('Máquina inválida'),
  operadorId: z.string().uuid('Operador inválido'),
  motivoParadaId: z.string().uuid('Motivo inválido'),
  dataInicio: z.date(),
  dataFim: z.date().optional(),
  opId: z.number().int().positive().optional(),
});

export const selectParadaMaquinaSchema = createSelectSchema(paradasMaquina);

export type ParadaMaquina = z.infer<typeof selectParadaMaquinaSchema>;
export type NewParadaMaquina = z.infer<typeof insertParadaMaquinaSchema>;