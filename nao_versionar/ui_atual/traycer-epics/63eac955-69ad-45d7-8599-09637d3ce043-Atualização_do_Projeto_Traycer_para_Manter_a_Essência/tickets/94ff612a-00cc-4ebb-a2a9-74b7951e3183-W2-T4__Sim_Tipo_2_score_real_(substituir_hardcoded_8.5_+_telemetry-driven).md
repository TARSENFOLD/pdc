---
id: "94ff612a-00cc-4ebb-a2a9-74b7951e3183"
title: "W2-T4: Sim Tipo 2 score real (substituir hardcoded 8.5 + telemetry-driven)"
assignee: ""
status: 0
createdAt: "2026-04-18T02:54:36.665Z"
updatedAt: "2026-04-18T02:54:51.755Z"
type: ticket
---

# W2-T4: Sim Tipo 2 score real (substituir hardcoded 8.5 + telemetry-driven)

## Scope & Objective

Substituir `score: 8.5` hardcoded em `apps/web/src/features/simulacoes/Tipo2Player.tsx` L58 pela função `analyzeFluidity` do `@pdc/shared/heuristics` (W2-T1). Calcular dwellTime real, persistir `tentativaNum` (já correcto desde correcção do atlas).

**In scope**: refactor `Tipo2Player.tsx` para enviar payload com eventos brutos; BFF `routes/simulacoes.ts` PUT `/tentativas/:id` calcula score via heuristics; remover comment `// FIXME [W2-T?]`.
**Out of scope**: postMessage com iframe externo (W5+); Tipo 3 (W2-T7); Tipo 1 score auto-avaliado mantém-se até decisão de produto.

## References

- Atlas §6.1 correção score Tipo 2 hardcoded 8.5, §2.6 (Sim Tipo 1/2/3 estados) — atlas spec
- Approach §1.3 Mapping & Gaps "Score Tipo 2 hardcoded", §1.6 hotspot mitigation — approach spec
- Ficheiro: file:apps/web/src/features/simulacoes/Tipo2Player.tsx, file:apps/api/src/routes/simulacoes.ts

## Guardrails

- W2-T1 (heuristics em shared) é dependência blocker.
- Score calculado pelo BFF, NUNCA pelo frontend (segurança: aluno não pode forjar score).
- Frontend envia eventos via `useTelemetry` (já existe); BFF lê eventos da queue + calcula.
- Score range mantém-se 0-10 (compatibilidade com REQ-4-001 e UI existente).

## Acceptance Criteria

- `Tipo2Player.tsx` L58: `score` removido do payload; metadata mantém `duracaoSegundos`, `focusStability`, `tipo: 2`.
- `routes/simulacoes.ts` PUT `/tentativas/:id`: lê eventos do consumer/cache; chama `analyzeFluidity()` do shared; calcula score 0-10; persiste.
- Comment `// FIXME` removido.
- Teste actualizado: persona "O Cirurgião" deve obter score ≥7.5 numa simulação Tipo 2 fixture; "O Hacker Hesitante" deve obter ≤5.

## Verification Steps

- E2E Playwright `tests/e2e/simulacoes/tipo2.spec.ts` actualizado para verificar score derivado (não fixo 8.5).
- Manual: 2 personas diferentes a fazer mesma simulação → scores distintos baseados em telemetria real.
- `npm test -w apps/api -- simulacoes` verde.
