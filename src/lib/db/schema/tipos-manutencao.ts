// src/lib/db/schema/tipos-manutencao.ts
import { pgTable, uuid, varchar, boolean, timestamp } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

export const tiposManutencao = pgTable('tipos_manutencao', {
  id: uuid('id').primaryKey().defaultRandom(),
  codigo: varchar('codigo', { length: 20 }).notNull().unique(),
  nome: varchar('nome', { length: 100 }).notNull(),
  ativo: boolean('ativo').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const insertTipoManutencaoSchema = createInsertSchema(tiposManutencao, {
  codigo: z.string().min(1, 'Código é obrigatório').max(20),
  nome: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres').max(100),
  ativo: z.boolean().default(true),
});

export const selectTipoManutencaoSchema = createSelectSchema(tiposManutencao);

export type TipoManutencao = z.infer<typeof selectTipoManutencaoSchema>;
export type NewTipoManutencao = z.infer<typeof insertTipoManutencaoSchema>;