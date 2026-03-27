# 📚 Apontador - Sistema de Apontamento Têxtil

## 🎯 Sobre o Projeto
O **Apontador** é um Sistema de Execução de Manufatura (MES) voltado para a indústria têxtil, projetado para digitalizar e otimizar o acompanhamento da produção em chão de fábrica.

A solução integra-se diretamente com o ERP **Systêxtil**, garantindo sincronização automática de Ordens de Produção (OPs), eliminando retrabalho manual e aumentando a confiabilidade dos dados.

O sistema é composto por duas interfaces principais:
- 🖥️ **Painel Administrativo** (web)
- 📱 **Interface Mobile** (operadores de produção)

---

## 🚀 Funcionalidades

### 📊 Painel Administrativo
- 🧩 **Kanban de Produção**
  - Visualização em tempo real
  - Drag & Drop de OPs entre estágios
- 🗂️ **Gestão de Cadastros (CRUD)**
  - Produtos
  - Máquinas
  - Operadores
  - Estágios de produção
- 📈 **Relatórios e Indicadores**
  - Eficiência
  - Produtividade
  - OEE
- 🔍 **Auditoria completa**
  - Baseada em apontamentos unificados (produção + parada)

---

### 📱 Interface Mobile (Chão de Fábrica)
- ▶️ **Início de Produção**
  - Seleção de OP, máquina e estágio
- ⏹️ **Finalização de Produção**
  - Registro de metragem produzida
- ⏸️ **Registro de Paradas**
  - Motivos categorizados
  - Impacto direto no OEE
- 📜 **Histórico de Atividades**
  - Últimos registros do operador
- 📷 **Leitura de QR Code**
  - Identificação rápida de máquinas

---

## 🧠 Arquitetura do Sistema

### 🔄 Modelo de Apontamentos Unificado
A tabela `apontamentos` centraliza:
- PRODUÇÃO
- PARADA

Com base no campo `tipo`, permitindo:
- Linha do tempo única
- Auditoria completa
- Simplicidade estrutural

---

### 🔗 Integração com ERP Systêxtil
- 🔐 Autenticação via OAuth2 (`client_credentials`)
- 🔄 Importação manual e automática (cron)
- 🧩 Mapeamento de campos ERP → banco local
- 🧪 Endpoints de diagnóstico e simulação

---

### 🗄️ Banco de Dados
- PostgreSQL (Neon)
- ORM: **Drizzle ORM**
- Estratégia híbrida:
  - Migrações automáticas
  - Scripts incrementais customizados

---

### ⚙️ Backend
- Next.js (App Router)
- API REST interna
- Validação com Zod
- Autenticação com NextAuth

---

### 🎨 Frontend
- React + TypeScript
- Tailwind CSS
- shadcn/ui + Radix UI
- Componentes reutilizáveis:
  - `FormModal`
  - `DataTable`

---

## 🛠️ Stack Tecnológico

| Camada        | Tecnologia               | Propósito |
|--------------|------------------------|----------|
| Framework    | Next.js 14             | App Router + API |
| Linguagem    | TypeScript             | Tipagem segura |
| Banco        | PostgreSQL (Neon)      | Persistência |
| ORM          | Drizzle ORM            | Queries e migrations |
| Auth         | NextAuth.js            | Autenticação |
| UI           | shadcn/ui + Radix UI   | Componentes |
| Estilo       | Tailwind CSS           | Layout responsivo |
| Gráficos     | Recharts               | Visualização |
| DnD          | @dnd-kit               | Kanban |

---

## 📁 Estrutura do Projeto

    src/
    ├── app/
    │   ├── api/               # Rotas da API
    │   ├── dashboard/         # Interface Admin
    │   ├── apontamento/       # Interface Mobile
    │   └── layout.tsx
    ├── components/
    │   ├── ui/                # Componentes web
    │   └── mobile/            # Componentes mobile
    ├── lib/
    │   ├── db/                # Schema + migrations
    │   ├── systextil/         # Integração ERP
    │   ├── cron/              # Jobs automáticos
    │   └── auth.ts
    ├── migrations/            # SQL gerado
    └── public/

---

## ⚙️ Instalação

### 🔧 Pré-requisitos
- Node.js 18+
- PostgreSQL (Neon recomendado)
- Credenciais do ERP Systêxtil

### 🚀 Setup

    # Clone
    git clone https://github.com/devtiagoabreu/apontador
    cd apontador

    # Instalar dependências
    npm install

    # Variáveis de ambiente
    cp .env.example .env.local

    # Rodar migrations
    npm run db:migrate

    # Rodar projeto
    npm run dev

---

## 🔐 Variáveis de Ambiente

    DATABASE_URL=
    NEXTAUTH_SECRET=
    NEXTAUTH_URL=http://localhost:3000

    SYSTEXTIL_API_URL=
    SYSTEXTIL_CLIENT_ID=
    SYSTEXTIL_CLIENT_SECRET=

---

## 🔄 Fluxos de Trabalho

### 🏭 Produção (Mobile)
1. Ler QR Code da máquina  
2. Selecionar OP  
3. Iniciar produção  
4. Registrar paradas (se necessário)  
5. Finalizar produção com metragem  

---

### 🧑‍💼 Administração
1. Importar OPs do ERP  
2. Monitorar Kanban  
3. Gerenciar cadastros  
4. Analisar indicadores  

---

## 📊 KPIs e Métricas

- ⚡ **Eficiência**
- 🟢 **Disponibilidade**
- 📏 **Produtividade**
- 🏭 **OEE (Overall Equipment Effectiveness)**

---

## 🧪 Scripts Importantes

| Script | Função |
|------|--------|
| `db:migrate` | Executa migrations |
| `seed` | Popula dados iniciais |
| `reset` | Limpa e recria banco |
| `cron/importar-ops` | Importação automática ERP |

---

## 🧩 Componentes Reutilizáveis

### FormModal
- Geração dinâmica de formulários
- Validação com Zod
- Integração com react-hook-form

### DataTable
- Paginação
- Ações (editar/excluir)
- Render customizado

---

## 📱 Mobile-first Design

- Navegação inferior fixa
- Componentes otimizados para toque
- Alto contraste (uso industrial)
- Feedback visual imediato

---

## 🤝 Contribuição

    # Criar branch
    git checkout -b feature/nova-feature

    # Commit
    git commit -m "feat: nova funcionalidade"

    # Push
    git push origin feature/nova-feature

Abra um Pull Request 🚀

---

## 📝 Licença
MIT.

---

## 📞 Suporte
Abra uma issue no GitHub para dúvidas ou sugestões.

---

## 📌 Observações
- Arquitetura baseada em eventos de produção (apontamentos)
- Integração ERP desacoplada
- Sistema preparado para escala industrial
- Foco em performance e usabilidade no chão de fábrica
