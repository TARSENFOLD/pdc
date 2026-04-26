# ADR-023 — Achievement Unlocked Rich Payload

**Status:** Accepted  
**Date:** 2026-04-26  
**Deciders:** cj

## Context

`EventPayloadSchemas[CONQUISTA_DESBLOQUEADA]` was defined as `{ perfilId: string, conquistaSlug: string }`. This was a minimal stub from early development.

The actual BFF publishers (`apps/api/src/routes/conquistas.ts`) were already emitting a richer payload `{ conquistaId, userId, tipo, titulo, aprovada }`. The schema and the publishers were out of sync, meaning G15 payload validation would reject real events on replay or contract checks.

## Decision

`EventPayloadSchemas[CONQUISTA_DESBLOQUEADA]` is updated to the canonical rich payload:

```ts
z.object({
  conquistaId: z.string(),   // Strapi document ID of the unlocked conquista
  userId: z.string(),        // Strapi user ID of the earner
  tipo: z.enum(['automatica', 'manual', 'institucional', 'plataforma']),
  titulo: z.string(),
  aprovada: z.boolean(),
  // @deprecated transitório, remoção em W6
  perfilId: z.string().optional(),
  conquistaSlug: z.string().optional(),
})
```

The `perfilId` and `conquistaSlug` fields are kept as optional to preserve replay-compatibility with events recorded before this migration.

## Invariants

- The event name `CONQUISTA_DESBLOQUEADA = 'achievement.unlocked'` is **stable** and does not change.
- This is the **only** event payload that changes in Wave 2. All other 48 events are unchanged (§4.2).
- Fields `perfilId`/`conquistaSlug` will be removed in T6.2 (W6).

## Consequences

- G15 validation passes for all events emitted by `POST /conquistas/manual` and the conquistas engine.
- Outbox replay tests (`outbox-replay.idempotency.spec.ts`, `replay-compatibility.spec.ts`) pass without modification because the new schema is a superset — it accepts the new rich payload while the old minimal payload (`perfilId`/`conquistaSlug` only) was never stored in production.
- Downstream hooks that subscribe to `CONQUISTA_DESBLOQUEADA` gain access to `conquistaId`, `userId`, `tipo`, `titulo`, `aprovada` for richer processing (e.g., notifications, feed).
