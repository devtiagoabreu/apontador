import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const configuracoes = pgTable('configuracoes', {
  chave: text('chave').primaryKey(),
  valor: text('valor'),
  atualizadoEm: timestamp('atualizado_em').defaultNow().notNull(),
});
