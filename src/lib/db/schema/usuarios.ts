// src/lib/db/schema/usuarios.ts
import { pgTable, uuid, varchar, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

export type NivelUsuario = 'ADM' | 'OPERADOR';

export const usuarios = pgTable('usuarios', {
  id: uuid('id').primaryKey().defaultRandom(),
  nome: varchar('nome', { length: 100 }).notNull(),
  matricula: varchar('matricula', { length: 20 }).notNull().unique(),
  nivel: varchar('nivel', { length: 10 }).notNull().default('OPERADOR'),
  qrCode: text('qr_code'), // URL ou dados do QR Code para login
  senha: varchar('senha', { length: 255 }), // Apenas para admin (hash)
  ativo: boolean('ativo').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const insertUsuarioSchema = createInsertSchema(usuarios, {
  nome: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres').max(100),
  matricula: z.string().min(1, 'Matrícula é obrigatória').max(20),
  nivel: z.enum(['ADM', 'OPERADOR']).default('OPERADOR'),
  senha: z.string().optional(),
  ativo: z.boolean().default(true),
});

export const selectUsuarioSchema = createSelectSchema(usuarios);

export type Usuario = z.infer<typeof selectUsuarioSchema>;
export type NewUsuario = z.infer<typeof insertUsuarioSchema>;