const bcrypt = require('bcryptjs');

async function gerarHash() {
  const senha = 'admin123';
  const hash = await bcrypt.hash(senha, 10);
  console.log('Hash gerado:', hash);
}

gerarHash();