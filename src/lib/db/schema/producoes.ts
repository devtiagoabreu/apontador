import { pgTable, uuid, integer, decimal, timestamp, text, boolean } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { ops } from './ops';
import { maquinas } from './maquinas';
import { usuarios } from './usuarios';
import { estagios } from './estagios';

export const producoesTable = pgTable('producoes', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // O quê?
  opId: integer('op_id').references(() => ops.op).notNull(),
  
  // Onde?
  maquinaId: uuid('maquina_id').references(() => maquinas.id).notNull(),
  
  // Quem?
  operadorInicioId: uuid('operador_inicio_id').references(() => usuarios.id).notNull(),
  operadorFimId: uuid('operador_fim_id').references(() => usuarios.id),
  
  // Etapa
  estagioId: uuid('estagio_id').references(() => estagios.id).notNull(),
  
  // Quando?
  dataInicio: timestamp('data_inicio').notNull(),
  dataFim: timestamp('data_fim'),
  
  // Quanto?
  metragemProgramada: decimal('metragem_programada', { precision: 10, scale: 2 }).notNull(),
  metragemProcessada: decimal('metragem_processada', { precision: 10, scale: 2 }),
  
  // Controle
  isReprocesso: boolean('is_reprocesso').default(false),
  observacoes: text('observacoes'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// TODOS os nomes são únicos e não conflitam
export const insertProducaoRecordSchema = createInsertSchema(producoesTable, {
  opId: z.number().int().positive('OP é obrigatória'),
  maquinaId: z.string().uuid('Máquina inválida'),
  operadorInicioId: z.string().uuid('Operador inválido'),
  estagioId: z.string().uuid('Estágio inválido'),
  dataInicio: z.date(),
  metragemProgramada: z.number().positive('Metragem programada inválida'),
  metragemProcessada: z.number().optional(),
  isReprocesso: z.boolean().default(false),
  observacoes: z.string().optional(),
});

export const selectProducaoRecordSchema = createSelectSchema(producoesTable);

export type ProducaoRecord = z.infer<typeof selectProducaoRecordSchema>;
export type NewProducaoRecord = z.infer<typeof insertProducaoRecordSchema>;