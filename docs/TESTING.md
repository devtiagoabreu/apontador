# Testes

Suite de testes do Apontador com **Vitest** + **Testing Library**.

## Comandos

| Script | Comando | Descrição |
|---|---|---|
| watch | `npm run test` | Roda em modo watch |
| executar | `npm run test:run` | Executa **uma vez** e sai |
| cobertura | `npm run test:coverage` | Executa com relatório de cobertura |

> No Windows, use `npm.cmd run <script>` quando o shell bloquear `npm.ps1`.

## Estrutura

```
vitest.config.ts              # alias @ → src, jsdom para *.test.tsx, env de teste, coverage v8
vitest.setup.ts               # jest-dom, cleanup do Testing Library, env vars, silencia console
src/
  lib/
    utils.test.ts             # utilidades puras (formatadores, ordenação, etc.)
    estagio-utils.test.ts     # estilo/nome de estágio
    api-auth.test.ts          # requireAuth (401/403/sucesso)
    auth.test.ts              # authorize do CredentialsProvider (ADM bcrypt, operador sem senha, loginMode)
    systextil/index.test.ts   # importarOps (token, cache, erros, API por id)
    cron/importar-ops.test.ts # importação automática + isolamento por sistema
    db/schema/schemas.test.ts # schemas Zod (validação de campos, enums, literais, UUID)
  components/ui/
    data-table.test.tsx       # DataTable (render, vazio, clique, teclado, ações)
```

### Como rodar uma suíte específica

```
npx vitest run src/lib/utils.test.ts
```

## Configuração

- `vitest.config.ts` usa alias `@` → `src`, `esbuild` com JSX automático, e `environmentMatchGlobs` para `*.test.tsx` → **jsdom**.
- Environment padrão: `node` (testes de lógica pura não precisam de DOM).
- Cobertura via `@vitest/coverage-v8` (ignora `**/*.test.*`).

## Padrões e truques dos mocks

### Módulos que tocam o banco

Qualquer código que importe `@/lib/db` dispara a criação do pool Neon (que **lança** se `DATABASE_URL` ausente). Por isso os testes que exercitam esses módulos mockam o módulo:

```ts
const { dbMock } = vi.hoisted(() => ({
  dbMock: { query: { usuarios: { findFirst: vi.fn() } } },
}));
vi.mock('@/lib/db', () => ({ db: dbMock }));
```

### `bcryptjs`

A importação default (`import bcrypt from 'bcryptjs'`) exige mock com `default`:

```ts
vi.mock('bcryptjs', () => ({ default: { compare: vi.fn() } }));
```

### NextAuth (`auth.test.ts`)

A dependência `next-auth` instalada nesta máquina **stubba** `providers/credentials` e guarda a configuração real em `options.authorize`:

```ts
const authorize = (authOptions.providers[0] as any).options.authorize;
```

Use `options.authorize`, não `providers[0].authorize` (que é `() => null` no stub).

### Cache de token do Systêxtil

`systextilService` é singleton e guarda o token em cache por `clientId`. Em testes que passam pela obtenção de token, use **clientId único por teste** (helper `criarSistema()`), senão o segundo teste que usa o mesmo sistema reaproveita o token e o `fetch` esperado não acontece.

### `fetch` global

`vi.stubGlobal('fetch', fetchMock)` + `vi.unstubAllGlobals()` em `afterEach`.

### Componentes (jsdom)

Use `@testing-library/react` + `userEvent` + `jest-dom` (já exposto via `vitest.setup.ts`). Movimentações de teclado (`Enter`/`Space`) são testadas com `user.keyboard()` após `focus()`.

## Notas e limitações conhecidas

- **Schemas Zod (`drizzle-zod` 0.5.1)**: os overrides aplicam validação dos campos informados (min, enums, literais, UUID), mas **não populam defaults** no output do `safeParse` nem tornam obrigatórias colunas anuláveis da tabela (ex.: `estagioId` em `insertProducaoSchema`). Os testes caracterizam esse comportamento real. Defaults são aplicados pelo Postgres no insert.
- Os schemas hoje são usados principalmente como **tipos TypeScript** (`New*`); a validação de payload nas APIs é feita por schemas Zod locais de cada rota.
- O núcleo de relatórios usa `Intl.DateTimeFormat` memoizado; em testes de componentes, garanta fuso determinístico se necessário.