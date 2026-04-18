---
id: "4873eb33-ded9-4b11-a833-f8e1bb0369fe"
title: "W0-T4: Characterization tests — heuristics.engine.ts"
assignee: ""
status: 0
createdAt: "2026-04-18T02:51:18.501Z"
updatedAt: "2026-04-18T02:51:26.554Z"
type: ticket
---

# W0-T4: Characterization tests — heuristics.engine.ts

## Scope & Objective

Criar `apps/api/src/modules/analysis/heuristics.engine.spec.ts` cobrindo as fórmulas matemáticas actuais (φ, R, F, H se já existirem) com casos limite — antes de mover formulas para `@pdc/shared` em W2-T1.

**In scope**: testes determinísticos (mesmos inputs → mesmos outputs), casos limite (0, infinito, NaN, valores impossíveis).
**Out of scope**: alterar formulas (W2-T1); mover para shared (W2-T1).

## References

- Atlas §6.4 (heuristics.engine estado real), §6.5 (Q2 item 2), §7.1 (trackers nomeados) — atlas spec
- Approach §5.2 W0-T2 — approach spec
- Ficheiro: file:apps/api/src/modules/analysis/heuristics.engine.ts

## Guardrails

- Captar comportamento actual incluindo bugs ou simplificações (snapshot da verdade).
- Testes não importam de outros módulos do BFF (puros, fast).

## Acceptance Criteria

- Spec cobre todas as funções exportadas de `heuristics.engine.ts`.
- ≥3 casos limite por função (zero, máximo, valor impossível).
- ≥1 teste de determinismo (input X → output Y, repetir 10x).
- `npm test -w apps/api -- heuristics.engine` verde.

## Verification Steps

- Coverage: `heuristics.engine.ts` ≥90% lines.
- `npm test -w apps/api -- --run heuristics` → verde.
- Code review: confirmar que testes são SNAPSHOT (capturam estado actual), não aspiracional.
