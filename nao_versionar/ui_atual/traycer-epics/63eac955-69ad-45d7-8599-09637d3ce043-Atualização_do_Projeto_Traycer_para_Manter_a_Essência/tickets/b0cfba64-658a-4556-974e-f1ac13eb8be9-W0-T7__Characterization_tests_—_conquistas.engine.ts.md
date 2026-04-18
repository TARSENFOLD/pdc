---
id: "b0cfba64-658a-4556-974e-f1ac13eb8be9"
title: "W0-T7: Characterization tests — conquistas.engine.ts"
assignee: ""
status: 0
createdAt: "2026-04-18T02:51:46.157Z"
updatedAt: "2026-04-18T02:51:52.522Z"
type: ticket
---

# W0-T7: Characterization tests — conquistas.engine.ts

## Scope & Objective

Criar `apps/api/src/modules/conquistas/conquistas.engine.spec.ts` cobrindo auto-trigger por evento + flag `AUTO_ACHIEVEMENTS` — antes do refactor para event-bus subscriber em W2-T3.

**In scope**: testes do trigger por tipo de evento, flag on/off, idempotência (mesmo evento não desbloqueia 2x).
**Out of scope**: refactor para subscriber (W2-T3).

## References

- Atlas §6.4 (conquistas.engine estado), §6.5 (Q2 item 5) — atlas spec
- Approach §5.2 W0-T5 — approach spec
- Ficheiro: file:apps/api/src/modules/conquistas/conquistas.engine.ts

## Guardrails

- Stub Strapi `conquista-utilizador` content-type via mock fetch.
- Capturar comportamento actual: flag off retorna `[]` (snapshot, não comentar).

## Acceptance Criteria

- ≥3 testes auto-trigger (1 por tipo de evento dominante).
- ≥1 teste flag off retorna `[]`.
- ≥1 teste idempotência.
- `npm test -w apps/api -- conquistas` verde.

## Verification Steps

- `npm test -w apps/api -- --run conquistas` → verde.
- Coverage: `conquistas.engine.ts` ≥85% lines.
