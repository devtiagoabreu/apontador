// src/lib/db/schema/produtos.ts
import { pgTable, uuid, varchar, text, jsonb, boolean, timestamp } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

export const produtos = pgTable('produtos', {
  id: uuid('id').primaryKey().defaultRandom(),
  codigo: varchar('codigo', { length: 50 }).notNull().unique(),
  nome: varchar('nome', { length: 200 }).notNull(),
  um: varchar('um', { length: 10 }).notNull(), // Unidade de medida
  nivel: varchar('nivel', { length: 10 }),
  grupo: varchar('grupo', { length: 20 }),
  sub: varchar('sub', { length: 20 }),
  item: varchar('item', { length: 20 }),
  parametrosEficiencia: jsonb('parametros_eficiencia'), // Parâmetros por estágio
  ativo: boolean('ativo').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const insertProdutoSchema = createInsertSchema(produtos, {
  codigo: z.string().min(1, 'Código é obrigatório').max(50),
  nome: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres').max(200),
  um: z.string().min(1, 'Unidade de medida é obrigatória').max(10),
  nivel: z.string().optional(),
  grupo: z.string().optional(),
  sub: z.string().optional(),
  item: z.string().optional(),
  parametrosEficiencia: z.record(z.any()).optional(),
  ativo: z.boolean().default(true),
});

export const selectProdutoSchema = createSelectSchema(produtos);

export type Produto = z.infer<typeof selectProdutoSchema>;
export type NewProduto = z.infer<typeof insertProdutoSchema>;