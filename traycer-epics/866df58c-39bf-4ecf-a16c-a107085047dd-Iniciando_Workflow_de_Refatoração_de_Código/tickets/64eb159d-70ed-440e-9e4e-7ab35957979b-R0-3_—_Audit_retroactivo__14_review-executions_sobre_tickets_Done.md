---
id: "64eb159d-70ed-440e-9e4e-7ab35957979b"
title: "R0-3 — Audit retroactivo: 14 review-executions sobre tickets Done"
assignee: ""
status: 1
createdAt: "2026-04-19T09:17:00.800Z"
updatedAt: "2026-04-19T19:00:00.000Z"
type: ticket
---

# R0-3 — Audit retroactivo: 14 review-executions sobre tickets Done

### Scope & Objective

Disparar **14 review-executions atómicas** (uma por ticket Done) para auditar conformidade milimétrica com os Acceptance Criteria originais. Cada review lê o ticket arquivado em file:nao_versionar/traycer-epics/63eac955-…/tickets/ (ou equivalente nos exports actualmente em file:home/cj/Documentos/Traycer/tmp/tickets/), lê o código tocado, verifica AC um-a-um, reporta gaps em comments — **sem implementar correcções**.

**Tickets a auditar:**

| # | Ticket | Foco do review |
| --- | --- | --- |
| 1 | W0-T1 Pre-flight bugs | imports `Brain/Zap` em `Sidebar.tsx`, rota `MensagensPage`, `pino`+`log.error` em `simulacoes.ts` |
| 2 | W0-T2 Docs governance | archive `docs/_archive/planning-2026-04/` + `specs-4e02dfe2/`, CONSTITUTION v2.1 |
| 3 | W0-T3 Tests useTelemetry | `useTelemetry.spec.tsx` + `__test-utils__/telemetry-stub.ts` cobertura ≥85% |
| 4 | W0-T4 Tests heuristics | `heuristics.engine.spec.ts` cobertura + characterization snapshots |
| 5 | W0-T5 Tests vocacional | `vocacional.service.spec.ts` + `__fixtures__/personas.ts` |
| 6 | W0-T6 Tests reputation | `reputation.service.spec.ts` (incluindo `getReputacao` legacy 0-when-flag-off) |
| 7 | W0-T7 Tests conquistas | `conquistas.engine.spec.ts` |
| 8 | W0-T8 Tests lti.ags | `lti.ags.spec.ts` |
| 9 | W0-T9 CI Tooling | axe-core + @axe-core/playwright, pre-commit, branch-protection.md |
| 10 | W1-T1 Edge hardening | `apps/edge/{wrangler.toml, src/index.ts, eslint.config.mjs}` |
| 11 | W1-T2 TelemetryToken JWS | `packages/shared/src/telemetry-token.ts` + spec, `apps/edge/src/middleware/jws-verify.ts` + spec, `apps/api/src/modules/auth/telemetry-token.spec.ts` |
| 12 | W1-T4 Edge dual-write + Upstash + consumer | `apps/api/src/modules/telemetria/consumer.ts` + processor; validar dual-write no edge |
| 13 | W1-T5 Seed narrativo | `infra/strapi/scripts/seed-narrativo.ts` + `seed-narrativo-monumental.ts` |
| 14 | W2-T1 Heuristics shared + Sanity | `packages/shared/src/heuristics.ts` + spec, `packages/shared/src/sanity/{rules,types,index,sanity.spec}.ts` |
| 15 | W2-T2 Event bus + Outbox | `apps/api/src/modules/events/{event-bus.ts, types.ts, lti.handler.ts, conquistas.handler.ts, outbox-replay.ts}` + spec **(esperar gaps — confirma hotspots H1/H2/H3 da Analysis §2)** |
| 16 | Constelação Neural | `apps/web/src/features/landing/NeuralConstellation.tsx` |

**In scope:**

- Disparar uma `new_execution(plan_artifact_type='review', ...)` por ticket arquivado, em paralelo onde for seguro (review-executions são read-only, sem race risk)
- Consolidar findings num único `nao_versionar/audit-reports/audit-2026-04.md` com tabela `ticket | AC pass/fail | gaps`

**Out of scope:**

- Implementar qualquer correcção identificada — só listar
- Reviews dos próprios tickets desta wave (R0-1, R0-2, R1-1, R2.*, R3-1)

### References

- Approach §5.2 Audit (R0) — spec:866df58c-39bf-4ecf-a16c-a107085047dd/fcd9896a-c609-480a-8985-81ac4c4cf6fd
- Analysis §1.2 Quem chama o quê + §2 Hotspots — spec:866df58c-39bf-4ecf-a16c-a107085047dd/9e1df3cf-7cd8-4bf5-80d1-86bc9b4d00aa

### Guardrails

- Cada review-execution é **read-only** — `plan_artifact_type='review'` (Approach §5.2)
- Findings vão para report markdown, **não criam tickets novos** automaticamente — gaps de bug crítico (especialmente W2-T2 H1/H2/H3) já estão cobertos por R2.T3a/T3b
- Se um review descobrir um gap **não previsto** na Analysis (ex.: W1-T4 dual-write não funciona), abrir conversa com o utilizador — não silenciar nem criar ticket

### Acceptance Criteria

- 16 review-executions completadas com tool responses recebidos (W0-T1…T9 + W1-T1/T2/T4/T5 + W2-T1/T2 + Constelação Neural)
- `nao_versionar/audit-reports/audit-2026-04.md` consolida findings: 1 linha por ticket com `AC pass/fail`, lista de gaps, link para o execution correspondente
- W2-T2 review confirma os 3 bugs críticos H1/H2/H3 (outbox não-real, LTI fachada, conquistas double-fire) — se não confirmar, reabrir Analysis

### Verification Steps

- `nao_versionar/audit-reports/audit-2026-04.md` tem 16 entradas
- Cada entrada referencia um execution:866df58c-…/… válido
- Gaps inesperados (fora da Analysis) reportados ao utilizador antes de R1-1
