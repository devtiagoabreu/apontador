// src/lib/db/schema/producoes-avulsas.ts
import { pgTable, uuid, decimal, timestamp, varchar, text } from 'drizzle-orm/pg-core';
import { maquinas } from './maquinas';
import { usuarios } from './usuarios';
import { produtos } from './produtos';
import { estagios } from './estagios';

export const producoesAvulsas = pgTable('producoes_avulsas', {
  id: uuid('id').primaryKey().defaultRandom(), // ID automático do apontamento
  maquinaId: uuid('maquina_id').references(() => maquinas.id).notNull(),
  
  // Rastreabilidade dupla conforme solicitado
  operadorInicioId: uuid('operador_inicio_id').references(() => usuarios.id).notNull(),
  operadorFimId: uuid('operador_fim_id').references(() => usuarios.id),
  
  produtoId: uuid('produto_id').references(() => produtos.id).notNull(),
  estagioId: uuid('estagio_id').references(() => estagios.id).notNull(),
  
  dataInicio: timestamp('data_inicio').defaultNow().notNull(),
  dataFim: timestamp('data_fim'),
  
  metragem: decimal('metragem', { precision: 10, scale: 2 }),
  status: varchar('status', { length: 20 }).default('EM_ANDAMENTO'),
  observacoes: text('observacoes'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});