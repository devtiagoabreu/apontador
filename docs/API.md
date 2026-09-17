# API REST

Todas as rotas vivem em `src/app/api/**/route.ts` (Next.js App Router **Route Handlers**).

## Convenções

- **Autenticação**: toda rota usa `requireAuth()`; rotas administrativas usam `requireAuth({ requiredLevel: 'ADM' })`. Veja `src/lib/api-auth.ts`.
  - `401` → `{ error: 'Não autorizado' }`
  - `403` → `{ error: 'Acesso restrito a administradores' }`
- **Paginção** (listas): `?page=n` (mín. 1) e `?limit=n` (1–100, default 50). Resposta `{ data, pagination: { page, limit, total, totalPages } }`.
- **Erros de validação**: `400` com `{ error: 'Dados inválidos' | 'Filtros inválidos', detalhes: [...] }` (Zod).
- **Erros internos**: `500` com `{ error: <mensagem genérica> }`.
- Payloads em JSON; datas de entrada em ISO 8601 e fuso brasileiro (`-03:00`) quando aplicável.

---

## Convenção geral por recurso (CRUD)

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/<recurso>` | Lista (com paginação) |
| POST | `/api/<recurso>` | Cria |
| GET | `/api/<recurso>/[id]` | Busca por id |
| PUT | `/api/<recurso>/[id]` | Atualiza |
| DELETE | `/api/<recurso>/[id]` | Remove |

Aplica-se a: `areas`, `setores`, `maquinas`, `estagios`, `motivos-parada`, `motivos-cancelamento`, `usuarios`, `produtos`, `ops`, `apontamentos`, `paradas-maquina`, `producoes`, `producoes-avulsas`, `sistemas-integracao`, `apis-integracao`.

> `GET /api/sistemas-integracao` nunca retorna o `clientSecret` em texto: devolve `clientSecret` mascarado (`••••` + últimos 4) e `hasSecret: true|false`. No `PUT`, um valor vazio ou mascarado **não substitui** o secret existente.

---

## Autenticação

| Rota | Método | Descrição |
|---|---|---|
| `/api/auth/[...nextauth]` | any | NextAuth (login/logout/session). Ver `src/lib/auth.ts`. |

- Login por `matricula` + `senha` (Credentials). Operador pode entrar com a própria matrícula como senha.
- Campo `loginMode` (`normal`/`avulso`) é persistido no JWT.

---

## Apontamentos (modelo unificado)

### `POST /api/apontamentos` — cria apontamento (produção ou parada)

Corpo:

```jsonc
{
  "tipo": "PRODUCAO",              // "PRODUCAO" | "PARADA"
  "maquinaId": "uuid",
  "operadorInicioId": "uuid",
  "operadorFimId": "uuid?",        // opcional
  "dataInicio": "2026-09-01T10:00:00Z",
  "dataFim": "2026-09-01T11:00:00Z",
  "status": "EM_ANDAMENTO",        // EM_ANDAMENTO | CONCLUIDO | CANCELADO
  "observacoes": "string?",
  "opId": 123,                     // int positivo, opcional (produção)
  "estagioId": "uuid?",            // produção
  "metragemProcessada": 120.5,     // number?, produção
  "isReprocesso": false,           // boolean?, produção
  "motivoParadaId": "uuid?"        // parada
}
```

Resposta `201` com o registro criado. `400` se o corpo falhar na validação Zod.

### `GET /api/apontamentos` — lista (paginada)

Retorna registros com joins (op, máquina, operadores, motivo, estágio) e paginação.

### `GET /api/apontamentos/[id]`
Apontamento com joins e conversões seguras (decimal→number, boolean).

### `PUT /api/apontamentos/[id]`
Atualiza o apontamento (mesma estrutura do POST).

### `DELETE /api/apontamentos/[id]`
Remove; responde `{ success: true }`.

### `POST /api/apontamentos/[id]/finalizar`
Finaliza apontamento de produção (é o handler do botão “Finalizar” no mobile).

### `POST /api/apontamentos/[id]/parada`
Registra uma parada dentro do fluxo de apontamento.

### `GET /api/apontamentos/diagnostico`
Diagnóstico interno (ADM).

---

## OPs e Kanban

### `GET /api/ops` — lista OPs (paginada)
### `GET /api/ops/search?q=` — busca rápida
### `GET /api/ops/[id]` | `PUT /api/ops/[id]` | `DELETE /api/ops/[id]`

### `POST /api/ops/[id]/mover` — move a OP para outro estágio/máquina (transação)

Corpo:

```jsonc
{
  "estagioId": "uuid",
  "maquinaId": "uuid",
  "isReprocesso": false,
  "metragemFinalizada": 100.5    // opcional
}
```

Regras na transação (`src/app/api/ops/[id]/mover/route.ts`):
- Valida OP, estágio e máquina (404 se algum não existir).
- Máquina deve estar `DISPONIVEL` (senão `400`).
- Finaliza o apontamento em andamento da OP (conclui e libera a máquina anterior).
- Cria novo apontamento `PRODUCAO` `EM_ANDAMENTO`, ocupa a nova máquina (`EM_PROCESSO`) e atualiza `codEstagioAtual`/`codMaquinaAtual` da OP.

### `POST /api/ops/[id]/desfazer`
Desfaz a última movimentação/estado da OP.

---

## Paradas e produções (fluxos legados/paralelos)

| Rota | Método | Descrição |
|---|---|---|
| `/api/paradas-maquina` | GET/POST | Lista/cria parada de máquina |
| `/api/paradas-maquina/[id]` | GET/PUT/DELETE | Detalhes/altera/remove |
| `/api/paradas-maquina/[id]/finalizar` | POST | Fecha a parada (define `dataFim`) |
| `/api/paradas-maquina/check-data` | GET | Verifica conflito de janela de tempo |
| `/api/paradas-maquina/diagnostico` | GET | Diagnóstico (ADM) |
| `/api/paradas` | GET/POST | Paradas |
| `/api/paradas/[id]/finalizar` | POST | Finaliza |
| `/api/producoes` | GET/POST | Produções vinculadas a OP |
| `/api/producoes/[id]` | GET/PUT/DELETE | |
| `/api/producoes/[id]/finalizar` | POST | |
| `/api/producoes-avulsas` | GET/POST | Produções sem OP |
| `/api/producoes-avulsas/[id]` | GET/PUT/DELETE | |
| `/api/producoes-avulsas/[id]/finalizar` | POST | |

---

## Relatórios e eficiência

### `GET /api/relatorios` — relatórios consolidados (ADM)

Query params:

| Param | Valores |
|---|---|
| `inicio` / `fim` | Datas no período (`YYYY-MM-DD`) |
| `tipo` | `producao` (default) \| `paradas` \| `operadores` \| `maquinas` \| `eficiencia` |
| `referencia` | `produto` (default) \| `maquina` |
| `maquinas`, `operadores`, `datas`, `grupos`, `estagios` | Listas separadas por vírgula |

Resposta: `{ dados, totais, graficos: { porData, porEstagio, porMotivo? } }`. Para `tipo=maquinas` inclui `disponibilidade`, `eficiencia`, `metrosPorMinuto`.

- Datas usam fuso `-03:00` no início e fim do dia.
- Eficiência = `metragemReal / metragemEsperada × 100`, onde `metragemEsperada = tempoMinutos × velocidade` (velocidade do produto por estágio, ou da máquina, conforme `referencia`).

### `POST /api/relatorios/eficiencia` — eficiência detalhada (ADM)

Corpo (todos opcionais):

```jsonc
{
  "periodo": { "inicio": "2026-09-01", "fim": "2026-09-15" },  // default: últimos 30 dias
  "maquinas": ["uuid"],
  "operadores": ["uuid"],
  "datas": ["2026-09-01"],
  "grupos": ["0001"],
  "estagios": ["uuid"],
  "referencia": "produto"
}
```

Resposta: `{ dados, totais, graficos: { porData, porEstagio, porMaquina }, filtrosAplicados }`.
- `porMaquina` calcula `tempoDisponivel = tempoDiarioDisponivel × diasNoPeriodo`, `tempoParada` (soma de `paradas_maquina` no período) e `eficiencia`.

---

## Integração Systêxtil

### `POST /api/systextil/importar` — importa OPs (ADM)

Corpo: `{ "sistema_id": "uuid", "api_id": "uuid" }` (opcional).

Resposta:

```jsonc
{
  "sucesso": true,
  "importadas": 2,
  "ignoradas": 1,
  "erros": [],
  "detalhes": [
    { "op": 123, "status": "importada", "produto": "TEC.001" },
    { "op": 124, "status": "ignorada", "motivo": "Já existe no banco" }
  ]
}
```

OPs sem `op` ou sem `produto` vão para `erros`. OPs já existentes são ignoradas.

### `GET /api/systextil/testar` — diagnóstico (ADM)
`?sistema_id=&api_id=` (opcional). Executa token + chamada à API e retorna `{ timestamp, steps, error, data }`, com `data.analise` (OPs sem op/produto) e amostra dos campos.

### `GET /api/systextil/testar-importacao` — similar, focado em importação (ADM).

---

## Cron / manutenção / utilidades

| Rota | Método | Descrição |
|---|---|---|
| `/api/cron/importar-ops` | GET | Importação automática de OPs (`?sistema_id=` opcional). Protegida por `requireAuth({ requiredLevel: 'ADM' })`; chamável por cron externo |
| `/api/configuracoes` | GET/PUT | Configurações chave-valor (ADM). PUT salva/atualiza via `onConflictDoUpdate` |
| `/api/health` | GET | Health check |
| `/api/test-db` | GET | Teste de conexão com o banco |
| `/api/diagnostico-db` | GET | Diagnóstico do banco |
| `/api/diagnostico-kanban` | GET | Diagnóstico do Kanban |
| `/api/produtos/diagnostico` | GET | Diagnóstico do catálogo |
| `/api/maquinas/disponiveis` | GET | Máquinas disponíveis (`status = DISPONIVEL`) |
| `/api/maquinas/[id]/setores` | GET/PUT | Setores vinculados à máquina |

---

## Fluxos mobile (páginas integradas às APIs)

- `/apontamento/producao` → iniciar produção (POST `/api/apontamentos`)
- `/apontamento/parada` → registrar parada
- `/qr/*` → leitura de QR code de máquina (= `/apontamento/producao?maquina=`), OP, operador e paradas de máquina.