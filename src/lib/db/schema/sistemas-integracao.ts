import { pgTable, uuid, text, boolean, timestamp } from 'drizzle-orm/pg-core';

export const sistemasIntegracao = pgTable('sistemas_integracao', {
  id: uuid('id').primaryKey().defaultRandom(),
  nome: text('nome').notNull(),
  tokenUrl: text('token_url'),
  clientId: text('client_id'),
  clientSecret: text('client_secret'),
  ativo: boolean('ativo').default(true).notNull(),
  criadoEm: timestamp('criado_em').defaultNow().notNull(),
});
