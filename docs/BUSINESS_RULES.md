# Regras de Negócio

Regras operacionais e fórmulas implementadas no Apontador. Para localização no código, ver `src/lib` e `src/app/api`.

---

## Autenticação

1. Todo acesso exige sessão; o painel administrativo exige `nivel === 'ADM'`.
2. **Administrador (ADM)**: a senha informada é comparada com o hash **bcrypt** salvo na coluna `usuarios.senha` (`src/lib/auth.ts`).
3. **Operador (OPERADOR)**:
   - Sem senha cadastrada → a senha válida é a **própria matrícula**.
   - Com senha cadastrada → usa a senha do cadastro (também armazenada como hash bcrypt).
4. O campo `loginMode` do login é preservado na sessão/JWT (`normal` ou `avulso`); o modo **avulso** habilita o fluxo de produção sem OP (produções avulsas).
5. Sem sessão: `401`. Sessão de não-ADM em rota administrativa: `403`.

---

## Ciclo de vida da OP

Estados: `ABERTA → EM_ANDAMENTO → FINALIZADA | CANCELADA`.

1. **Importação (cron/manual)**: OPs vindas do Systêxtil entram como `ABERTA`, estágio `00/NENHUM`, máquina `00/NENHUMA`. OPs existentes (mesmo `op`) são **ignoradas**.
2. **Movimentação (Kanban)** — `POST /api/ops/[id]/mover`:
   - Exige estágio, máquina (`DISPONIVEL`) e opcionalmente `metragemFinalizada` + `isReprocesso`.
   - Finaliza o apontamento `EM_ANDAMENTO` atual da OP e libera a máquina anterior.
   - Cria apontamento `PRODUCAO` `EM_ANDAMENTO` na nova máquina e a ocupa (`EM_PROCESSO`).
   - Atualiza `codEstagioAtual`/`estagioAtual`/`codMaquinaAtual`/`maquinaAtual` e `dataUltimoApontamento`.
   - Tudo em transação: se qualquer passo falhar, nada é persistido.
3. **Finalização**: registra a metragem processada, conclui o apontamento e atualiza a OP.
4. **Cancelamento**: registra `motivoCancelamento`, `codMotivoCancelamento`, `dataCancelamento` e `usuarioCancelamentoId`.

---

## Máquinas

- `status` ∈ `DISPONIVEL | EM_PROCESSO | PARADA`.
- Apenas máquinas `DISPONIVEL` recebem OP (regra validada no mover).
- Ao iniciar produção a máquina vai para `EM_PROCESSO`; ao finalizar (ou desfazer), volta a `DISPONIVEL`.
- `tempoDiarioDisponivel` (default `1440` min = 24h) baseia o cálculo de tempo disponível dos relatórios.

---

## Apontamentos (modelo unificado)

- Um apontamento é **PRODUÇÃO** ou **PARADA** (`tipo`).
- `status` ∈ `EM_ANDAMENTO | CONCLUIDO | CANCELADO`.
- Produção: usa `opId`, `estagioId`, `metragemProcessada`, `isReprocesso`.
- Parada: usa `motivoParadaId` e `observacoes`.
- Campos do tipo não aplicável permanecem nulos.

> Nas APIs de apontamento o `estagioId` da produção é **opcional** (validação Zod), embora os fluxos de Kanban sempre o vinculem. Fluxe de produção sem estágio pode ocorrer por `POST /api/apontamentos` genérico.

---

## Paradas e produções paralelas

- **`paradas_maquina`**: parada com `dataInicio` obrigatória e `dataFim` opcional (aberta). `operadorId` obrigatório; `opId` opcional.
- **`producoes`**: produção vinculada à OP, com `metragemProgramada` obrigatória e `dataFim` opcional.
- **`producoes_avulsas`**: produção sem OP; vínculo direto com `produtoId`; `metragem` e `dataFim` opcionais.

---

## Eficiência e indicadores

Fórmulas usadas em `src/app/api/relatorios/route.ts` e `src/app/api/relatorios/eficiencia/route.ts`:

1. **Tempo de produção** (min) = `EXTRACT(EPOCH FROM (data_fim - data_inicio)) / 60`.
2. **Grupo do produto** = segundo segmento do código (`produtoOp.split('.')[1]`).
3. **Metragem esperada** (referência `produto`):
   `tempoMinutos × velocidade` do estágio no `produtos.parametrosEficiencia[estagio]`.
4. **Metragem esperada** (referência `maquina`): `tempoMinutos × maquinas.velocidadePadrao`.
5. **Eficiência** (%) = `metragemReal / metragemEsperada × 100` (0 quando esperado = 0).
6. **Tempo de parada** por máquina = soma de `(data_fim - data_inicio)` de `paradas_maquina` finalizadas no período.
7. **Disponibilidade** (%) = `tempoProducao / (tempoProducao + tempoParada) × 100` (100 quando não há apontamentos).
8. **Tempo disponível** = `tempoDiarioDisponivel × diasNoPeríodo`.
9. **Metros por minuto** = `metragemReal / tempoProducao`.

Datas de filtro são interpretadas em fuso `America/Sao_Paulo` (`-03:00`). Período padrão do `eficiencia`: últimos 30 dias.

---

## Integração ERP (Systêxtil)

- Autenticação OAuth2 `client_credentials`, Basic auth `clientId:clientSecret`, body `grant_type=client_credentials`.
- Token em cache em memória por `clientId` até `expires_in − 60s`.
- Credenciais incompletas (sem `tokenUrl`, `clientId` ou `clientSecret`) → erro `Credenciais incompletas`.
- Resposta esperada: `{ items: [{ op, produto, ... }] }`. Sem `items`, retorna lista vazia.
- Importação: OP sem `op` ou sem `produto` é registrada como erro, não quebra a importação.

---

## Gobernanza de dados sensíveis

- `clientSecret` nunca é retornado pelas APIs: GET devolve mascarado + `hasSecret`.
- PUT não atualiza o secret se o valor enviado for vazio ou mascarado.

---

## Configurações do sistema

- `PUT /api/configuracoes` aceita um objeto chave-valor e grava cada chave com upsert (`onConflictDoUpdate` em `configuracoes.chave`).
- As chaves são livres; exemplos de uso: parâmetros de exibição e comportamento do painel/mobile.