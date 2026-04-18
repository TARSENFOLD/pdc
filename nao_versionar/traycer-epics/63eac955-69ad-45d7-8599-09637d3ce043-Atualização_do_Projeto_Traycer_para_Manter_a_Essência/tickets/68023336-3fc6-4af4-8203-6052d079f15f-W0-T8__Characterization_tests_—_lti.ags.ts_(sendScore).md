---
id: "68023336-3fc6-4af4-8203-6052d079f15f"
title: "W0-T8: Characterization tests — lti.ags.ts (sendScore)"
assignee: ""
status: 0
createdAt: "2026-04-18T02:51:52.902Z"
updatedAt: "2026-04-18T02:51:59.850Z"
type: ticket
---

# W0-T8: Characterization tests — lti.ags.ts (sendScore)

## Scope & Objective

Criar `apps/api/src/modules/lti/lti.ags.spec.ts` cobrindo `sendScore` com mock fetch + validação do envelope JSON da spec LTI 1.3 — antes de tornar event-driven em W2-T3.

**In scope**: testes do envelope IMS LTI Score JSON, headers correctos (`Content-Type: application/vnd.ims.lis.v1.score+json`), Bearer auth, error handling (4xx/5xx do LMS).
**Out of scope**: refactor para handler subscriber (W2-T3); fix do `log.error` sem import (W0-T1 já fez).

## References

- Atlas §6.2 F3 (bug runtime LTI), §6.4 (lti.ags), §6.5 (Q2 item 6) — atlas spec
- Approach §5.2 W0-T6, decisão C3 — approach spec
- Ficheiro: file:apps/api/src/modules/lti/lti.ags.ts

## Guardrails

- Mock fetch global usando `vi.spyOn(global, 'fetch')`.
- Payload enviado deve cumprir IMS LTI 1.3 AGS Score schema (referência: spec LTI 1.3 IMS Global).

## Acceptance Criteria

- ≥1 teste happy path (200 OK).
- ≥1 teste 4xx (LMS rejeita score).
- ≥1 teste 5xx (LMS down) com erro propagado.
- ≥1 teste validação envelope JSON (`activityProgress`, `gradingProgress`, `scoreGiven`, `scoreMaximum`).
- `npm test -w apps/api -- lti.ags` verde.

## Verification Steps

- `npm test -w apps/api -- --run lti.ags` → verde.
- Coverage: `lti.ags.ts` ≥90% lines.
