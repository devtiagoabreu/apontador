// src/lib/db/schema/areas.ts
import { pgTable, uuid, varchar, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

export const areas = pgTable('areas', {
  id: uuid('id').primaryKey().defaultRandom(),
  nome: varchar('nome', { length: 100 }).notNull().unique(),
  descricao: text('descricao'),
  ativo: boolean('ativo').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Schemas Zod para validação
export const insertAreaSchema = createInsertSchema(areas, {
  nome: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres').max(100),
  descricao: z.string().optional(),
  ativo: z.boolean().default(true),
});

export const selectAreaSchema = createSelectSchema(areas);

// Types
export type Area = z.infer<typeof selectAreaSchema>;
export type NewArea = z.infer<typeof insertAreaSchema>;