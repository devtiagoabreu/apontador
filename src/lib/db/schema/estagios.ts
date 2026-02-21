import { pgTable, uuid, varchar, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

export const estagios = pgTable('estagios', {
  id: uuid('id').primaryKey().defaultRandom(),
  codigo: varchar('codigo', { length: 2 }).notNull().unique(),
  nome: varchar('nome', { length: 50 }).notNull(),
  ordem: integer('ordem').notNull(),
  descricao: text('descricao'),
  // NOVOS CAMPOS
  cor: varchar('cor', { length: 7 }).default('#3b82f6'), // Código HEX da cor
  mostrarNoKanban: boolean('mostrar_no_kanban').default(true), // Se deve aparecer no Kanban
  // Campos existentes
  ativo: boolean('ativo').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const insertEstagioSchema = createInsertSchema(estagios, {
  codigo: z.string().length(2, 'Código deve ter 2 caracteres'),
  nome: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres').max(50),
  ordem: z.number().int().positive('Ordem deve ser um número positivo'),
  descricao: z.string().optional(),
  // NOVAS VALIDAÇÕES
  cor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve estar no formato HEX (#RRGGBB)').default('#3b82f6'),
  mostrarNoKanban: z.boolean().default(true),
  ativo: z.boolean().default(true),
});

export const selectEstagioSchema = createSelectSchema(estagios);

export type Estagio = z.infer<typeof selectEstagioSchema>;
export type NewEstagio = z.infer<typeof insertEstagioSchema>;