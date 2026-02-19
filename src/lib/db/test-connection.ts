import { testConnection } from './index';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Carregar variáveis de ambiente do arquivo .env
dotenv.config({ path: path.join(process.cwd(), '.env') });

async function main() {
  console.log('🔄 Testando conexão com o banco de dados...');
  console.log('📁 Diretório atual:', process.cwd());
  console.log('🔍 DATABASE_URL:', process.env.DATABASE_URL ? 'Encontrada' : 'Não encontrada');
  
  try {
    const success = await testConnection();
    
    if (success) {
      console.log('✅ Teste concluído com sucesso!');
      process.exit(0);
    } else {
      console.log('❌ Teste falhou!');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Erro no teste:', error);
    process.exit(1);
  }
}

main();