// src/lib/db/schema/motivos-parada.ts
import { pgTable, uuid, varchar, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

export const motivosParada = pgTable('motivos_parada', {
  id: uuid('id').primaryKey().defaultRandom(),
  codigo: varchar('codigo', { length: 10 }).notNull().unique(),
  descricao: text('descricao').notNull(),
  ativo: boolean('ativo').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const insertMotivoParadaSchema = createInsertSchema(motivosParada, {
  codigo: z.string().min(1, 'Código é obrigatório').max(10),
  descricao: z.string().min(3, 'Descrição deve ter no mínimo 3 caracteres'),
  ativo: z.boolean().default(true),
});

export const selectMotivoParadaSchema = createSelectSchema(motivosParada);

export type MotivoParada = z.infer<typeof selectMotivoParadaSchema>;
export type NewMotivoParada = z.infer<typeof insertMotivoParadaSchema>;