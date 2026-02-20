import { pgTable, uuid, varchar, text, jsonb, boolean, timestamp, decimal, integer } from 'drizzle-orm/pg-core';

export const produtos = pgTable('produtos', {
  id: uuid('id').primaryKey().defaultRandom(),
  codigo: varchar('codigo', { length: 50 }).notNull().unique(),
  nome: varchar('nome', { length: 200 }).notNull(),
  um: varchar('um', { length: 10 }).notNull(),
  
  // Campos do Systêxtil (mantidos)
  nivel: varchar('nivel', { length: 10 }),
  grupo: varchar('grupo', { length: 20 }),
  sub: varchar('sub', { length: 20 }),
  item: varchar('item', { length: 20 }),
  
  // ⚠️ NOVOS CAMPOS - TODOS COM DEFAULT PARA NÃO QUEBRAR
  // Composição do tecido (em JSON para flexibilidade)
  composicao: jsonb('composicao').default({
    algodao: { percentual: 0, fio: '' },
    poliester: { percentual: 0, fio: '' },
    elastano: { percentual: 0, fio: '' },
    linho: { percentual: 0, fio: '' },
    viscoso: { percentual: 0, fio: '' },
    acrilico: { percentual: 0, fio: '' }
  }),
  
  // Dimensões físicas
  largura: decimal('largura', { precision: 10, scale: 2 }).default('0'),
  gramaturaLinear: decimal('gramatura_linear', { precision: 10, scale: 2 }).default('0'),
  gramaturaM2: decimal('gramatura_m2', { precision: 10, scale: 2 }).default('0'),
  
  // Estrutura do tecido
  tipoTecido: varchar('tipo_tecido', { length: 20 }).default('PLANO'),
  ligamento: varchar('ligamento', { length: 50 }).default('TELA'),
  fiosUrdume: integer('fios_urdume').default(0),
  fiosTrama: integer('fios_trama').default(0),
  
  // Classificação automática
  classificacaoPeso: varchar('classificacao_peso', { length: 10 }).default('MEDIO'),
  
  // Parâmetros de eficiência (mantido com estrutura expandida)
  parametrosEficiencia: jsonb('parametros_eficiencia').default({
    preparacao: { tempoPadrao: 0, rendimento: 100, velocidade: 0 },
    tingimento: { tempoPadrao: 0, rendimento: 100, velocidade: 0 },
    alvejamento: { tempoPadrao: 0, rendimento: 100, velocidade: 0 },
    secagem: { tempoPadrao: 0, rendimento: 100, velocidade: 0 },
    estamparia: { tempoPadrao: 0, rendimento: 100, velocidade: 0 },
    acabamento: { tempoPadrao: 0, rendimento: 100, velocidade: 0 },
    revisao: { tempoPadrao: 0, rendimento: 100, velocidade: 0 },
  }),
  
  // Metas
  metaDiaria: decimal('meta_diaria', { precision: 10, scale: 2 }),
  metaMensal: decimal('meta_mensal', { precision: 10, scale: 2 }),
  
  ativo: boolean('ativo').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Produto = typeof produtos.$inferSelect;
export type NewProduto = typeof produtos.$inferInsert;