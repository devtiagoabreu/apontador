// src/lib/db/schema/ops.ts
import { pgTable, integer, varchar, text, decimal, timestamp, uuid } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { usuarios } from './usuarios';
import { produtos } from './produtos';

export type StatusOP = 'ABERTA' | 'EM_ANDAMENTO' | 'FINALIZADA' | 'CANCELADA';

export const ops = pgTable('ops', {
  // Campos importados da API
  op: integer('op').primaryKey(),
  produto: varchar('produto', { length: 100 }).notNull(),
  depositoFinal: varchar('deposito_final', { length: 100 }),
  pecasVinculadas: varchar('pecas_vinculadas', { length: 50 }),
  qtdeProgramado: decimal('qtde_programado', { precision: 10, scale: 2 }),
  qtdeCarregado: decimal('qtde_carregado', { precision: 10, scale: 2 }),
  qtdeProduzida: decimal('qtde_produzida', { precision: 10, scale: 2 }).default('0'),
  calculoQuebra: decimal('calculo_quebra', { precision: 10, scale: 2 }),
  obs: text('obs'),
  um: varchar('um', { length: 10 }),
  narrativa: text('narrativa'),
  nivel: varchar('nivel', { length: 10 }),
  grupo: varchar('grupo', { length: 20 }),
  sub: varchar('sub', { length: 20 }),
  item: varchar('item', { length: 20 }),
  
  // Campos de controle interno
  produtoId: uuid('produto_id').references(() => produtos.id),
  
  // Campos de estágio atual
  codEstagioAtual: varchar('cod_estagio_atual', { length: 2 }).default('00'),
  estagioAtual: varchar('estagio_atual', { length: 50 }).default('NENHUM'),
  
  // Campos de máquina atual
  codMaquinaAtual: varchar('cod_maquina_atual', { length: 4 }).default('00'),
  maquinaAtual: varchar('maquina_atual', { length: 50 }).default('NENHUMA'),
  
  // Campos de cancelamento
  codMotivoCancelamento: varchar('cod_motivo_cancelamento', { length: 2 }).default('00'),
  motivoCancelamento: varchar('motivo_cancelamento', { length: 50 }).default('NENHUM'),
  dataCancelamento: timestamp('data_cancelamento'),
  usuarioCancelamentoId: uuid('usuario_cancelamento_id').references(() => usuarios.id),
  
  // Campos de controle
  dataImportacao: timestamp('data_importacao').defaultNow(),
  dataUltimoApontamento: timestamp('data_ultimo_apontamento'),
  status: varchar('status', { length: 20 }).default('ABERTA'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const insertOPSchema = createInsertSchema(ops, {
  op: z.number().int().positive(),
  produto: z.string().min(1),
  qtdeProduzida: z.number().optional(),
  codEstagioAtual: z.string().default('00'),
  estagioAtual: z.string().default('NENHUM'),
  codMaquinaAtual: z.string().default('00'),
  maquinaAtual: z.string().default('NENHUMA'),
  codMotivoCancelamento: z.string().default('00'),
  motivoCancelamento: z.string().default('NENHUM'),
  status: z.enum(['ABERTA', 'EM_ANDAMENTO', 'FINALIZADA', 'CANCELADA']).default('ABERTA'),
});

export const selectOPSchema = createSelectSchema(ops);

export type OP = z.infer<typeof selectOPSchema>;
export type NewOP = z.infer<typeof insertOPSchema>;