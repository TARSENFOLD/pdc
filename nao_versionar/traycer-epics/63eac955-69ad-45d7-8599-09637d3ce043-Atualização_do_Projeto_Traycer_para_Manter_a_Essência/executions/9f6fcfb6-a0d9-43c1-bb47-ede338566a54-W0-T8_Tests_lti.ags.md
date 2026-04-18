---
id: "9f6fcfb6-a0d9-43c1-bb47-ede338566a54"
title: "W0-T8 Tests lti.ags"
createdAt: "1776496010596"
updatedAt: "1776496148252"
type: execution
---

### User Query (Status: Completed)

Implementar `ticket:W0-T8: Characterization tests — lti.ags.ts (sendScore)` (W0-T8: Characterization tests — lti.ags.ts).

Criar apps/api/src/modules/lti/lti.ags.spec.ts cobrindo `/home/cj/pdc-v2/apps/api/src/modules/lti/lti.ags.ts` (ltiAgs.sendScore).

NOTA IMPORTANTE: existem 2 implementações no repositório:

- `/home/cj/pdc-v2/apps/api/src/modules/lti/lti.ags.ts` → real (chama fetch para lineitemUrl/scores com headers IMS LTI 1.3)
- `/home/cj/pdc-v2/apps/api/src/modules/lti/lti.ags.service.ts` → simulacro (apenas log)
Os testes devem cobrir o REAL (lti.ags.ts).

Acceptance Criteria:

- ≥1 teste happy path (200 OK).
- ≥1 teste 4xx (LMS rejeita score → throw com status + body).
- ≥1 teste 5xx (LMS down → throw).
- ≥1 teste validação envelope JSON: `userId`, `scoreGiven`, `scoreMaximum`, `comment`, `timestamp`, `activityProgress`, `gradingProgress` enviados; headers correctos: `Content-Type: application/vnd.ims.lis.v1.score+json` e `Authorization: Bearer <token>`.
- ≥1 teste URL bem formada: `${lineitemUrl}/scores`.
- `npm test -w apps/api -- --run lti.ags` verde.
- Coverage lti.ags.ts ≥90%.

Guardrails:

- Mock fetch global usando `vi.spyOn(global, 'fetch')`.
- Payload deve cumprir IMS LTI 1.3 AGS Score schema (referência: spec LTI 1.3 IMS Global).
- Constitution: zero `any`, tipagem estrita.

Specs: `spec:Refactoring Analysis — PDC v2 Restauração da Alma + Cherry-Pick`, spec:63eac955-69ad-45d7-8599-09637d3ce043/2856bafe-6fa6-4f8f-9d1a-80c50a1c739c.

Out of scope: refactor para handler subscriber (W2-T3); fix do log.error sem import (W0-T1 já fez).

### Execution Plan (Status: Not Started)

[object Promise]

### Verification (Status: Not Started)