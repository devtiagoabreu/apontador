// src/lib/db/schema/maquina-setor.ts
import { pgTable, uuid, timestamp } from 'drizzle-orm/pg-core';
import { maquinas } from './maquinas';
import { setores } from './setores';

export const maquinaSetor = pgTable('maquina_setor', {
  id: uuid('id').primaryKey().defaultRandom(),
  maquinaId: uuid('maquina_id').references(() => maquinas.id).notNull(),
  setorId: uuid('setor_id').references(() => setores.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Chave composta única para evitar duplicatas
export const uniqueMaquinaSetor = {
  maquinaId: maquinaSetor.maquinaId,
  setorId: maquinaSetor.setorId,
};

export type MaquinaSetor = typeof maquinaSetor.$inferSelect;
export type NewMaquinaSetor = typeof maquinaSetor.$inferInsert;