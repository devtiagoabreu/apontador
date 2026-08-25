import { pgTable, uuid, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { sistemasIntegracao } from './sistemas-integracao';

export const apisIntegracao = pgTable('apis_integracao', {
  id: uuid('id').primaryKey().defaultRandom(),
  sistemaId: uuid('sistema_id').notNull().references(() => sistemasIntegracao.id),
  nome: text('nome').notNull(),
  apiUrl: text('api_url').notNull(),
  metodo: text('metodo').default('GET').notNull(),
  ativa: boolean('ativa').default(true).notNull(),
  criadoEm: timestamp('criado_em').defaultNow().notNull(),
});
