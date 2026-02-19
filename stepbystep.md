# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas credenciais

# Gerar migrations
npm run db:generate

# Executar migrations
npm run db:migrate

# Iniciar em desenvolvimento
npm run dev