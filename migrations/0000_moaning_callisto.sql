CREATE TABLE IF NOT EXISTS "apontamentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"op_id" integer NOT NULL,
	"maquina_id" uuid NOT NULL,
	"produto_id" uuid,
	"estagio_id" uuid,
	"operador_inicio_id" uuid NOT NULL,
	"operador_fim_id" uuid,
	"metragem_processada" numeric(10, 2),
	"data_inicio" timestamp NOT NULL,
	"data_fim" timestamp NOT NULL,
	"status" varchar(20) DEFAULT 'EM_ANDAMENTO' NOT NULL,
	"motivo_parada_id" uuid,
	"inicio_parada" timestamp,
	"fim_parada" timestamp,
	"observacoes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "areas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" varchar(100) NOT NULL,
	"descricao" text,
	"ativo" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "areas_nome_unique" UNIQUE("nome")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "estagios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" varchar(2) NOT NULL,
	"nome" varchar(50) NOT NULL,
	"ordem" integer NOT NULL,
	"descricao" text,
	"ativo" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "estagios_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "setores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" varchar(100) NOT NULL,
	"area_id" uuid NOT NULL,
	"descricao" text,
	"ativo" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "maquinas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" varchar(100) NOT NULL,
	"codigo" varchar(20) NOT NULL,
	"qr_code" text,
	"status" varchar(20) DEFAULT 'DISPONIVEL' NOT NULL,
	"ativo" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "maquinas_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "maquina_setor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"maquina_id" uuid NOT NULL,
	"setor_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "usuarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" varchar(100) NOT NULL,
	"matricula" varchar(20) NOT NULL,
	"nivel" varchar(10) DEFAULT 'OPERADOR' NOT NULL,
	"qr_code" text,
	"senha" varchar(255),
	"ativo" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "usuarios_matricula_unique" UNIQUE("matricula")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "produtos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" varchar(50) NOT NULL,
	"nome" varchar(200) NOT NULL,
	"um" varchar(10) NOT NULL,
	"nivel" varchar(10),
	"grupo" varchar(20),
	"sub" varchar(20),
	"item" varchar(20),
	"parametros_eficiencia" jsonb,
	"ativo" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "produtos_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "motivos_parada" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" varchar(10) NOT NULL,
	"descricao" text NOT NULL,
	"ativo" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "motivos_parada_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "motivos_cancelamento" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" varchar(10) NOT NULL,
	"descricao" text NOT NULL,
	"ativo" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "motivos_cancelamento_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ops" (
	"op" integer PRIMARY KEY NOT NULL,
	"produto" varchar(100) NOT NULL,
	"deposito_final" varchar(100),
	"pecas_vinculadas" varchar(50),
	"qtde_programado" numeric(10, 2),
	"qtde_carregado" numeric(10, 2),
	"qtde_produzida" numeric(10, 2) DEFAULT '0',
	"calculo_quebra" numeric(10, 2),
	"obs" text,
	"um" varchar(10),
	"narrativa" text,
	"nivel" varchar(10),
	"grupo" varchar(20),
	"sub" varchar(20),
	"item" varchar(20),
	"produto_id" uuid,
	"cod_estagio_atual" varchar(2) DEFAULT '00',
	"estagio_atual" varchar(50) DEFAULT 'NENHUM',
	"cod_maquina_atual" varchar(4) DEFAULT '00',
	"maquina_atual" varchar(50) DEFAULT 'NENHUMA',
	"cod_motivo_cancelamento" varchar(2) DEFAULT '00',
	"motivo_cancelamento" varchar(50) DEFAULT 'NENHUM',
	"data_cancelamento" timestamp,
	"usuario_cancelamento_id" uuid,
	"data_importacao" timestamp DEFAULT now(),
	"data_ultimo_apontamento" timestamp,
	"status" varchar(20) DEFAULT 'ABERTA',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "apontamentos" ADD CONSTRAINT "apontamentos_op_id_ops_op_fk" FOREIGN KEY ("op_id") REFERENCES "ops"("op") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "apontamentos" ADD CONSTRAINT "apontamentos_maquina_id_maquinas_id_fk" FOREIGN KEY ("maquina_id") REFERENCES "maquinas"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "apontamentos" ADD CONSTRAINT "apontamentos_produto_id_produtos_id_fk" FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "apontamentos" ADD CONSTRAINT "apontamentos_estagio_id_estagios_id_fk" FOREIGN KEY ("estagio_id") REFERENCES "estagios"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "apontamentos" ADD CONSTRAINT "apontamentos_operador_inicio_id_usuarios_id_fk" FOREIGN KEY ("operador_inicio_id") REFERENCES "usuarios"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "apontamentos" ADD CONSTRAINT "apontamentos_operador_fim_id_usuarios_id_fk" FOREIGN KEY ("operador_fim_id") REFERENCES "usuarios"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "apontamentos" ADD CONSTRAINT "apontamentos_motivo_parada_id_motivos_parada_id_fk" FOREIGN KEY ("motivo_parada_id") REFERENCES "motivos_parada"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "setores" ADD CONSTRAINT "setores_area_id_areas_id_fk" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "maquina_setor" ADD CONSTRAINT "maquina_setor_maquina_id_maquinas_id_fk" FOREIGN KEY ("maquina_id") REFERENCES "maquinas"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "maquina_setor" ADD CONSTRAINT "maquina_setor_setor_id_setores_id_fk" FOREIGN KEY ("setor_id") REFERENCES "setores"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ops" ADD CONSTRAINT "ops_produto_id_produtos_id_fk" FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ops" ADD CONSTRAINT "ops_usuario_cancelamento_id_usuarios_id_fk" FOREIGN KEY ("usuario_cancelamento_id") REFERENCES "usuarios"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
