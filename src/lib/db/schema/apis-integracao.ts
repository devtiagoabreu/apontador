import { pgTable, uuid, text, boolean, timestamp } from 'drizzle-orm/pg-core';

export const apisIntegracao = pgTable('apis_integracao', {
  id: uuid('id').primaryKey().defaultRandom(),
  nome: text('nome').notNull(),
  apiUrl: text('api_url').notNull(),
  ativa: boolean('ativa').default(true).notNull(),
  criadoEm: timestamp('criado_em').defaultNow().notNull(),
});
