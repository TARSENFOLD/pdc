---
id: "051ddaa6-a52d-4f00-9082-5eea971cf084"
title: "W1-T4: Edge dual-write + Upstash queue + BFF consumer (full ingestion pipeline)"
assignee: ""
status: 0
createdAt: "2026-04-18T02:53:05.442Z"
updatedAt: "2026-04-18T02:53:24.763Z"
type: ticket
---

# W1-T4: Edge dual-write + Upstash queue + BFF consumer (full ingestion pipeline)

## Scope & Objective

Activar pipeline completa de telemetria edge-first: frontend `useTelemetry` envia para edge (com fallback BFF), edge valida JWS + LPUSH para Upstash queue, BFF consumer Worker consome queue + persist em Strapi `telemetria` + actualiza `behavior_patterns`.

**In scope**: alterar `useTelemetry.ts` para edge-first com BFF fallback, implementar queue producer no edge, implementar consumer worker no Railway, idempotência via `eventId` UUID + Redis SET.
**Out of scope**: anti-cheat sanity validator (W2-T1); cálculo das fórmulas heuristics (W2-T1); refactor para usar telemetry token consumer-side (já feito W1-T2).

## References

- Atlas §2.1 (telemetria pipeline), §6.4 (useTelemetry estado), §7.2 (eventos canónicos) — atlas spec
- Approach §1.2 transition Fase A→B→C, §1.5 (concurrency), §3.3 telemetria flow — approach spec
- ADR-005 — file:docs/decisoes/adr-005-edge-telemetry.md
- Ficheiros: file:apps/web/src/hooks/useTelemetry.ts, file:apps/edge/src/index.ts, file:apps/api/src/modules/telemetria/

## Guardrails

- W0-T3 characterization tests devem PASSAR após esta alteração; se um teste partir, é regressão (não snapshot drift aceitável).
- Frontend usa edge URL como primário, BFF Railway como fallback (timeout 5s); ambos aceitam o mesmo payload schema.
- Idempotência: `eventId` UUID já existe no `TelemetryEventSchema`; consumer faz `SADD seen_event_ids:<date>` no Redis com TTL 7d antes de persistir.
- Consumer corre como long-running process no Railway (não cron); usa `BRPOP` blocking.
- Behavior patterns update é eventual (não bloqueia consumer); pode ser delayed batch.
- Zero perda de eventos: se consumer crasha, queue retém eventos; restart re-processa.

## Acceptance Criteria

- `apps/web/src/hooks/useTelemetry.ts` envia para `EDGE_URL/telemetria/batch` primeiro; fallback BFF se 5xx ou timeout.
- `apps/edge/src/index.ts`: `POST /telemetria/batch` → JWS verify (W1-T2) → LPUSH Upstash → 202.
- `apps/api/src/modules/telemetria/consumer.ts` (NOVO): worker process que `BRPOP` da queue, valida idempotência, persiste em Strapi `telemetria`, actualiza `behavior_patterns`.
- `apps/api/scripts/start-consumer.ts` ou bin script no `package.json` para arrancar consumer no Railway (separate process).
- Idempotência testada: enviar mesmo evento 3x → persiste 1x.
- W0-T3 characterization tests continuam verdes (ou explicitamente actualizados se semântica mudou).

## Verification Steps

- E2E: frontend dispara evento → curl Upstash REST API mostra LPUSH → consumer processa → Strapi `/telemetria` mostra entry.
- Stress: enviar 1000 eventos batched → todos chegam a Strapi sem duplicação (assertion via SQL count distinct `eventId`).
- Failure mode: parar consumer → enviar 100 eventos → reiniciar consumer → 100 eventos processados.
- `npm test -w @pdc/edge -- ingestion` verde.
- k6 script `tests/k6/edge-load.js` (NOVO) confirma p99 < 100ms para `/telemetria/batch`.
