# Domínios e Capacidades de Negócio

## Visão geral dos domínios

A solução está separada em dois bounded contexts:

| Domínio | Serviço principal | Objetivo |
|---|---|---|
| `Ledger` | `ledger-service` | Registrar lançamentos com integridade transacional e publicar fatos de negócio para outros consumidores |
| `Daily Balance` | `daily-balance-service` | Consolidar o saldo diário por comerciante e responder consultas agregadas |

Essa separação existe para evitar que o modelo de escrita fique acoplado ao modelo de leitura.

## Domínio Ledger

### Responsabilidade

O `Ledger` representa o domínio transacional de lançamentos financeiros.

Ele é responsável por:

- receber crédito e débito;
- validar o tipo do lançamento;
- persistir o fato de negócio de forma confiável;
- impedir duplicidade por repetição da mesma requisição;
- registrar o evento de integração na outbox;
- expor consulta do histórico de lançamentos.

### Capacidades de negócio

- registrar um novo lançamento financeiro;
- classificar o lançamento como `CREDIT` ou `DEBIT`;
- relacionar o lançamento a um `merchantId`;
- garantir idempotência por `requestId`;
- listar lançamentos por comerciante.

### Entidades e dados principais

- `ledger.entries`
- `ledger.request_idempotency`
- `ledger.outbox_events`

### Por que esse domínio existe separado

O problema central do ledger é garantir que o registro do lançamento seja confiável mesmo que exista falha na integração com outros componentes.

Se escrita e consolidação de saldo estivessem no mesmo fluxo síncrono:

- uma falha na parte de consolidação poderia impedir o registro do lançamento;
- a latência da escrita seria maior;
- a solução ficaria mais acoplada e frágil.

Por isso, o ledger foi mantido como dono da operação transacional e emissor dos fatos de negócio.

## Domínio Daily Balance

### Responsabilidade

O `Daily Balance` representa a leitura consolidada do saldo diário por comerciante.

Ele é responsável por:

- consumir eventos gerados pelo ledger;
- projetar o impacto desses eventos no saldo diário;
- evitar reprocessamento da mesma mensagem;
- expor consulta agregada otimizada.

### Capacidades de negócio

- consolidar créditos do dia;
- consolidar débitos do dia;
- calcular o saldo líquido por data;
- responder consultas por `merchantId` e `date`;
- impedir duplicidade no consumo de eventos.

### Entidades e dados principais

- `balance.daily_balances`
- `balance.processed_messages`

### Por que esse domínio existe separado

O objetivo aqui não é ser a fonte de verdade dos lançamentos, e sim da leitura agregada.

Essa separação permite:

- respostas rápidas e previsíveis;
- consultas simples sobre uma projeção pronta;
- evolução futura de outras visões de leitura;
- escala separada entre escrita e leitura.

## Relação entre os domínios

O relacionamento entre os domínios é orientado a eventos:

- o `Ledger` registra o fato e publica um evento;
- o `Daily Balance` consome esse evento e atualiza sua projeção;
- não existe chamada HTTP síncrona do saldo dentro do fluxo de escrita.

Essa abordagem reduz acoplamento temporal e suporta consistência eventual de forma consciente.

## Fronteiras de responsabilidade

### O que pertence ao Ledger

- registro do lançamento;
- idempotência da requisição HTTP;
- garantia transacional local;
- persistência da outbox;
- histórico de lançamentos.

### O que pertence ao Daily Balance

- consolidação por data;
- projeção do saldo;
- idempotência no consumo;
- consulta agregada;
- resposta otimizada para leitura.

## Trade-off principal da separação

O principal trade-off desta modelagem é aceitar que:

- o lançamento pode existir no ledger;
- e o saldo consolidado ainda não refletir imediatamente esse fato.

Essa diferença não é um erro do sistema. Ela é uma consequência intencional do desacoplamento e da consistência eventual.

## Benefício arquitetural da abordagem

Ao explicitar os domínios dessa forma, a solução deixa claro que:

- integridade transacional e velocidade de consulta são necessidades diferentes;
- cada contexto pode evoluir com prioridades distintas;
- a arquitetura foi desenhada por responsabilidade de negócio, e não apenas por camada técnica.
