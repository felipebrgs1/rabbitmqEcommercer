# RabbitMQ Ecommerce — Turborepo + TypeScript + Zod

Projeto de aprendizado de **RabbitMQ** simulando um e-commerce real.

- **Frontend**: React + Vite + TypeScript (`apps/web`)
- **Backend**: Express + TypeScript + RabbitMQ (`apps/api`)
- **Contratos**: Zod schemas e tipos compartilhados (`packages/shared`)
- **Monorepo**: Turborepo + pnpm workspaces
- **Infra**: Docker + Docker Compose (RabbitMQ com Management Plugin)

---

## Arquitetura

```
┌─────────────┐      HTTP/REST       ┌──────────────┐
│   web       │ ◄──────────────────► │     api      │
│  (React)    │                      │   (Express)  │
└─────────────┘                      └──────┬───────┘
                                            │
                                            │ publica mensagens
                                            ▼
                                    ┌───────────────┐
                                    │  RabbitMQ     │
                                    │   Broker      │
                                    └───────┬───────┘
                                            │
         ┌──────────────────────────────────┼──────────────────────────────────┐
         │                                  │                                  │
         ▼                                  ▼                                  ▼
 ┌───────────────┐                ┌───────────────┐                ┌───────────────┐
 │ checkout.queue│                │ payment.queue │                │inventory.queue│
 │  (pedidos)    │                │  (pagamento)  │                │  (estoque)    │
 └───────┬───────┘                └───────┬───────┘                └───────┬───────┘
         │                                │                                │
         ▼                                ▼                                ▼
  reserva estoque                 processa pagamento              decrementa stock
         │                                │                                │
         │                                ▼                                │
         │                       ┌───────────────┐                        │
         │                       │payment.retry  │                        │
         │                       │  (DLX + TTL)  │                        │
         │                       └───────────────┘                        │
         │                                                                │
         └──────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │notification.queue│
                       │  (notificações) │
                       └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │ dead-letter.queue│
                       │  (falhas críticas)│
                       └─────────────────┘
```

### Exchanges e Filas

| Exchange | Tipo | Filas vinculadas | Routing Key |
|----------|------|------------------|-------------|
| `checkout.exchange` | direct | `checkout.queue` | `checkout.created` |
| `inventory.exchange` | direct | `inventory.queue` | `inventory.reserve` |
| `payment.exchange` | direct | `payment.queue`, `payment.retry.queue` (via DLX) | `payment.process` |
| `notification.exchange` | fanout | `notification.queue` | — |
| `dead-letter.exchange` | direct | `dead-letter.queue` | `dead-letter` |

---

## Pré-requisitos

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)
- (Opcional para desenvolvimento local) [pnpm](https://pnpm.io/installation) `11.13.1` + [Node.js](https://nodejs.org/) `24`

---

## Como rodar com Docker

```bash
# Clone/entre no projeto
cd rabbitmq-ecommerce-turborepo

# Sobe RabbitMQ, API e Web
docker-compose up --build

# Acesse:
# - Aplicação: http://localhost:3000
# - API:        http://localhost:3001
# - RabbitMQ Management: http://localhost:15672 (admin / admin)
```

Para parar:

```bash
docker-compose down
```

Para remover volumes (limpa dados do RabbitMQ):

```bash
docker-compose down -v
```

---

## Como rodar em desenvolvimento (sem Docker)

> Requer RabbitMQ rodando localmente em `amqp://localhost:5672`.

```bash
# Instale dependências do monorepo
pnpm install

# Build do pacote compartilhado
pnpm --filter @repo/shared build

# Terminal 1 — API
pnpm --filter api dev

# Terminal 2 — Web
pnpm --filter web dev
```

---

## Cenários simulados

O frontend permite escolher um cenário no momento do checkout:

| Cenário | O que acontece |
|---------|----------------|
| **Padrão** | Checkout normal: estoque reservado → pagamento aprovado → pedido concluído. |
| **Pagamento recusado** | Simula cartão recusado; o pedido vai para `PAYMENT_DECLINED` e a mensagem é descartada para a **DLQ**. |
| **Duplo clique / idempotência** | Duas requisições idênticas são enviadas com a mesma `idempotencyKey`; o backend responde o mesmo resultado sem processar duas vezes. |

### Produtos de teste

| ID | Produto | Estoque | Uso |
|----|---------|---------|-----|
| 1 | Notebook Gamer | 5 | Compra padrão |
| 2 | Mouse Sem Fio | 20 | Compra padrão |
| 3 | Teclado Mecânico | **0** | Simular **falta de estoque** |
| 4 | Monitor 27" | 2 | Compra padrão |

---

## Solução de cada cenário

1. [Tentativa dupla de pagamento (idempotência)](#1-tentativa-dupla-de-pagamento-idempotência)
2. [Comprar um produto sem estoque](#2-comprar-um-produto-sem-estoque)
3. [Pagamento recusado](#3-pagamento-recusado)
4. [Processamento assíncrono](#4-processamento-assíncrono)
5. [Dead Letter Queue (DLQ)](#5-dead-letter-queue-dlq)

### 1. Tentativa dupla de pagamento (idempotência)

**Problema**: o usuário clica duas vezes no botão "pagar" ou a tela faz retry automático. Sem controle, o pedido seria cobrado/processado duas vezes.

**Solução**:
- O frontend gera uma `idempotencyKey` única por tentativa de checkout (UUID).
- Essa chave é enviada no corpo da requisição e validada pelo Zod.
- O backend mantém um `idempotencyStore` (Map em memória) que armazena o resultado já processado para aquela chave.
- Ao receber uma segunda requisição com a mesma chave, o backend retorna o resultado cacheado com o flag `isDuplicate: true` e **não cria um novo pedido**.
- Na fila de pagamento, o serviço também verifica a chave para evitar dupla cobrança.

```ts
if (hasIdempotencyKey(payload.idempotencyKey)) {
  return {
    success: true,
    order: getIdempotencyResult(payload.idempotencyKey),
    message: 'Pedido idempotente: mesmo resultado da requisição anterior.',
    isDuplicate: true,
  };
}
```

> Em produção, o `idempotencyStore` deve ser persistido em Redis/PostgreSQL com TTL.

---

### 2. Comprar um produto sem estoque

**Problema**: dois clientes tentam comprar o último item ao mesmo tempo ou alguém tenta comprar um produto esgotado.

**Solução**:
- O produto **Teclado Mecânico** inicia com estoque `0`.
- O pedido é aceito na API (o checkout é assíncrono) e publicado na fila `checkout.queue`.
- O consumer de checkout envia o pedido para `inventory.queue`.
- O serviço de estoque tenta decrementar o estoque.
- Se `decrementStock` retornar `false`, o pedido é marcado como `OUT_OF_STOCK`, uma notificação é enviada e a mensagem é rejeitada (nack) para a **Dead Letter Queue (DLQ)**.

```ts
const success = decrementStock(message.productId, message.quantity);
if (!success) {
  updateOrderStatus(message.orderId, 'OUT_OF_STOCK');
  // publica notificação
  throw new Error(`Estoque insuficiente para o pedido ${message.orderId}`);
}
```

> Em produção, a DLQ permitiria análise posterior ou ressarcimento automático.

---

### 3. Pagamento recusado

**Problema**: o gateway de pagamento recusa a transação (cartão sem limite, por exemplo).

**Solução**:
- O cenário `declined` é propagado pela mensagem de checkout até a fila de pagamento.
- O serviço de pagamento detecta a flag `simulateScenario === 'declined'`.
- O pedido é marcado como `PAYMENT_DECLINED` e uma notificação é enviada.
- A mensagem é descartada para a DLQ (em produção poderia iniciar um fluxo de retry manual ou notificar o cliente).

```ts
if (isDeclined) {
  updateOrderStatus(message.orderId, 'PAYMENT_DECLINED', 'DECLINED');
  // publica notificação
  throw new Error(`Pagamento recusado para o pedido ${message.orderId}`);
}
```

---

### 4. Processamento assíncrono

**Problema**: checkout pode ser lento (consultar estoque, gateway de pagamento, enviar e-mail). Bloquear a requisição HTTP prejudica a experiência.

**Solução**:
- A API responde **202 Accepted** imediatamente com o pedido criado e o status `PENDING`.
- O frontend passa a consultar a lista de pedidos a cada 3 segundos (long polling simples).
- O RabbitMQ processa as etapas em background: checkout → inventory → payment → notification.
- Cada mudança de status é registrada no `history` do pedido.

```ts
return res.status(202).json(result);
```

---

### 5. Dead Letter Queue (DLQ)

**Problema**: quando uma mensagem falha repetidamente (estoque indisponível, pagamento recusado), ela não pode ficar presa na fila principal consumindo recursos nem ser perdida silenciosamente.

**Solução**:
- Todas as filas principais (`checkout.queue`, `payment.queue`, `inventory.queue`) são configuradas com `x-dead-letter-exchange` apontando para `dead-letter.exchange`.
- Quando um consumer dá `nack` sem requeue, a mensagem é enviada para a `dead-letter.queue`.
- No RabbitMQ Management (`http://localhost:15672`) é possível visualizar essas mensagens e analisar as falhas.

```ts
await channel.assertQueue(QUEUES.payment, {
  durable: true,
  arguments: { 'x-dead-letter-exchange': EXCHANGES.deadLetter },
});
```

---

## Estrutura de pastas

```
.
├── apps/
│   ├── api/                 # Express + RabbitMQ consumers
│   │   ├── Dockerfile
│   │   ├── src/
│   │   │   ├── config/
│   │   │   ├── data/
│   │   │   ├── routes/
│   │   │   ├── services/
│   │   │   └── server.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── web/                 # React + Vite
│       ├── Dockerfile
│       ├── src/
│       │   ├── components/
│       │   ├── api.ts
│       │   ├── App.tsx
│       │   └── main.tsx
│       ├── package.json
│       ├── tsconfig.json
│       └── vite.config.ts
├── packages/
│   └── shared/              # Zod schemas + TypeScript types
│       ├── src/
│       │   ├── schemas/
│       │   └── types/
│       ├── package.json
│       └── tsconfig.json
├── docker-compose.yml
├── turbo.json
├── pnpm-workspace.yaml
└── README.md
```

---

## Tecnologias

- [RabbitMQ](https://www.rabbitmq.com/)
- [Express](https://expressjs.com/)
- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Zod](https://zod.dev/)
- [Turborepo](https://turbo.build/repo)
- [pnpm](https://pnpm.io/)
- [Docker](https://www.docker.com/)

---

## Próximos passos sugeridos

- Substituir o `idempotencyStore` em memória por Redis com TTL.
- Persistir pedidos em PostgreSQL/MongoDB.
- Adicionar testes E2E com Playwright simulando o duplo clique.
- Implementar retry com backoff exponencial para pagamentos.
- Adicionar observabilidade: métricas do RabbitMQ, logs estruturados e tracing.
- Criar uma fila separada para envio de e-mails e notificações push.
