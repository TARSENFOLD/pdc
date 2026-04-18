---
id: "19e6775a-3cc8-4607-ba08-737bee4d4913"
title: "W0-T7 Tests conquistas"
createdAt: "1776496010571"
updatedAt: "1776496117892"
type: execution
---

### User Query (Status: Completed)

Implementar `ticket:W0-T7: Characterization tests — conquistas.engine.ts` (W0-T7: Characterization tests — conquistas.engine.ts).

Criar apps/api/src/modules/conquistas/conquistas.engine.spec.ts cobrindo `/home/cj/pdc-v2/apps/api/src/modules/conquistas/conquistas.engine.ts` (verificarConquistas + REGRAS exportadas).

Acceptance Criteria:

- ≥3 testes auto-trigger (1 por tipo de evento dominante: 'simulacao.concluida', 'curso.concluido', 'vinculo.connected').
- ≥1 teste flag AUTO_ACHIEVEMENTS off retorna `[]`.
- ≥1 teste idempotência (isAlreadyUnlocked retorna true → não cria duplicado).
- ≥1 teste threshold (3 simulacao.concluida → desbloqueia 'explorador-vocacional'; 2 não desbloqueia).
- `npm test -w apps/api -- --run conquistas` verde.
- Coverage conquistas.engine.ts ≥85%.

Guardrails:

- Stub Strapi `conquista`, `conquista-utilizador` e `telemetrias` via mock fetch tipado.
- Stub featureFlagService.getEffectiveFlags retornando { AUTO_ACHIEVEMENTS: bool }.
- Capturar comportamento actual (snapshot da verdade): W2-T3 vai refactorizar para event subscriber e idempotency via Redis SADD; esses testes não podem partir sem actualização explícita lá.
- Constitution: zero `any`, tipagem estrita.

Specs: `spec:Refactoring Analysis — PDC v2 Restauração da Alma + Cherry-Pick`, spec:63eac955-69ad-45d7-8599-09637d3ce043/2856bafe-6fa6-4f8f-9d1a-80c50a1c739c.

Out of scope: refactor para subscriber (W2-T3).

### Execution Plan (Status: Not Started)

[object Promise]

### Verification (Status: Not Started)