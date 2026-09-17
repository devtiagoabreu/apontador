# Arquitetura

Este documento descreve a arquitetura do **Sistema de Apontamento Têxtil (Apontador)**, um MES (Manufacturing Execution System) para a indústria têxtil.

- Stack: Next.js 14 (App Router), React 18 + TypeScript (strict), Tailwind CSS, shadcn/ui + Radix UI
- Banco: PostgreSQL (Neon) via Drizzle ORM (`drizzle-orm/neon-serverless`)
- Auth: NextAuth.js (JWT, `CredentialsProvider`)
- Integração: ERP Systêxtil via OAuth2 `client_credentials`

--- 

## Visão geral

O sistema possui dois pontos de entrada:

1. **Painel administrativo** (`/dashboard`) — Kanban, CRUDs, relatórios, integração e configurações. Acesso restrito a `ADM`.
2. **Interface mobile de apontamento** (`/apontamento`) — operadores de chão de fábrica, inclui login por matrícula/senha e fluxo avulso.

Toda a persistência passa por rotas da API (`/api/*`) que validam sessão via `requireAuth`.

--- 

## Camadas

| Camada | Local | Responsabilidade |
|--------|-------|------------------|
| Rotas de página | `src/app/dashboard`, `src/app/apontamento`, `src/app/login`, `src/app/qr` | Renderização client-side das telas |
| Rotas de API | `src/app/api/**/route.ts` | Handlers REST; validação + persistência |
| Serviços | `src/lib` | Lógica de negócio reutilizável |
| Persistência | `src/lib/db` | Pool Neon + Drizzle + schema Zod |
| Integração | `src/lib/systextil` | Cliente OAuth2 + requisições ao ERP |
| Jobs | `src/lib/cron` | Importação automática de OPs |
| Middleware | `src/middleware.ts` | Guarda de rotas e proteção de API |

--- 

## Autenticação e autorização

- **Login** (`src/lib/auth.ts`): `CredentialsProvider` com matrícula/senha.
  - `ADM`: senha comparada com hash bcrypt salvo no cadastro.
  - `OPERADOR`: sem exigência de senha — loga apenas com a matrícula (fluxo QR / mobile).
  - Suporta `loginMode` (`normal` | `avulso`), armazenado no JWT.
- **Middleware** (`src/middleware.ts`): `withAuth`
  - `/dashboard` exige token com `nivel === 'ADM'` (redireciona para `/apontamento` caso contrário).
  - `/api/*` exige token (senão `401`).
  - `/login` redireciona usuários já autenticados.
- **Helper de rotas de API** (`src/lib/api-auth.ts`): `requireAuth({ requiredLevel })`
  - sem sessão → `401 { error: 'Não autorizado' }`
  - nível insuficiente (`requiredLevel: 'ADM'`) → `403 { error: 'Acesso restrito a administradores' }`

Padrão usado em todos os handlers:

```ts
const auth = await requireAuth({ requiredLevel: 'ADM' });
if (auth.error) return auth.error;
```

--- 

## Banco de dados

- Conexão via `Pool` de `@neondatabase/serverless` (`src/lib/db/index.ts`); em desenvolvimento usa WebSocket local (WS proxy).
- Schema Drizzle em `src/lib/db/schema/*.ts`, reexportado por `src/lib/db/schema/index.ts`.
- Migrations em `migrations/`, executadas por `src/lib/db/migrate.ts`.
- Cada tabela possui schemas Zod (`insert*Schema`, `select*Schema`) derivados com `drizzle-zod`, usados principalmente como tipos.
- Restrições e defaults (status, `ativo`, `createdAt/updatedAt`) são aplicados pelo Postgres.

Ver [DATABASE.md](./DATABASE.md).

--- 

## Modelo de apontamentos

A tabela `apontamentos` é o modelo **unificado** de eventos de produção:

- `tipo = 'PRODUCAO'` → registro de produção (OP, metragem, estágio, reprocesso).
- `tipo = 'PARADA'` → registro de parada (motivo, observações).

Campos aplicáveis a apenas um dos tipos ficam nulos no outro. Isso permite auditoria em linha do tempo única.

Existem ainda tabelas legadas/paralelas para fluxos específicos:
- `producoes` — produção vinculada a OP (`producoesTable`).
- `producoes_avulsas` — produção sem OP (vínculo direto a produto).
- `paradas_maquina` — paradas de máquina (sem OP obrigatória).

--- 

## Integração com ERP Systêxtil

- `src/lib/systextil/index.ts` expõe `systextilService` (singleton).
- Obtém token OAuth2 (`grant_type=client_credentials`, Basic auth `clientId:clientSecret`) a partir das credenciais cadastradas em `sistemas_integracao`.
- Token é armazenado em cache em memória (por `clientId`) até `expires_in - 60s`.
- Chama a API selecionada (`apis_integracao`) e normaliza a resposta `{ items: [] }` para `SystextilOP[]`.
- Importação persiste as OPs que ainda não existem (chave primária `op`); duplicadas são ignoradas.

Fluxos expostos:
- Manual: `POST /api/systextil/importar` (ADM)
- Diagnóstico: `GET /api/systextil/testar` e `GET /api/systextil/testar-importacao` (ADM)
- Automático: `GET /api/cron/importar-ops` (ADM, chamável por cron externo/Vercel Cron)

--- 

## Frontend

- **Painel admin**: formulários modais (`FormModal`), tabelas (`DataTable`), Kanban com `@dnd-kit`.
- **Mobile**: navegação inferior fixa, componentes de toque, leitura de QR (`/qr/*`) para máquinas, OPs e operadores.
- Gráficos de relatório com **Recharts**.

--- 

## Padrões transversais

- **Paginação** em listas: query `page` (mín. 1) e `limit` (1 ≤ limit ≤ 100); resposta `{ data, pagination: { page, limit, total, totalPages } }`.
- **Datas**: fuso `America/Sao_Paulo`; formato pt-BR via `Intl.DateTimeFormat` memoizado.
- **Erros**: respostas JSON com `{ error: string }` (400 Zod / 401 / 403 / 404 / 500). Erros internos não expõem `error.message` em fluxos sensíveis.
- **A11y**: tabelas ordenáveis por teclado (Enter/Space), `aria-sort`, `aria-label` em ações, `<form>`/`htmlFor` em logins.