# Glossário

Termos usados no projeto Apontador.

## Geral

- **Apontador**: o próprio sistema; também o fluxo mobile de apontamento de produção.
- **MES (Manufacturing Execution System)**: sistema de execução de manufatura que acompanha e registra a produção em chão de fábrica.
- **OP (Ordem de Produção)**: ordem que define o que produzir, identificada por um número (`op`), com produto, quantidades e campos vindos do ERP.
- **ERP Systêxtil**: sistema ERP da indústria têxtil com o qual o Apontador se integra.

## Autenticação e perfis

- **ADM**: administrador. Acessa o painel (`/dashboard`), relatórios e integração. Senha comparada com hash bcrypt.
- **OPERADOR**: operador de chão de fábrica. Acessa o fluxo mobile (`/apontamento`); senha padrão = própria matrícula.
- **loginMode**: modo de login persistido no JWT. `normal` (login com matrícula/senha) ou `avulso` (produção avulsa, sem OP).
- **JWT/Token**: sessão gerada pelo NextAuth (estratégia JWT).

## Producão e apontamentos

- **Apontamento**: registro de evento de produção ou de parada em uma máquina (tabela `apontamentos`).
- **Apontamento unificado**: modelo em que `apontamentos` guarda tanto **PRODUCAO** quanto **PARADA** via campo `tipo`.
- **PRODUCAO**: apontamento de produção (com OP, estágio, metragem, reprocesso).
- **PARADA**: apontamento de parada (com motivo e observações).
- **EM_ANDAMENTO / CONCLUIDO / CANCELADO**: status de um apontamento.
- **isReprocesso**: marca que a produção entrou em reprocesso (retrabalho).
- **Produção avulsa**: produção sem OP, vinculada diretamente a um produto ("modo avulso").

## Máquinas e estágios

- **Estágio**: etapa do fluxo produtivo (ex.: preparação, tecelagem, acabamento); usado no Kanban.
- **Kanban**: quadro visual de movimentação de OPs entre estágios/máquinas (drag & drop).
- **DISPONIVEL / EM_PROCESSO / PARADA**: status da máquina. Só máquina `DISPONIVEL` recebe OP.
- **tempoDiarioDisponivel**: minutos/dia em que a máquina está disponível (default 1440).
- **velocidadePadrao**: velocidade de referência da máquina para cálculo de eficiência.

## Produtos

- **parametrosEficiencia**: JSON por estágio com `tempoPadrao`, `rendimento` e `velocidade` do produto.
- **grupo**: segmento do código do produto (ex.: em `TEC.001`, grupo = `001`).
- **composicao**: JSON da composição do tecido (algodão, poliéster, elastano, ...).

## Indicadores

- **Eficiência (%)**: `metragemReal / metragemEsperada × 100`.
- **metragemEsperada**: `tempoMinutos × velocidade` (do produto por estágio ou da máquina).
- **Disponibilidade (%)**: `tempoProducao / (tempoProducao + tempoParada) × 100`.
- **OEE (Overall Equipment Effectiveness)**: indicador de eficiência global de equipamento.
- **Metros por minuto**: `metragemReal / tempoProducao`.

## Integração

- **sistemas_integracao**: cadastro de sistemas ERP com credenciais OAuth2 (`tokenUrl`, `clientId`, `clientSecret`).
- **apis_integracao**: endpoints consumíveis dentro de um sistema (`apiUrl`, `metodo`).
- **OAuth2 client_credentials**: fluxo de obtenção de token com Basic auth (`clientId:clientSecret`).
- **Token cache**: armazenamento em memória do token obtido, por `clientId`, até `expires_in − 60s`.
- **Importação de OPs**: processo (manual ou cron) que traz OPs do ERP e cria os registros ausentes.