// src/lib/db/schema/atividades-manutencao.ts
import { pgTable, uuid, varchar, boolean, timestamp } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

export const atividadesManutencao = pgTable('atividades_manutencao', {
  id: uuid('id').primaryKey().defaultRandom(),
  codigo: varchar('codigo', { length: 20 }).notNull().unique(),
  nome: varchar('nome', { length: 100 }).notNull(),
  ativo: boolean('ativo').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const insertAtividadeManutencaoSchema = createInsertSchema(atividadesManutencao, {
  codigo: z.string().min(1, 'Código é obrigatório').max(20),
  nome: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres').max(100),
  ativo: z.boolean().default(true),
});

export const selectAtividadeManutencaoSchema = createSelectSchema(atividadesManutencao);

export type AtividadeManutencao = z.infer<typeof selectAtividadeManutencaoSchema>;
export type NewAtividadeManutencao = z.infer<typeof insertAtividadeManutencaoSchema>;