// src/lib/db/schema/apontamentos.ts
import { pgTable, uuid, integer, decimal, timestamp, varchar, text } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { ops } from './ops';
import { maquinas } from './maquinas';
import { produtos } from './produtos';
import { estagios } from './estagios';
import { usuarios } from './usuarios';
import { motivosParada } from './motivos-parada';

export type StatusApontamento = 'EM_ANDAMENTO' | 'CONCLUIDO' | 'CANCELADO';

export const apontamentos = pgTable('apontamentos', {
  id: uuid('id').primaryKey().defaultRandom(),
  opId: integer('op_id').references(() => ops.op).notNull(),
  maquinaId: uuid('maquina_id').references(() => maquinas.id).notNull(),
  produtoId: uuid('produto_id').references(() => produtos.id),
  estagioId: uuid('estagio_id').references(() => estagios.id),
  operadorInicioId: uuid('operador_inicio_id').references(() => usuarios.id).notNull(),
  operadorFimId: uuid('operador_fim_id').references(() => usuarios.id),
  metragemProcessada: decimal('metragem_processada', { precision: 10, scale: 2 }),
  dataInicio: timestamp('data_inicio').notNull(),
  dataFim: timestamp('data_fim').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('EM_ANDAMENTO'),
  motivoParadaId: uuid('motivo_parada_id').references(() => motivosParada.id),
  inicioParada: timestamp('inicio_parada'),
  fimParada: timestamp('fim_parada'),
  observacoes: text('observacoes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const insertApontamentoSchema = createInsertSchema(apontamentos, {
  opId: z.number().int().positive(),
  maquinaId: z.string().uuid(),
  metragemProcessada: z.number().optional(),
  dataInicio: z.date(),
  dataFim: z.date(),
  status: z.enum(['EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO']).default('EM_ANDAMENTO'),
  observacoes: z.string().optional(),
}).refine((data) => data.dataFim >= data.dataInicio, {
  message: "Data fim não pode ser menor que data início",
  path: ["dataFim"],
});

export const selectApontamentoSchema = createSelectSchema(apontamentos);

export type Apontamento = z.infer<typeof selectApontamentoSchema>;
export type NewApontamento = z.infer<typeof insertApontamentoSchema>;