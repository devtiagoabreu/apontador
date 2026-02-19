// src/lib/db/schema/maquinas.ts
import { pgTable, uuid, varchar, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

export type StatusMaquina = 'DISPONIVEL' | 'EM_PROCESSO' | 'PARADA';

export const maquinas = pgTable('maquinas', {
  id: uuid('id').primaryKey().defaultRandom(),
  nome: varchar('nome', { length: 100 }).notNull(),
  codigo: varchar('codigo', { length: 20 }).notNull().unique(),
  qrCode: text('qr_code'), // URL ou dados do QR Code
  status: varchar('status', { length: 20 }).notNull().default('DISPONIVEL'),
  ativo: boolean('ativo').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const insertMaquinaSchema = createInsertSchema(maquinas, {
  nome: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres').max(100),
  codigo: z.string().min(1, 'Código é obrigatório').max(20),
  status: z.enum(['DISPONIVEL', 'EM_PROCESSO', 'PARADA']).default('DISPONIVEL'),
  ativo: z.boolean().default(true),
});

export const selectMaquinaSchema = createSelectSchema(maquinas);

export type Maquina = z.infer<typeof selectMaquinaSchema>;
export type NewMaquina = z.infer<typeof insertMaquinaSchema>;