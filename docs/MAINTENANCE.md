# Módulo de Manutenção — Especificação

> Status: **documentação para aprovação** — define escopo, modelo de dados, fluxos e plano de implantação do módulo de apontamento de manutenção. O desenvolvimento será feito em fases após a validação deste documento.

---

## 1. Visão geral

Hoje o operador lê o QR Code da máquina e inicia **produção** (com OP ou avulsa). O novo módulo de **manutenção** replica essa dinâmica para o apontamento de manutenção de máquinas, **sem dependência de OP**:

- O apontamento é feito **exclusivamente por usuários de nível `MANUTENCAO`**.
- Ao escanear o QR de uma máquina, o mecânico/eletricista vai **direto para o apontamento de manutenção** daquela máquina.
- O início registra: máquina, **tipo de manutenção** (Corretiva/Preventiva), **atividade** (Mecânica, Elétrica, Programação, Limpeza, Lubrificação) e **periodicidade** (Eventual/Periódica). Data/hora do início são automáticas.
- O término registra **observação opcional** e, conforme o fluxo, pode **agendar a próxima manutenção** para aquela máquina.
- Agendamentos aparecem em um **dashboard de manutenção** e podem ser **iniciados pré-preenchidos** pelo operador (botão “Iniciar”).
- Agendamento pode ser **cancelado**.
- No término, **sempre** existe a opção de agendar novamente (ou não) informando a próxima data.

Do ponto de vista de produto, o módulo é desenhado com três princípios-chave:

1. **Mobile-first**: o apontamento é usado no chão de fábrica, primordialmente em celular — telas grandes de toque, uma ação primária por tela, redirecionamento automático pós-ação (mesmo padrão do apontamento de produção).
2. **Acessibilidade exemplar (WCAG 2.1 AA)**: checklist obrigatório em todas as telas — ver **seção 7.3**.
3. **Home própria para `MANUTENCAO`**: o perfil tem tela de início dedicada com saudação, atalhos (Ler QR, Agendamentos com contador, Histórico) e as manutenções em andamento — ver **seção 7.1**.

### Referência de domínio (contexto)

O módulo segue conceitos de **TPM** (Total Productive Maintenance) e **CMMS** (Computerized Maintenance Management System), simplificados para o chão de fábrica:

- **Corretiva**: manutenção após falha/quebra.
- **Preventiva**: manutenção programada para evitar falhas (rotina por período).
- **Periódica**: manutenção que se repete em intervalo (gera agendamento da próxima).
- **Eventual**: manutenção pontual, sem recorrência (encerra no fim).

KPIs futuros (backlog): tempo médio entre falhas (MTBF), tempo médio de reparo (MTTR), disponibilidade por máquina.

Esta especificação foi confrontada com CMMS open source (Odoo Maintenance, ERPNext/Frappe, GLPI, Snipe-IT) para validar o desenho — ver **seção 11**.

---

## 2. Papéis e permissões

Novo nível de usuário: **`MANUTENCAO`** (além de `ADM` e `OPERADOR`).

| Nível | Acessa | Senha |
|---|---|---|
| `ADM` | Dashboard completo + CRUDs de manutenção + visualização de agendamentos | Sim (bcrypt) |
| `OPERADOR` | Fluxo mobile de produção | Não (matrícula) |
| `MANUTENCAO` | Fluxo mobile de manutenção + agendamentos | Não (matrícula) |

Regras:

1. O nível `MANUTENCAO` **não** acessa o fluxo de produção (`/apontamento/iniciar`, `/apontamento/machine/[id]`, avulso) nem o dashboard administrativo.
2. O operador de manutenção **não exige senha** (autentica por matrícula/QR), igual ao `OPERADOR` hoje.
3. As rotas de manutenção exigem nível `MANUTENCAO` ou `ADM`; `OPERADOR` recebe `403`.

---

## 3. Requisitos funcionais

### RF1 — Nível de usuário
- `usuarios.nivel` passa a aceitar `ADM | OPERADOR | MANUTENCAO` (schema, tipos, validação, CRUD de usuários, sessão/JWT).

### RF2 — QR direcionado pelo nível
- `OPERADOR` escaneando máquina → fluxo de produção (comportamento atual).
- `MANUTENCAO` escaneando máquina → **diretamente** para o apontamento de manutenção (`/apontamento/manutencao/iniciar?machine=<id>`), sem passar pela tela de produção.
- Aplica-se nos dois leitores: `/apontamento/leitor` (scanner mobile) e `/qr/machine/[id]` (QR impresso).

### RF3 — Início do apontamento (mobile)
Campos informados pelo operador:
- **Tipo de manutenção** (select): vindo do CRUD `tipos_manutencao` (inicial: Corretiva, Preventiva).
- **Atividade** (select): vindo do CRUD `atividades_manutencao` (inicial: Mecânica, Elétrica, Programação, Limpeza, Lubrificação).
- **Periodicidade** (radio): `EVENTUAL` ou `PERIODICA`.
- Máquina: fixa (vinda do QR).
- Data/hora de início: **automáticas** (servidor).
- Operador: da sessão (automático).

### RF4 — Término do apontamento (mobile)
- Observação **opcional**.
- Grava data/hora do término.
- Se `EVENTUAL` → encerra (pode, opcionalmente, agendar uma próxima).
- Se `PERIODICA` → obriga a **perguntar** a data da próxima manutenção (pode optar por não agendar) → gera **agendamento**.

### RF5 — Reagendamento no término
- **Sempre**, ao finalizar, exibir: “Deseja agendar a próxima manutenção?”
  - **Sim** → campo data (data futura/hoje) para aquela máquina → cria agendamento.
  - **Não** → encerra sem agendamento.
- O agendamento herda: máquina, tipo, atividade e periodicidade do apontamento encerrado.

### RF6 — Agendamentos (mobile)
- Tela de agendamentos: lista os agendamentos **pendentes** (`AGENDADO`).
- Ao clicar em um agendamento → tela pré-preenchida (máquina, tipo, atividade, periodicidade, data prevista) com **apenas o botão “Iniciar”** → inicia o apontamento vinculado ao agendamento.
- Finalizar de um agendamento segue o fluxo normal (RF4/RF5).

### RF7 — Agendamentos (dashboard / ADM)
- Página de **manutenção** no dashboard: visão de agendamentos (pendentes, hoje, atrasados), em andamento e histórico.
- **Cancelar** qualquer agendamento `AGENDADO` (motivo opcional no registro).

### RF8 — CRUDs de catálogo (ADM)
- `tipos_manutencao`: código + nome + ativo (padrão do CRUD de motivos de parada).
- `atividades_manutencao`: código + nome + ativo.
- Seed inicial com os valores citados acima.

### RF9 — Conflito de máquina
- Não é possível iniciar manutenção em máquina com **produção ativa** (produção com `dataFim` nulo/`EM_ANDAMENTO`) nem com **manutenção ativa**.
- Não é possível iniciar produção em máquina em manutenção (status `EM_MANUTENCAO`).

### RF10 — Status da máquina
- Durante manutenção ativa, máquina fica `EM_MANUTENCAO` (novo valor no enum).
- Ao finalizar/cancelar, volta para `DISPONIVEL`.

---

## 4. Fluxos

### 4.1 Início por QR (perfil MANUTENCAO)

```
[QR da máquina]
  → /apontamento/leitor (ou /qr/machine/[id])
  → sessão.nivel === 'MANUTENCAO'
  → /apontamento/manutencao/iniciar?machine=<id>

Tela: máquina (fixa) + tipo + atividade + periodicidade
  → botão "Iniciar"
  → POST /api/manutencoes  { maquinaId, tipoManutencaoId, atividadeManutencaoId, periodicidade }
  → cria manutenção EM_ANDAMENTO (dataInicio = now)
  → máquina = EM_MANUTENCAO
  → redireciona para "/apontamento/manutencao"
```

### 4.2 Término

```
/apontamento/manutencao/finalizar?id=<manutencaoId>
  → exibe máquina/tipo/atividade/periodicidade/início
  → observação (opcional)
  → pergunta: "Agendar próxima manutenção?" (Sim → campo data / Não)
  → POST /api/manutencoes/[id]/finalizar
       body: { observacoes?, agendar: { sim: true, dataPrevista } | { sim: false } }
  → dataFim = now, status = CONCLUIDA, máquina = DISPONIVEL
  → se agendar: cria agendamento AGENDADO (herda máquina/tipo/atividade/periodicidade)
```

### 4.3 Início a partir de agendamento

```
/apontamento/manutencao/agendamentos
  → lista AGENDADO (máquina, tipo, atividade, dataPrevista, periodicidade)
  → clicar em um agendamento
  → /apontamento/manutencao/iniciar?agendamento=<id>
      (tela pré-preenchida e somente-leitura; botão "Iniciar")
  → POST /api/agendamentos-manutencao/[id]/iniciar
  → agendamento = EM_ANDAMENTO; cria manutenção vinculada (agendamentoId) EM_ANDAMENTO
  → máquina = EM_MANUTENCAO
```

### 4.4 Cancelamento de agendamento

```
Dashboard (ADM) → Manutenção → Agendamentos → Cancelar
  → POST /api/agendamentos-manutencao/[id]/cancelar
  → somente status AGENDADO; vira CANCELADO (histórico preservado)
```

---

## 5. Modelo de dados

### 5.1 Novas tabelas

**`tipos_manutencao`** (CRUD)

| Coluna | Tipo | Obs |
|---|---|---|
| id | uuid PK | defaultRandom |
| codigo | varchar(20) not null | unique |
| nome | varchar(100) not null | ex.: Corretiva, Preventiva |
| ativo | boolean | default true |
| createdAt / updatedAt | timestamp | defaultNow |

**`atividades_manutencao`** (CRUD)

| Coluna | Tipo | Obs |
|---|---|---|
| id | uuid PK | defaultRandom |
| codigo | varchar(20) not null | unique |
| nome | varchar(100) not null | ex.: Mecânica, Elétrica, Programação, Limpeza, Lubrificação |
| ativo | boolean | default true |
| createdAt / updatedAt | timestamp | defaultNow |

**`manutencoes`** (apontamentos)

| Coluna | Tipo | Obs |
|---|---|---|
| id | uuid PK | defaultRandom |
| maquinaId | uuid not null | → maquinas |
| operadorInicioId | uuid not null | → usuarios (sessão) |
| operadorFimId | uuid | → usuarios |
| tipoManutencaoId | uuid not null | → tipos_manutencao |
| atividadeManutencaoId | uuid not null | → atividades_manutencao |
| periodicidade | varchar(10) not null | `EVENTUAL` \| `PERIODICA` |
| dataInicio | timestamp not null | default now (automática) |
| dataFim | timestamp | automática no término |
| observacoes | text | opcional |
| status | varchar(20) default `EM_ANDAMENTO` | `EM_ANDAMENTO` \| `CONCLUIDA` \| `CANCELADA` |
| agendamentoId | uuid | → agendamentos_manutencao (quando iniciado por agendamento) |
| createdAt / updatedAt | timestamp | defaultNow |

**`agendamentos_manutencao`**

| Coluna | Tipo | Obs |
|---|---|---|
| id | uuid PK | defaultRandom |
| maquinaId | uuid not null | → maquinas |
| tipoManutencaoId | uuid not null | → tipos_manutencao |
| atividadeManutencaoId | uuid not null | → atividades_manutencao |
| periodicidade | varchar(10) not null | herdada do apontamento que gerou |
| dataPrevista | timestamp not null | data informada (hoje ou futura) |
| status | varchar(20) default `AGENDADO` | `AGENDADO` \| `EM_ANDAMENTO` \| `CONCLUIDO` \| `CANCELADO` |
| origemManutencaoId | uuid | apontamento que gerou (opcional) |
| observacoes | text | (motivo de cancelamento, por exemplo) |
| createdAt / updatedAt | timestamp | defaultNow |

### 5.2 Alterações em tabelas existentes

- **`maquinas.status`**: adicionar `EM_MANUTENCAO` ao enum (`DISPONIVEL | EM_PROCESSO | PARADA | EM_MANUTENCAO`) — schema Drizzle + Zod + telas que renderizam status.
- **`usuarios.nivel`**: adicionar `MANUTENCAO` (`ADM | OPERADOR | MANUTENCAO`).
- Nenhuma alteração nas tabelas de produção/apontamento: manutenção é **modelo dedicado** e não entra em `apontamentos` (decisão de design).

### 5.3 Relacionamentos

```
maquinas 1─N manutencoes
maquinas 1─N agendamentos_manutencao
usuarios 1─N manutencoes (operadorInicio/Fim)
tipos_manutencao 1─N manutencoes / agendamentos_manutencao
atividades_manutencao 1─N manutencoes / agendamentos_manutencao
manutencoes 1─1 agendamentos_manutencao (origem via agendamentoId)
agendamentos_manutencao 1─1 manutencoes (origemManutencaoId)
```

---

## 6. API

### 6.1 Catálogos (ADM) — mesmo padrão de `motivos-parada`

| Método | Rota | Descrição |
|---|---|---|
| GET/POST | `/api/tipos-manutencao` | Lista / cria tipo |
| GET/PUT/DELETE | `/api/tipos-manutencao/[id]` | Detalhe / atualiza / remove |
| GET/POST | `/api/atividades-manutencao` | Lista / cria atividade |
| GET/PUT/DELETE | `/api/atividades-manutencao/[id]` | Detalhe / atualiza / remove |

### 6.2 Manutenções (nível `MANUTENCAO` ou `ADM`)

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/manutencoes` | Inicia manutenção |
| GET | `/api/manutencoes` | Lista (paginada, filtros `maquinaId`, `status`, período) |
| GET | `/api/manutencoes/[id]` | Detalhe |
| POST | `/api/manutencoes/[id]/finalizar` | Finaliza + reagendamento opcional |
| POST | `/api/manutencoes/[id]/cancelar` | Cancela apontamento ativo |

**POST `/api/manutencoes`**

```jsonc
{
  "maquinaId": "uuid",
  "tipoManutencaoId": "uuid",
  "atividadeManutencaoId": "uuid",
  "periodicidade": "EVENTUAL",   // EVENTUAL | PERIODICA
  "agendamentoId": "uuid?"       // quando iniciado a partir de agendamento
}
```

Transação: valida máquina existente/ativa → valida sem produção ativa e sem manutenção ativa → insere `EM_ANDAMENTO` (dataInicio = now) → máquina `EM_MANUTENCAO`. Se `agendamentoId` presente, valida/atualiza o agendamento.

**POST `/api/manutencoes/[id]/finalizar`**

```jsonc
{
  "observacoes": "string?",
  "agendar": {
    "sim": true,
    "dataPrevista": "2026-09-25T00:00:00-03:00"
  }
  // ou { "sim": false }
}
```

Transação: valida apontamento `EM_ANDAMENTO` → dataFim = now, status `CONCLUIDA` → máquina `DISPONIVEL` → se `sim`, cria agendamento (`AGENDADO`, dataPrevista ≥ hoje, herda máquina/tipo/atividade/periodicidade) → se apontamento veio de agendamento, agendamento vira `CONCLUIDO`.

### 6.3 Agendamentos (nível `MANUTENCAO` ou `ADM`)

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/agendamentos-manutencao` | Lista (padrão `status=AGENDADO`, filtros `maquinaId`, `status`) |
| GET | `/api/agendamentos-manutencao/[id]` | Detalhe |
| POST | `/api/agendamentos-manutencao/[id]/iniciar` | Inicia manutenção pré-preenchida |
| POST | `/api/agendamentos-manutencao/[id]/cancelar` | Cancela (somente `AGENDADO`) |

### 6.4 Auth das rotas

Extender `requireAuth` (`src/lib/api-auth.ts`) para aceitar lista de níveis permitidos, ex.:

```ts
requireAuth({ allowedNiveis: ['MANUTENCAO', 'ADM'] });
```

Mantendo compatibilidade com o `requiredLevel` atual (`OPERADOR` = qualquer autenticado, `ADM`).

---

## 7. Telas

O módulo é **mobile-first** e reutiliza a linguagem visual atual (`MobileCard`, botões grandes e cheios, ícones `lucide-react`, toasts), com **acessibilidade exemplar (WCAG 2.1 AA)** — ver 7.3.

### 7.1 Mobile (nível MANUTENCAO)

O usuário de nível `MANUTENCAO` **já tem tela de início própria e correta**: ao logar, `src/app/page.tsx` e o `middleware` redirecionam esse perfil para `/apontamento/manutencao` (nunca para a home de produção).

**Home — `/apontamento/manutencao`** (uma ação primária por tela, foco no QR):

| Bloco | Conteúdo |
|---|---|
| Saudação | “Olá, {nome}!” + subtítulo “O que vamos manter hoje?” |
| Ação primária | Botão grande **Ler QR Code** (`w-full h-16 text-lg`, padrão da produção) → `/apontamento/manutencao/leitor` |
| Atalho Agendamentos | Card com contador “X agendamentos hoje (Y atrasados)” → `/apontamento/manutencao/agendamentos` |
| Em andamento | Cards das manutenções ativas do operador → ação **Finalizar** (verde) |
| Histórico recente | Últimas 5 manutenções do operador → `/apontamento/manutencao/historico` |

| Rota | Conteúdo |
|---|---|
| `/apontamento/manutencao/leitor` | Leitor QR (mesmo `Html5QrcodeScanner` do leitor de produção) |
| `/apontamento/manutencao/iniciar?machine=<id>` | Início via QR: máquina fixa + select tipo + select atividade + radio periodicidade + botão Iniciar |
| `/apontamento/manutencao/iniciar?agendamento=<id>` | Início a partir de agendamento: dados pré-preenchidos (somente leitura) + botão Iniciar |
| `/apontamento/manutencao/finalizar?id=<id>` | Término: resumo + observação opcional + pergunta de reagendamento (Sim → data / Não) |
| `/apontamento/manutencao/agendamentos` | Lista `AGENDADO` (clique → inicia pré-preenchido; ação Cancelar no card) |
| `/apontamento/manutencao/historico` | Histórico do operador |

**Nav mobile** (`src/components/mobile/nav.tsx`): variante `MANUTENCAO` → Início, Leitor, Agendamentos (badge de pendentes), Histórico. Sem itens de produção.

**Princípios de mobile-first (aplicados a todas as telas):**

- **Uma ação primária por tela** (botão cheio no fim do card) + ações secundárias discretas (outline).
- Alvos de toque **≥ 48×48px**; campo de destaque com `h-14 text-2xl` quando for o foco da tela.
- Ordem de foco natural: Cabeçalho → Card de contexto → Campos → Ação primária; `inputMode="decimal"` no date/volumes (sem teclado bloqueado).
- **Redirecionamento automático pós-ação** (iniciar → volta para a máquina; finalizar → faz o reagendamento e volta para a home), evitando telas intermediárias — como na produção.
- Estados de carregamento explícitos e `toast` de sucesso/erro em toda ação.

### 7.2 Dashboard (ADM)

`src/components/dashboard/nav.tsx` ganha grupo “Manutenção”:

| Rota | Conteúdo |
|---|---|
| `/dashboard/manutencao` | Visão geral: cards Hoje / Atrasados / Pendentes, em andamento, últimos concluídos (padrão do dashboard atual) |
| `/dashboard/manutencao/agendamentos` | Lista completa (filtro status/máquina/data) + **Cancelar** |
| `/dashboard/manutencao/historico` | Histórico com ação ver |
| `/dashboard/tipos-manutencao` | CRUD de tipos (padrão `motivos-parada`) |
| `/dashboard/atividades-manutencao` | CRUD de atividades (padrão `motivos-parada`) |

### 7.3 Acessibilidade exemplar (WCAG 2.1 AA)

Checklist **obrigatório** para todas as telas do módulo (mobile e dashboard):

1. **Semântica HTML**: `main`, `header`, `nav`, hierarquia `h1`→`h2`; listas reais (`ul/li`) nos cards e menus.
2. **Contraste**: texto ≥ 4.5:1 e UI/gráficos ≥ 3:1; **status sempre com rótulo textual além da cor** (nunca cor sozinha).
3. **Foco visível**: outline `focus-visible` ≥ 2px em todo controle focado.
4. **Alvo de toque**: ≥ 44×44px (48px recomendado) — padrão do módulo.
5. **Labels associados**: todo campo com `<label htmlFor>` (ou `aria-label`); placeholder nunca como única identificação.
6. **Erros acessíveis**: validação com `role="alert"` / `aria-live="polite"` via toast + foco retornado ao campo; botões com `type` explícito.
7. **Teclado/leitores**: ações executáveis por teclado; `aria-label` em botões só-ícone (Finalizar, Cancelar, iniciar); componentes Radix já trazem ARIA de diálogos/selects.
8. **QR Code com fallback**: além da câmera, manter busca/digitação da máquina (acessibilidade motora); anunciar leitura com `aria-live`.
9. **Movimento**: respeitar `prefers-reduced-motion`; nenhuma informação essencial só em animação.
10. **Modais/drawers**: foco preso, `Escape` fecha, retorno de foco ao trigger (Radix `Dialog`/`Sheet` já garantem).

### 7.4 Relatórios de manutenção (ADM)

Mesmo padrão da tela de relatórios atual (abas + filtros + exportação PDF/Excel via `jspdf`/`exceljs` — `src/app/dashboard/relatorios/utils/exportar.ts`):

- **Por máquina**: manutenções no período, tempo total e min médio, status.
- **Por tipo e atividade**: Corretiva vs Preventiva; por atividade (Mecânica, Elétrica, Programação, Limpeza, Lubrificação).
- **Por operador**: quantidade de manutenções e tempo dedicado.
- **Agendamentos**: cumpridos, atrasados e cancelados no período.
- Exportação PDF/Excel reutilizando o utilitário atual (título + período + tabela).
- KPIs futuros (backlog): MTBF, MTTR, disponibilidade por máquina.

---

## 8. Regras de negócio e validações

1. `MANUTENCAO` autentica com matrícula (sem senha), como `OPERADOR`.
2. QR machine → rota de manutenção somente para `MANUTENCAO`; `OPERADOR`/`ADM` seguem para produção.
3. Início exige máquina **ativa** e sem conflito (produção ativa ou manutenção ativa → `400`).
4. `dataPrevista` do agendamento ≥ data atual (validação no finalizar e no reagendamento).
5. Cancelamento de agendamento somente se `AGENDADO` (`400` caso contrário).
6. Apontamento veio de agendamento: agendamento acompanha o ciclo (`EM_ANDAMENTO` ao iniciar, `CONCLUIDO` ao finalizar).
7. Reagendamento no término é sempre opcional de fato (existe o botão “não agendar”), mesmo em manutenção periódica.
8. Máquina volta a `DISPONIVEL` ao finalizar ou cancelar manutenção ativa.
9. CRUDs de catálogo validam código único e nome mínimo (padrão do projeto).
10. Nível `MANUTENCAO` no mobile: `page.tsx`/`middleware` redirecionam para `/apontamento/manutencao`; o perfil não acessa a home/rotas de produção (`/apontamento` raiz) nem o dashboard.

---

## 9. Mapa de impacto no código atual

| Área | Arquivos |
|---|---|
| Schema/nível | `src/lib/db/schema/usuarios.ts` (enum nível), `src/lib/db/schema/maquinas.ts` (status `EM_MANUTENCAO`) |
| Novos schemas | `src/lib/db/schema/tipos-manutencao.ts`, `atividades-manutencao.ts`, `manutencoes.ts`, `agendamentos-manutencao.ts` + `schema/index.ts` |
| Auth | `src/lib/api-auth.ts` (allowedNiveis), `src/app/api/usuarios/route.ts` (aceita MANUTENCAO), `src/lib/auth.ts` (sem mudança de validação) |
| Redirect/nível | `src/middleware.ts`, `src/app/page.tsx`, `src/app/apontamento/layout.tsx`, `src/components/mobile/nav.tsx`, `src/components/dashboard/nav.tsx` |
| QR | `src/app/apontamento/leitor/page.tsx`, `src/app/qr/machine/[id]/page.tsx` (branch por nível) |
| Novas APIs | `src/app/api/tipos-manutencao/**`, `atividades-manutencao/**`, `manutencoes/**`, `agendamentos-manutencao/**` |
| Novas telas mobile | `src/app/apontamento/manutencao/**` |
| Novas telas dashboard | `src/app/dashboard/manutencao/**`, `tipos-manutencao/**`, `atividades-manutencao/**` |
| Status máquina em telas existentes | máquina mobile `[id]`, kanban, `maquinas/disponiveis`, relatórios (apenas renderização do novo status) |
| Seed | `src/lib/db/seed.ts` (níveis, tipos, atividades) |
| Migrations | `migrations/` ou scripts incrementais (`src/lib/db/migrations/`) |
| Testes | novos: schemas zod, regras de finalizar/reagendar/cancelar; ajuste `usuarios`/`data-table` se necessário |

---

## 10. Decisões assumidas (validar)

1. **[DECISÃO]** Novo status de máquina **`EM_MANUTENCAO`** (aditivo ao enum) para não confundir com `PARADA` (produtiva).
2. **[DECISÃO]** Modelo **dedicado** (`manutencoes`), sem reutilizar `apontamentos`/`producoes_avulsas` (semântica e relatórios próprios).
3. **[DECISÃO]** Agendamento pode ser criado **apenas** pelo término de uma manutenção (RF5). Criação manual pelo dashboard fica como melhoria futura (backlog).
4. **[DECISÃO]** Ao iniciar por agendamento, os campos são somente leitura (requisito “só botão iniciar”); se precisar ajustar tipo/atividade, cancelar o agendamento e criar manual.
5. **[DECISÃO]** Manutenção em andamento **não** trava o cadastro de outra na mesma máquina: é bloqueada no início (RF9).
6. **[DECISÃO]** `MANUTENCAO` não enxerga produção no menu mobile (nav dedicado).
7. **[CONTEXTO]** O benchmarking (seção 11) valida as decisões acima: `EM_MANUTENCAO` ≈ bloqueio de workcenter (Odoo); QR na máquina ≈ disparo pelo painel do workcenter; manutenção durante agendamento ≈ log agendado (ERPNext). Planos automáticos por intervalo ficam no backlog (não alteram a decisão do usuário).

---

## 11. Benchmarking — sistemas open source

Comparação conceitual do módulo com as principais implementações abertas de manutenção (CMMS/TPM). **Nenhuma é adotada como dependência**; servem de referência para validar o desenho.

| Sistema | Conceito | Como o apontador encara |
|---|---|---|
| **Odoo Maintenance** (LGPL) | "Equipment" (ativo) com MTBF/MTTR e custo; **requests** com tipo Corretiva/Preventiva, prioridade (0–3), equipe/responsável, data programada, kanban + calendário; **plano de manutenção** por equipment (frequência) gera preventivas automaticamente; **bloqueio do workcenter**; pedido disparado pelo painel do workcenter | QR na máquina ≈ "disparar pelo painel do workcenter" (valida o fluxo central). `EM_MANUTENCAO` ≈ bloquear workcenter. Prioridade/equipe/plano automático → backlog |
| **ERPNext/Frappe Asset Maintenance** (GPLv3) | Maintenance **plan** por asset (tasks com tipo, início, periodicidade, responsável) gera **Maintenance Logs**; log vencido precisa ser concluído ou cancelado; visita com status Scheduled/Unscheduled/Breakdown e % de conclusão | "Log" ≈ nossa `manutencoes`; "plan" ≈ nossa regra de reagendar no término (backlog futuro: intervalo em dias). Obrigar concluir/cancelar log vencido ≈ nosso tratamento de agendamentos |
| **GLPI** (GPLv2+) | ITSM/CMDB: inventário de ativos + chamados (tickets) vinculados a ativos; planejamento | Foco em ticket/inventário, mais pesado que o fluxo de chão de fábrica; adotamos apenas a ideia de vincular ocorrência a ativo (máquina) |
| **Snipe-IT** (AGPL) | Asset management com **registro de manutenção** por ativo (notas, custo, garantia) | ≈ nosso histórico por máquina; sem workflow de apontamento (não há QR/operação) |

### Aprendizados incorporados

1. **Disparo no equipamento** (Odoo) e **bloqueio do workcenter**: validam a rota QR → manutenção e o status `EM_MANUTENCAO`.
2. **Prioridade** (Odoo 0–3): não exigida pelo usuário; entra como melhoria futura (campo opcional em agendamentos + ordenação).
3. **Plano de manutenção por intervalo** (Odoo/ERPNext): hoje o reagendamento é manual no término (decisão do usuário). Futuro: `intervaloEmDias` para **sugerir** a próxima data automaticamente, mantendo o operador confirmando.
4. **Scheduled/Unscheduled/Breakdown** (ERPNext) ≈ nossa **Periódica/Eventual/Corretiva**: mapeamento conceitual claro; mantemos os termos simples do chão de fábrica.
5. **Kanban + calendário** (Odoo/GLPI): o dashboard de manutenção pode evoluir para kanban (por status) e calendário (por `dataPrevista`) — backlog.
6. **MTBF/MTTR por ativo** (Odoo/ERPNext): reforça o KPI de backlog já previsto.
7. **Equipe/responsável** (Odoo/ERPNext): hoje o responsável é o operador logado; "equipe de manutenção" como entidade fica no backlog.
8. **Checklist / % de conclusão** (Odoo worksheet, ERPNext "partially completed"): reforça o item de checklist no backlog.

---

## 12. Plano de implantação (fases)

- **Fase 1 — Fundação** ✅ *concluída (2026-09-17)*: migrations + schemas Drizzle/Zod (4 tabelas: `tipos_manutencao`, `atividades_manutencao`, `manutencoes`, `agendamentos_manutencao`), enum `MANUTENCAO` e `EM_MANUTENCAO`, seed incremental idempotente (`db:seed-manutencao`, não trunca), `schema/index.ts`.
- **Fase 2 — Auth e QR** ✅ *concluída (2026-09-17)*: `api-auth` (allowedNiveis com precedência sobre requiredLevel + testes), redirects (`middleware` com rotas `/apontamento/manutencao` para MANUTENCAO/ADM, `page.tsx`), leitor + QR machine por nível (MANUTENCAO → `/apontamento/manutencao/iniciar?machine=<id>`), nav/header mobile com variante MANUTENCAO, CRUD usuários aceita `MANUTENCAO` (form dashboard + `usuarioUpdateSchema`), home mínima de manutenção navegável (Fase 4 completa com dados).
- **Fase 3 — CRUDs de catálogo** ✅ *concluída (2026-09-17)*: APIs completas (`GET/POST` + `GET/PUT/DELETE` com validação de uso antes de excluir) para `tipos-manutencao` e `atividades-manutencao`; telas dashboard com `DataTable` + `FormModal` (padrão catálogo existente); itens no menu admin com ícones `Wrench`/`ClipboardList`; GET acessível a `MANUTENCAO` (para Fase 4 mobile); `tsc --noEmit` limpo, 108/108 testes, lint ok.
- **Fase 4 — Apontamento mobile** ✅ *concluída (2026-09-17)*: home com dados reais (saudação, botão Ler QR → leitor compartilhado, card Agendamentos com contador hoje/atrasados, em andamento do operador com ação Finalizar, histórico recente 5); iniciar via QR e agendamento (pré-preenchido somente leitura, catálogos ativos); finalizar com observação opcional e pergunta de reagendamento (Sim → data futura/hoje); agendamentos (lista `AGENDADO`, Iniciar/Cancelar com confirmação); histórico do operador com status concluída/cancelada; badge de pendentes no nav mobile; middleware libera `/apontamento/leitor` para MANUTENCAO (única rota de produção para escanear); `tsc --noEmit` limpo, 108/108 testes, lint ok (2 warnings `exhaustive-deps` no padrão das telas existentes).
- **Fase 5 — Dashboard de manutenção**: visão geral, agendamentos (cancelar), histórico; item no menu.
- **Fase 6 — Testes e validação**: unitários (schemas, fluxos finalizar/reagendar/cancelar), `tsc --noEmit`, `lint`, `build`, atualização das docs e do glossário.

### Fora de escopo / backlog

- Relatórios e KPIs (MTBF/MTTR, disponibilidade por máquina, gráficos).
- Agendamento manual pelo dashboard.
- Checklist/passo a passo da manutenção (itens de inspeção) e % de conclusão.
- Controle de estoque/peças e ordem de serviço formal.
- Notificações de agendamentos vencidos (hoje a tela já os evidencia).
- Prioridade de manutenção (0–3, como Odoo) com ordenação de agendamentos.
- Plano de manutenção por intervalo em dias (sugerir a próxima data no reagendamento, mantendo confirmação do operador).
- Visão kanban (por status) e calendário (por `dataPrevista`) no dashboard.
- Equipe de manutenção / responsável (hoje o responsável é o operador logado).