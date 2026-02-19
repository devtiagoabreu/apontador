const { Pool } = require('@neondatabase/serverless');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

async function testNeon() {
  console.log('🔍 Testando conexão com Neon...\n');
  
  console.log('📁 Diretório:', process.cwd());
  console.log('🔑 DATABASE_URL:', process.env.DATABASE_URL ? '✅ Configurada' : '❌ Não configurada');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL não encontrada');
    process.exit(1);
  }

  // Mostrar URL mascarada
  const maskedUrl = process.env.DATABASE_URL.replace(/:([^:@]+)@/, ':***@');
  console.log('📎 URL:', maskedUrl);
  console.log('');

  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 10000,
  });

  try {
    console.log('🔄 Tentando conectar...');
    const client = await pool.connect();
    console.log('✅ Conectado ao servidor!');
    
    console.log('🔄 Executando consulta...');
    const result = await client.query('SELECT version(), current_database(), current_user');
    console.log('✅ Consulta executada!');
    console.log('');
    console.log('📊 Informações do banco:');
    console.log('   Versão:', result.rows[0].version.split(' ')[0]);
    console.log('   Banco:', result.rows[0].current_database);
    console.log('   Usuário:', result.rows[0].current_user);
    
    client.release();
    await pool.end();
    
  } catch (error) {
    console.error('\n❌ Erro detalhado:');
    console.error('   Mensagem:', error.message);
    console.error('   Código:', error.code);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Dica: Verifique se o host está correto e se o Neon está acessível');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('\n💡 Dica: Tempo limite excedido. Pode ser firewall ou região incorreta');
    } else if (error.code === '28P01') {
      console.error('\n💡 Dica: Senha incorreta');
    } else if (error.code === '3D000') {
      console.error('\n💡 Dica: Banco de dados não existe');
    } else if (error.message.includes('SSL')) {
      console.error('\n💡 Dica: Adicione ?sslmode=require no final da URL');
    }
    
    process.exit(1);
  }
}

testNeon();