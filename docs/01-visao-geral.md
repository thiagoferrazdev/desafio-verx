# Visão Geral da Solução

## Contexto do problema

O desafio consiste em desenhar uma solução para controle de fluxo de caixa diário por comerciante, capaz de:

- receber lançamentos de crédito e débito;
- evitar duplicidade de processamento;
- manter a operação de escrita confiável;
- consolidar o saldo diário para consulta rápida;
- explicitar raciocínio arquitetural, trade-offs e limites da abordagem.

Em sistemas desse tipo, os principais conflitos costumam aparecer entre:

- confiabilidade da escrita transacional;
- rapidez da consulta agregada;
- tolerância a falhas em componentes externos;
- idempotência em chamadas e mensagens;
- simplicidade operacional do MVP versus robustez de produção.

## Objetivos da solução

Os objetivos adotados para este case foram:

1. preservar a integridade do registro de lançamentos;
2. desacoplar escrita e leitura para evitar recálculo sob demanda;
3. tornar explicitamente eventual a consistência entre operação transacional e saldo consolidado;
4. reduzir risco de duplicidade tanto na borda HTTP quanto no consumo assíncrono;
5. estruturar a implementação de modo claro para avaliação arquitetural.

## Escopo implementado

O repositório implementa:

- um `ledger-service` para criação e listagem de lançamentos;
- um `daily-balance-service` para consulta de saldo diário;
- integração assíncrona por evento `entry-created`;
- persistência em PostgreSQL com separação lógica por schema;
- simulação local da fila com ElasticMQ;
- idempotência por `requestId` na entrada do ledger;
- idempotência por `messageId` no consumidor do saldo;
- publicação de eventos via padrão Transactional Outbox;
- testes unitários e testes e2e cobrindo fluxo lógico.

## Escopo que não está implementado como capacidade madura

Embora a base seja boa para o desafio, a solução ainda não implementa uma camada completa de operação de produção, por exemplo:

- DLQ e política formal de retry;
- observabilidade com métricas, tracing e alertas;
- isolamento físico de banco por contexto;
- controle robusto de concorrência da outbox em múltiplas instâncias;
- pipeline automatizado de geração dos PDFs a partir dos Markdown.

Esses itens aparecem neste material como limitações atuais ou evolução futura, e não como capacidades concluídas.

## Abordagem arquitetural

A solução foi organizada em dois contextos principais:

- `Ledger`: domínio de escrita transacional e registro de lançamentos.
- `Daily Balance`: domínio de leitura agregada e consulta do saldo diário.

Essa escolha foi feita para separar duas preocupações que costumam evoluir de forma diferente:

- a escrita precisa ser confiável, idempotente e transacional;
- a leitura precisa ser rápida, simples e barata de consultar.

Em vez de recalcular o saldo a partir do histórico completo a cada consulta, a solução materializa uma projeção diária a partir de eventos publicados pelo ledger.

## Princípios orientadores

Os princípios adotados ao longo da solução foram:

- **explicitar trade-offs** em vez de esconder limitações;
- **isolar responsabilidades** por contexto de negócio;
- **usar consistência eventual de forma consciente**;
- **tratar duplicidade como fato provável** em chamadas e mensageria;
- **priorizar clareza arquitetural** sem tornar o case artificialmente complexo.

## Mapa da documentação

- [02-dominios-e-capacidades.md](/Users/thiagoferraz/Documents/pessoal/desafio-verx/docs/02-dominios-e-capacidades.md)
- [03-arquitetura-e-integracoes.md](/Users/thiagoferraz/Documents/pessoal/desafio-verx/docs/03-arquitetura-e-integracoes.md)
- [04-decisoes-tecnicas-e-nfrs.md](/Users/thiagoferraz/Documents/pessoal/desafio-verx/docs/04-decisoes-tecnicas-e-nfrs.md)
- [05-testes-e-validacao.md](/Users/thiagoferraz/Documents/pessoal/desafio-verx/docs/05-testes-e-validacao.md)
- [06-evolucao-da-arquitetura.md](/Users/thiagoferraz/Documents/pessoal/desafio-verx/docs/06-evolucao-da-arquitetura.md)
