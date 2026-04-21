# B4 — docs/telemetria/pipeline.md (Edge → Upstash → Worker isolado, SET NX EX, tag-don't-drop)

## Status

Draft · Depende de E2 (edge bugfix).

## Estado actual

file:docs/telemetria/pipeline.md (linhas 5–33):

- Diagrama mostra **Browser → BFF → Redis → Strapi**. **Omite o Edge** (que é a entrada primária per file:apps/edge/src/index.ts).
- Não menciona **dual-layer sanity** (Edge etiqueta + BFF audita) — file:apps/edge/src/index.ts linha 41–48 já implementa "tag-don't-drop".
- Não menciona **idempotência por evento (SET NX EX 7d)** — risco D6 (midnight rollover) descrito nos ensaios file:specs/IMPORTANTE/why-edge-telemetry-pipelines-fail-at-midnight.txt.
- Não menciona o **Outbox Replay** nem o `consumer.ts` isolado.
- Resiliência (linhas 35–38) não menciona o problema do **co-location BFF main + consumer** (D5).

## Estado canónico

- **Edge** é entrada primária (90% do tráfego); BFF é proxy fallback para a **mesma fila Upstash**.
- **Sanity dual-layer "tag-don't-drop"** — eventos inválidos viajam **etiquetados** com `metadata.edgeInvalidated` para auditoria forense.
- **Idempotência SET NX EX 7d** por `eventId` (não por chave de data).
- **Consumer isolado** num processo Railway separado (`npm run start:consumer`).
- **Outbox Replay** auto-agendado.

## Tickets

### B4-T1 — Reescrever diagrama Mermaid com Edge + dual-write

Sequência completa: Browser → Edge Worker (JWS verify, sanity, push Upstash) → Consumer Worker (Railway, isolado) → Strapi/Postgres → Event Bus → Conquistas.

- **DoD E2E**: dev percebe a separação de processos e a estratégia tag-don't-drop.

### B4-T2 — Documentar idempotência SET NX EX 7d

Snippet conceptual (sem código completo): chave Redis `tel:evt:{eventId}` com TTL 604800s. Explicar porque a chave por data falha à meia-noite.

- **DoD E2E**: novo dev consegue explicar o D6 e o fix em 1 minuto.

### B4-T3 — Documentar Outbox Replay autonomous + chunked

Como funciona o `outbox-replay.ts`, frequência, idempotência por `event_id`, lock distribuído via Redis SADD, chunk size, error handling (retryable vs terminal).

- **DoD E2E**: ops consegue diagnosticar uma fila estagnada com base apenas no doc.

### B4-T4 — Documentar resiliência cliente

Offline buffer (localStorage max 500), `keepalive: true` no fetch de fechos de tab, session UUID, retry exponential backoff.

- **DoD E2E**: dev frontend percebe garantias de entrega e não duplica esforço.

## Dependências

- Depende de E2.
- Coordena com C2 (STATE.md regista as dívidas D5–D7).