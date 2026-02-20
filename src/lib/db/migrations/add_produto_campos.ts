import { db } from '../index';
import { sql } from 'drizzle-orm';

async function migrate() {
  console.log('🔄 Iniciando migração da tabela produtos...');
  
  try {
    // Adicionar colunas uma por uma com verificação
    await db.execute(sql`
      DO $$ 
      BEGIN
        -- Composição
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='produtos' AND column_name='composicao') THEN
          ALTER TABLE produtos ADD COLUMN composicao jsonb DEFAULT '{"algodao":{"percentual":0,"fio":""},"poliester":{"percentual":0,"fio":""},"elastano":{"percentual":0,"fio":""},"linho":{"percentual":0,"fio":""},"viscoso":{"percentual":0,"fio":""},"acrilico":{"percentual":0,"fio":""}}';
        END IF;
        
        -- Largura
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='produtos' AND column_name='largura') THEN
          ALTER TABLE produtos ADD COLUMN largura decimal(10,2) DEFAULT 0;
        END IF;
        
        -- Gramatura linear
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='produtos' AND column_name='gramatura_linear') THEN
          ALTER TABLE produtos ADD COLUMN gramatura_linear decimal(10,2) DEFAULT 0;
        END IF;
        
        -- Gramatura m2
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='produtos' AND column_name='gramatura_m2') THEN
          ALTER TABLE produtos ADD COLUMN gramatura_m2 decimal(10,2) DEFAULT 0;
        END IF;
        
        -- Tipo tecido
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='produtos' AND column_name='tipo_tecido') THEN
          ALTER TABLE produtos ADD COLUMN tipo_tecido varchar(20) DEFAULT 'PLANO';
        END IF;
        
        -- Ligamento
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='produtos' AND column_name='ligamento') THEN
          ALTER TABLE produtos ADD COLUMN ligamento varchar(50) DEFAULT 'TELA';
        END IF;
        
        -- Fios urdume
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='produtos' AND column_name='fios_urdume') THEN
          ALTER TABLE produtos ADD COLUMN fios_urdume integer DEFAULT 0;
        END IF;
        
        -- Fios trama
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='produtos' AND column_name='fios_trama') THEN
          ALTER TABLE produtos ADD COLUMN fios_trama integer DEFAULT 0;
        END IF;
        
        -- Classificação peso
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='produtos' AND column_name='classificacao_peso') THEN
          ALTER TABLE produtos ADD COLUMN classificacao_peso varchar(10) DEFAULT 'MEDIO';
        END IF;
        
        RAISE NOTICE 'Migração concluída com sucesso';
      END $$;
    `);
    
    console.log('✅ Migração concluída!');
    
  } catch (error) {
    console.error('❌ Erro na migração:', error);
  }
}

migrate();