# Banco de Dados

PostgreSQL (Neon) gerenciado por **Drizzle ORM**. Schemas em `src/lib/db/schema/*.ts`; migrations em `migrations/`.

Convenções comuns da base:

- `id` → `uuid() primaryKey().defaultRandom()`
- `createdAt`/`updatedAt` → `timestamp().defaultNow().notNull()`
- flags `ativo` → `boolean().default(true)`
- Campos numéricos de metragem/quantidade → `decimal(precision, scale)` (10,2)
- Nomes de colunas em `snake_case`; o Drizzle mapeia para as propriedades camelCase em TS.

---

## Cadastros

### `areas`
Área da fábrica (ex.: Corte, Costura).

| Coluna | Tipo | Observação |
|---|---|---|
| id | uuid PK | defaultRandom |
| nome | varchar(100) not null | UNIQUE |
| descricao | text | |
| ativo | boolean | default true |

### `setores`
Setor dentro de uma área. `areaId` referencia `areas.id`.

### `maquinas`
Máquina de produção com parâmetros de eficiência.

- `codigo` varchar(20) not null UNIQUE
- `status` enum `DISPONIVEL | EM_PROCESSO | PARADA` (default `DISPONIVEL`)
- `ativo` default true
- `velocidadePadrao` decimal default `'0'`
- `capacidadeKg` / `capacidadeLitros` decimal default `0`
- `tempoDiarioDisponivel` integer default `1440` (minutos/dia)
- `qrCode` text

### `maquina_setor`
Relação N:N máquina ↔ setor. Duplicidade evitada pela chave composta `uniqueMaquinaSetor` (`maquinaId` + `setorId`).

### `estagios`
Estágio do fluxo produtivo (Kanban).

- `codigo` varchar(2) not null UNIQUE
- `nome` varchar(50) not null
- `ordem` integer not null
- `cor` varchar(7) default `#3b82f6` (HEX)
- `mostrarNoKanban` boolean default true
- `ativo` default true

### `motivos_parada` e `motivos_cancelamento`
Catálogos de motivos (paradas de máquina e cancelamento de OP).

- `codigo` not null UNIQUE
- `descricao` not null
- `ativo` default true

### `usuarios`
Operadores e administradores.

- `matricula` varchar(20) not null UNIQUE
- `nivel` `ADM | OPERADOR` (default `OPERADOR`)
- `senha` varchar(255) — hash bcrypt (obrigatório p/ ADM; opcional p/ operador — senha padrão = matrícula)
- `qrCode` text
- `ativo` default true

### `produtos`
Produto do catálogo têxtil, com rastreabilidade e parâmetros de eficiência.

- `codigo` not null UNIQUE, `nome` not null, `um` (unidade) not null
- Campos Systêxtil: `nivel`, `grupo`, `sub`, `item`
- `composicao` jsonb (algodão, poliéster, elastano, ...)
- `largura`, `gramaturaLinear`, `gramaturaM2`
- `tipoTecido` (default `PLANO`), `ligamento`, `fiosUrdume`, `fiosTrama`
- `classificacaoPeso` (default `MEDIO`)
- `parametrosEficiencia` jsonb — por estágio: `{ tempoPadrao, rendimento, velocidade }`
- `metaDiaria`, `metaMensal`
- `ativo` default true

---

## Definições operacionais

### `ops`
Ordem de Produção importada do ERP. Chave primária = número da OP (`op` integer).

Campos do ERP: `produto`, `depositoFinal`, `pecasVinculadas`, `qtdeProgramado`, `qtdeCarregado`, `qtdeProduzida`, `calculoQuebra`, `obs`, `um`, `narrativa`, `nivel`, `grupo`, `sub`, `item`.

Controle interno:
- `produtoId` → referência a `produtos` (se o produto já foi catalogado)
- `codEstagioAtual` / `estagioAtual` (default `'00'` / `'NENHUM'`)
- `codMaquinaAtual` / `maquinaAtual` (default `'00'` / `'NENHUMA'`)
- `status` `ABERTA | EM_ANDAMENTO | FINALIZADA | CANCELADA` (default `ABERTA`)
- `dataImportacao`, `dataUltimoApontamento`
- Cancelamento: `codMotivoCancelamento`, `motivoCancelamento`, `dataCancelamento`, `usuarioCancelamentoId`

### `apontamentos` — modelo unificado
Evento de produção ou parada.

| Coluna | Tipo | Observação |
|---|---|---|
| tipo | varchar(10) not null | `PRODUCAO` ou `PARADA` |
| maquinaId | uuid not null | → `maquinas` |
| operadorInicioId | uuid not null | → `usuarios` |
| operadorFimId | uuid | → `usuarios` |
| dataInicio / dataFim | timestamp not null | |
| status | varchar(20) default `EM_ANDAMENTO` | `EM_ANDAMENTO | CONCLUIDO | CANCELADO` |
| opId | integer | → `ops` (produção) |
| metragemProcessada | decimal(10,2) | (produção) |
| estagioId | uuid | → `estagios` (produção) |
| isReprocesso | boolean default false | (produção) |
| motivoParadaId | uuid | → `motivos_parada` (parada) |
| observacoes | text | |

> Nota: os schemas Zod (`insertProducaoSchema`/`insertParadaSchema`, em `apontamentos.ts`) validam os campos fornecidos e os literais de `tipo`, mas **não aplicam defaults** nem tornam obrigatórios campos opcionais na tabela (ex.: `estagioId`). Defaults são aplicados pelo Postgres no insert.

### `paradas_maquina`
Parada de máquina (fluxo legado/paralelo).

- `maquinaId`, `operadorId`, `motivoParadaId` (todos not null)
- `dataInicio` not null, `dataFim` opcional
- `opId` opcional (parada vinculada a OP)

### `producoes`
Produção vinculada a OP (fluxo legado/paralelo).

- `opId` not null, `maquinaId` not null, `operadorInicioId` not null, `estagioId` not null
- `dataInicio` not null, `dataFim` opcional
- `metragemProgramada` not null, `metragemProcessada` opcional
- `isReprocesso` default false, `observacoes`

### `producoes_avulsas`
Produção **sem OP** (avulsa), com vínculo direto a produto.

- `maquinaId`, `operadorInicioId`, `produtoId`, `estagioId` (not null)
- `dataInicio` default now, `dataFim` opcional
- `metragem` decimal, `status` default `EM_ANDAMENTO`, `observacoes`

---

## Configuração e integração

### `configuracoes`
Chave-valor simples: `chave` (PK, text), `valor` (text), `atualizadoEm` (default now). Usada para parâmetros gerais do sistema (persistidos via `PUT /api/configuracoes`).

### `sistemas_integracao`
Sistemas ERP conectados.

- `nome` not null
- `tokenUrl`, `clientId`, `clientSecret` — credenciais OAuth2
- `ativa` default true
- `criadoEm` default now

### `apis_integracao`
APIs consumíveis dentro de cada sistema.

- `sistemaId` not null → `sistemas_integracao`
- `nome` not null, `apiUrl` not null, `metodo` default `GET`
- `ativa` default true

---

## Relacionamentos (mapa)

```
areas 1─N setores
setores N─N maquinas (via maquina_setor)
maquinas 1─N apontamentos / paradas_maquina / producoes / producoes_avulsas
usuarios 1─N apontamentos (operadorInicio/Fim) / operadorInicioId
estagios 1─N apontamentos / producoes / producoes_avulsas
motivos_parada 1─N apontamentos / paradas_maquina
ops 1─N apontamentos / producoes / paradas_maquina (opcional)
produtos 1─N producoes_avulsas
ops N─1 produtos (produtoId)
```