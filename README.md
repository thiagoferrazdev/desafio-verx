# Desafio Verx — Fluxo de caixa diário

Monorepo em **TypeScript** com **NestJS**, organizado em **Clean Architecture** (domínio, casos de uso, portas e adaptadores). Dois serviços HTTP compartilham **PostgreSQL** e integram-se por fila **SQS**; em desenvolvimento local a fila é simulada com **ElasticMQ** (API compatível com a AWS).

## Visão geral

| Serviço | Porta padrão | Função |
|--------|---------------|--------|
| **ledger-service** | `3000` | Lançamentos (crédito/débito), idempotência por `requestId`, padrão **outbox** para publicar o evento `entry-created` na fila. |
| **daily-balance-service** | `3001` | Consome a fila, projeta saldo diário por comerciante e expõe consulta por data. |

Fluxo resumido:

1. Cliente chama `POST /entries` no ledger.
2. Em uma transação: grava o lançamento, a idempotência e uma linha em `ledger.outbox_events`.
3. Um processo periódico publica eventos pendentes na fila SQS.
4. O serviço de saldo faz *poll* da mesma fila, aplica o evento de forma idempotente (`balance.processed_messages`) e atualiza `balance.daily_balances`.

Os esquemas SQL estão em `infra/postgres/init.sql` (`ledger` e `balance`).

## Pré-requisitos

- **Node.js** (recomendado 20+)
- **Docker** e **Docker Compose**

## Infraestrutura local

Na raiz do repositório:

```bash
docker compose up -d
```

Sobe:

- **PostgreSQL 16** em `localhost:5432` (usuário, senha e banco: `cashflow`), com `init.sql` aplicado na primeira subida.
- **ElasticMQ** em `localhost:9324`, com a fila `entry-created` definida em `infra/elasticmq/elasticmq.conf`.

## Instalação e build

```bash
npm install
npm run build
```

A saída compilada fica em `dist/` (ignorada pelo Git).

## Executar em desenvolvimento

Com o Docker no ar, em dois terminais:

```bash
npm run dev:ledger
```

```bash
npm run dev:daily-balance
```

Após `npm run build`, o equivalente é:

```bash
npm run start:ledger
npm run start:daily-balance
```

Para SQS local, configure `SQS_ENDPOINT` (veja a tabela abaixo) nos dois processos.

## Variáveis de ambiente

Valores padrão costumam bastar para `docker compose` na máquina local.

| Variável | Descrição | Padrão (exemplo) |
|----------|-----------|------------------|
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | PostgreSQL | `localhost`, `5432`, `cashflow`, `cashflow`, `cashflow` |
| `LEDGER_PORT` | HTTP do ledger | `3000` |
| `DAILY_BALANCE_PORT` | HTTP do saldo diário | `3001` |
| `API_KEY` | Se definida, exige o header `x-api-key` | *(vazio = sem autenticação)* |
| `SQS_QUEUE_URL` | Fila usada pelo publisher e pelo consumer | `http://localhost:9324/000000000000/entry-created` |
| `SQS_REGION` | Região do cliente AWS SDK | `us-east-1` |
| `SQS_ENDPOINT` | Endpoint (ElasticMQ local) | ex.: `http://localhost:9324` |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | Credenciais do SDK (local: placeholders) | `test` / `test` |
| `OUTBOX_PUBLISH_INTERVAL_MS` | Intervalo do publicador outbox (ledger) | `2000` |
| `SQS_POLL_INTERVAL_MS` | Intervalo do poller (daily-balance) | `2000` |

## API

Com `API_KEY` definida, envie `x-api-key: <valor>` nas rotas abaixo.

### Ledger (`LEDGER_PORT`, padrão 3000)

- `POST /entries` — cria lançamento.
- `GET /entries?merchantId=...` — lista lançamentos (filtro opcional).

Exemplo de corpo (`type`: `DEBIT` ou `CREDIT`; `amount` em unidades monetárias, ex.: reais):

```json
{
  "merchantId": "merchant-1",
  "type": "CREDIT",
  "amount": 100.5,
  "description": "Venda",
  "occurredAt": "2026-04-01T12:00:00.000Z",
  "requestId": "req-unique-001"
}
```

### Daily balance (`DAILY_BALANCE_PORT`, padrão 3001)

- `GET /daily-balance?merchantId=...&date=YYYY-MM-DD` — saldo agregado do dia.

### Ambos

- `GET /health` — verificação de saúde.

## Testes

```bash
npm test
npm run test:e2e
```

Informações sobre testes de carga: `npm run test:load:info`.

## Estrutura do repositório

```
apps/
  ledger-service/          # API de lançamentos, outbox, publisher SQS
  daily-balance-service/     # Poller SQS, projeção de saldo, API de consulta
libs/
  contracts/                 # Eventos (ex.: entry-created)
  observability/             # Logger, correlation id, filtros, health
  shared-infra/              # Postgres, API key
  shared-kernel/             # Regras compartilhadas (ex.: Money)
docs/                        # Diagramas (drawio) e PDFs de arquitetura
infra/
  postgres/                  # init.sql
  elasticmq/                 # elasticmq.conf
test/
  e2e/                       # Testes ponta a ponta
  load/                      # Scripts de carga
```

## Stack principal

NestJS 10, PostgreSQL (`pg`), AWS SDK (SQS), class-validator, Jest.

---

Projeto de referência para arquitetura de fluxo de caixa com consistência eventual via fila e idempotência nas bordas.
