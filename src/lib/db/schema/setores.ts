// src/lib/db/schema/setores.ts
import { pgTable, uuid, varchar, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { areas } from './areas';

export const setores = pgTable('setores', {
  id: uuid('id').primaryKey().defaultRandom(),
  nome: varchar('nome', { length: 100 }).notNull(),
  areaId: uuid('area_id').references(() => areas.id).notNull(),
  descricao: text('descricao'),
  ativo: boolean('ativo').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const insertSetorSchema = createInsertSchema(setores, {
  nome: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres').max(100),
  areaId: z.string().uuid('Área inválida'),
  descricao: z.string().optional(),
  ativo: z.boolean().default(true),
});

export const selectSetorSchema = createSelectSchema(setores);

export type Setor = z.infer<typeof selectSetorSchema>;
export type NewSetor = z.infer<typeof insertSetorSchema>;