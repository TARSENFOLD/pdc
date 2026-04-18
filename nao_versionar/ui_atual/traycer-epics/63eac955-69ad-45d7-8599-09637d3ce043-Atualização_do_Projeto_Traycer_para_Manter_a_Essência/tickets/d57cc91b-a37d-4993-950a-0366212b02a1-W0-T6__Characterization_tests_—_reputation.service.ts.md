---
id: "d57cc91b-a37d-4993-950a-0366212b02a1"
title: "W0-T6: Characterization tests — reputation.service.ts"
assignee: ""
status: 0
createdAt: "2026-04-18T02:51:36.081Z"
updatedAt: "2026-04-18T02:51:45.695Z"
type: ticket
---

# W0-T6: Characterization tests — reputation.service.ts

## Scope & Objective

Criar `apps/api/src/modules/reputation/reputation.service.spec.ts` cobrindo as 6 dimensões ponderadas + cache Redis 5min + comportamento da flag `REPUTATION_VISIBLE` — antes de criar endpoint separado `/reputacao/me` em W2-T5 e UI Bento em W4-T4.

**In scope**: testes para `calcularReputacao`, `persistirReputacao`, `getReputacao`, `marcarParaRecalculo`, `recalcularGlobal`. Cache hit/miss. Flag on/off.
**Out of scope**: refactor da semântica `getReputacao` retornar 0 (W2-T5).

## References

- Atlas §6.4 (reputation.service estado: sem testes, leakage risk flag), §6.5 (Q2 item 4) — atlas spec
- Approach §5.2 W0-T4, decisão C5 — approach spec
- Ficheiro: file:apps/api/src/modules/reputation/reputation.service.ts

## Guardrails

- Stub Redis usando `vi-helpers` ou wrapper in-memory; não usar Redis real em teste.
- Stub Strapi via mock fetch que valida payload contra `StrapiPerfilBasic` interface.
- Testar comportamento `getReputacao` retornando `0` quando flag off (snapshot da verdade — W2-T5 vai mudar).

## Acceptance Criteria

- ≥6 testes (1 por dimensão de WEIGHTS).
- ≥2 testes flag REPUTATION_VISIBLE (on retorna score real; off retorna 0).
- ≥2 testes cache (hit retorna sem chamar Strapi; miss popula cache).
- `npm test -w apps/api -- reputation` verde.

## Verification Steps

- `npm test -w apps/api -- --run reputation` → verde.
- Coverage: `reputation.service.ts` ≥85% lines.
- Manual: confirmar via leitura que teste de flag-off retorna 0 (capturar estado actual antes de W2-T5).
