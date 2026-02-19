// src/lib/db/schema/motivos-cancelamento.ts
import { pgTable, uuid, varchar, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

export const motivosCancelamento = pgTable('motivos_cancelamento', {
  id: uuid('id').primaryKey().defaultRandom(),
  codigo: varchar('codigo', { length: 10 }).notNull().unique(),
  descricao: text('descricao').notNull(),
  ativo: boolean('ativo').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const insertMotivoCancelamentoSchema = createInsertSchema(motivosCancelamento, {
  codigo: z.string().min(1, 'Código é obrigatório').max(10),
  descricao: z.string().min(3, 'Descrição deve ter no mínimo 3 caracteres'),
  ativo: z.boolean().default(true),
});

export const selectMotivoCancelamentoSchema = createSelectSchema(motivosCancelamento);

export type MotivoCancelamento = z.infer<typeof selectMotivoCancelamentoSchema>;
export type NewMotivoCancelamento = z.infer<typeof insertMotivoCancelamentoSchema>;