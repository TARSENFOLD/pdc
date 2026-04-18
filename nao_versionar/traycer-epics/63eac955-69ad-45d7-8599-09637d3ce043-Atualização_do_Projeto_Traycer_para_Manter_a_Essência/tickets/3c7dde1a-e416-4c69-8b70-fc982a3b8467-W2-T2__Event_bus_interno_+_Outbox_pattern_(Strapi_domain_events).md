---
id: "3c7dde1a-e416-4c69-8b70-fc982a3b8467"
title: "W2-T2: Event bus interno + Outbox pattern (Strapi domain_events)"
assignee: ""
status: 0
createdAt: "2026-04-18T02:54:04.267Z"
updatedAt: "2026-04-18T02:54:17.802Z"
type: ticket
---

# W2-T2: Event bus interno + Outbox pattern (Strapi domain_events)

## Scope & Objective

Implementar event bus leve no BFF (`EventEmitter` Node v1; preparado para Redis pub/sub futuro) + Outbox pattern via novo content-type Strapi `domain_events` para garantir reliability de eventos críticos (`tentativa.concluida`, `conquista.desbloqueada`, etc.).

**In scope**: módulo `events/event-bus.ts`, `events/types.ts`, content-type Strapi `domain_events`, helper `publishWithOutbox(event)`, idempotência consumer-side via Redis SADD.
**Out of scope**: handlers concretos (LTI W2-T3, conquistas W2-T3); migração para Redis pub/sub (futuro).

## References

- Approach §1.1 placement, §1.4 DomainEvent type, §1.5 (event bus failure mode) — approach spec
- Decisão C3 (event-driven LTI) — approach spec §0

## Guardrails

- Event bus v1 = `EventEmitter` nativo Node (zero deps); arquitectura preparada para swap por Redis pub/sub se houver multi-instância (interface estável).
- Outbox: eventos críticos persistidos em `domain_events` ANTES de publicar; subscriber marca `processed: true` após sucesso. Replay possível.
- Eventos transientes (analytics, notif soft) NÃO usam outbox; só EventEmitter.
- Idempotência subscriber: cada handler deve ser idempotente (mesmo evento processado 2x não causa side effect duplicado).

## Acceptance Criteria

- `apps/api/src/modules/events/event-bus.ts`: `publish(event)`, `publishWithOutbox(event)`, `subscribe(name, handler)` exportados.
- `apps/api/src/modules/events/types.ts`: `DomainEvent<T>`, `DomainEventName` enum (inicialmente `tentativa.concluida` + `conquista.desbloqueada` + `comentario.criado`).
- Content-type Strapi `domain_events` com schema: `name`, `payload` (JSONB), `correlationId`, `published_at`, `processed`, `processed_at`.
- `infra/strapi/src/api/domain-event/` criado conforme padrão Strapi.
- `apps/api/src/modules/events/outbox-replay.ts`: script para reprocessar eventos não-marcados como `processed`.
- Testes: ≥3 (publish+subscribe roundtrip, outbox persiste, replay funciona).

## Verification Steps

- `npm test -w apps/api -- event-bus` verde.
- Manual: publish evento + check Strapi `/domain-events` → entry persistido.
- Manual: handler erra → entry permanece `processed: false` → re-run replay → entry vira `processed: true`.
- SQL: `SELECT COUNT(*) FROM domain_events WHERE processed = false` deve ser 0 em estado estável.
