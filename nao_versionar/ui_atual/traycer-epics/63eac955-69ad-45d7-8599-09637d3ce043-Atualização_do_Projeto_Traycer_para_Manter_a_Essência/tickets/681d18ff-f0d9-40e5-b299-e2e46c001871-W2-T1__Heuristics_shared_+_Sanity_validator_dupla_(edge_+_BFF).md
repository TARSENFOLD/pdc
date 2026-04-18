---
id: "681d18ff-f0d9-40e5-b299-e2e46c001871"
title: "W2-T1: Heuristics shared + Sanity validator dupla (edge + BFF)"
assignee: ""
status: 0
createdAt: "2026-04-18T02:53:47.368Z"
updatedAt: "2026-04-18T02:54:03.535Z"
type: ticket
---

# W2-T1: Heuristics shared + Sanity validator dupla (edge + BFF)

## Scope & Objective

Mover fórmulas heuristics (φ/R/F/H) de `apps/api/src/modules/analysis/heuristics.engine.ts` para `packages/shared/src/heuristics.ts` (Single Source of Truth). Criar `packages/shared/src/sanity/` com regras puras importadas POR AMBOS edge e BFF (anti-cheat dupla).

**In scope**: refactor `heuristics.engine.ts` para importar do shared; criar `SanityRule` interface + regras concretas (timestamp impossível, dwellTime negativo, eventos por minuto > threshold humano); integrar no edge worker pre-LPUSH e no BFF consumer pre-persist.
**Out of scope**: aplicar heuristics no scoring de Tipo 2 (W2-T4); UI consumindo insights (W2-T6).

## References

- Atlas §2.1 (anti-cheat ausente), §6.4 (heuristics.engine), §7.1 (trackers nomeados com fórmulas) — atlas spec
- Approach §1.4 (SanityRule shape), §1.6 hotspot mitigation, decisão C2 — approach spec
- Ficheiros: file:apps/api/src/modules/analysis/heuristics.engine.ts, file:packages/shared/src/

## Guardrails

- W0-T2 characterization (heuristics.engine) deve continuar verde após refactor (só muda LOCALIZAÇÃO da fórmula, não comportamento).
- Sanity rules são FUNÇÕES PURAS (zero I/O); rejeitam evento ou validam.
- Edge sanity = subset rápido (timestamp, dwellTime); BFF sanity = full audit (cross-event analysis).
- Eventos rejeitados pelo edge geram log estruturado mas NÃO bloqueiam batch inteiro (alguns OK passam).
- Eventos rejeitados pelo BFF marcam `invalidated: true` em `domain_events.payload` para forense.

## Acceptance Criteria

- `packages/shared/src/heuristics.ts`: `analyzeFluidity(events)`, `analyzeResilience(events)`, `analyzeFocusStability(events)`, `analyzeHesitation(events)` exportados como funções puras.
- `apps/api/src/modules/analysis/heuristics.engine.ts` refactorizado para apenas orquestrar (importa formulas do shared).
- `packages/shared/src/sanity/types.ts`: `SanityRule` interface + `SanityResult` type.
- `packages/shared/src/sanity/rules.ts`: ≥5 regras concretas (timestamp futuro, dwellTime negativo, eventos/seg > 50, score impossível, sequência impossível).
- `packages/shared/src/sanity/index.ts`: `applyRules(event, rules, context?)` exportado.
- Edge worker `apps/edge/src/index.ts` aplica subset rápido pre-LPUSH.
- BFF consumer `apps/api/src/modules/telemetria/consumer.ts` aplica full audit pre-persist; eventos invalidados gravados com flag.
- Testes: ≥10 sanity rules cases (válidos + inválidos); W0-T2 heuristics tests continuam verdes.

## Verification Steps

- `npm test -w @pdc/shared -- heuristics` verde com casos limite.
- `npm test -w @pdc/shared -- sanity` verde com cenários attack (cliques 1ms apart, dwellTime -100, etc.).
- `npm test -w apps/api -- heuristics.engine` (W0-T2) continua verde.
- E2E: enviar batch com 1 evento sanity-invalid + 9 válidos → consumer persiste 9 + marca 1 com `invalidated: true`.
