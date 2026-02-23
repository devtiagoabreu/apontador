import { pgTable, uuid, integer, decimal, timestamp, varchar, text, boolean } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { ops } from './ops';
import { maquinas } from './maquinas';
import { usuarios } from './usuarios';
import { motivosParada } from './motivos-parada';
import { estagios } from './estagios';

export type TipoApontamento = 'PRODUCAO' | 'PARADA';
export type StatusApontamento = 'EM_ANDAMENTO' | 'CONCLUIDO' | 'CANCELADO';

export const apontamentos = pgTable('apontamentos', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Tipo (define qual tipo de apontamento)
  tipo: varchar('tipo', { length: 10 }).notNull(),
  
  // Máquina (sempre presente em qualquer apontamento)
  maquinaId: uuid('maquina_id').references(() => maquinas.id).notNull(),
  
  // Operadores
  operadorInicioId: uuid('operador_inicio_id').references(() => usuarios.id).notNull(),
  operadorFimId: uuid('operador_fim_id').references(() => usuarios.id),
  
  // Tempo
  dataInicio: timestamp('data_inicio').notNull(),
  dataFim: timestamp('data_fim').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('EM_ANDAMENTO'),
  
  // Campos de PRODUÇÃO (usados apenas quando tipo = 'PRODUCAO')
  opId: integer('op_id').references(() => ops.op),
  metragemProcessada: decimal('metragem_processada', { precision: 10, scale: 2 }),
  estagioId: uuid('estagio_id').references(() => estagios.id),
  isReprocesso: boolean('is_reprocesso').default(false), // NOVO CAMPO
  
  // Campos de PARADA (usados apenas quando tipo = 'PARADA')
  motivoParadaId: uuid('motivo_parada_id').references(() => motivosParada.id),
  observacoes: text('observacoes'),
  
  // Controle
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Schema base para produção
export const insertProducaoSchema = createInsertSchema(apontamentos, {
  tipo: z.literal('PRODUCAO'),
  opId: z.number().int().positive('OP é obrigatória'),
  maquinaId: z.string().uuid('Máquina inválida'),
  operadorInicioId: z.string().uuid('Operador inválido'),
  dataInicio: z.date(),
  dataFim: z.date(),
  metragemProcessada: z.number().optional(),
  estagioId: z.string().uuid('Estágio inválido'),
  isReprocesso: z.boolean().default(false),
}).omit({
  motivoParadaId: true,
  observacoes: true,
  operadorFimId: true,
});

// Schema base para parada
export const insertParadaSchema = createInsertSchema(apontamentos, {
  tipo: z.literal('PARADA'),
  maquinaId: z.string().uuid('Máquina inválida'),
  motivoParadaId: z.string().uuid('Motivo é obrigatório'),
  operadorInicioId: z.string().uuid('Operador inválido'),
  dataInicio: z.date(),
  dataFim: z.date(),
  opId: z.number().int().positive().optional(), // OPCIONAL! Pode ter OP vinculada
  observacoes: z.string().optional(),
}).omit({
  metragemProcessada: true,
  estagioId: true,
  isReprocesso: true,
  operadorFimId: true,
});

export const selectApontamentoSchema = createSelectSchema(apontamentos);

export type Apontamento = z.infer<typeof selectApontamentoSchema>;
export type NewProducao = z.infer<typeof insertProducaoSchema>;
export type NewParada = z.infer<typeof insertParadaSchema>;