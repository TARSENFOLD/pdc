---
id: "3380787b-bec6-4699-89ae-db93a711dee3"
title: "W0-T6 Tests reputation"
createdAt: "1776496010593"
updatedAt: "1776496121542"
type: execution
---

### User Query (Status: Completed)

Implementar `ticket:W0-T6: Characterization tests — reputation.service.ts` (W0-T6: Characterization tests — reputation.service.ts).

Criar apps/api/src/modules/reputation/reputation.service.spec.ts cobrindo as funções exportadas de `/home/cj/pdc-v2/apps/api/src/modules/reputation/reputation.service.ts` (calcularReputacao, persistirReputacao, getReputacao, marcarParaRecalculo, recalcularGlobal, getReputacaoBreakdown).

Acceptance Criteria:

- ≥6 testes (1 por dimensão de WEIGHTS: ratingsMedia, cursosPublicados, simulacoes, conquistas, tempoPlataforma, engagement).
- ≥2 testes flag REPUTATION_VISIBLE (on retorna score real; off retorna 0 — capturar essa semântica que W2-T6 vai mudar para 404).
- ≥2 testes cache Redis (hit retorna sem chamar Strapi; miss popula cache com TTL 5min).
- `npm test -w apps/api -- --run reputation` verde.
- Coverage reputation.service.ts ≥85%.

Guardrails:

- Stub Redis usando wrapper in-memory ou vi.spyOn em apps/api/src/lib/redis.js (não usar Redis real).
- Stub Strapi via mock fetch que valida payloads contra interfaces tipadas (StrapiPerfilBasic, StrapiRating).
- TESTAR que `getReputacao` retorna 0 quando flag off — esse é o comportamento ACTUAL (W2-T6 vai mudar para 404 endpoint separado, e esse teste vai precisar ser actualizado lá).
- Constitution: zero `any`, tipagem estrita.

Specs: `spec:Refactoring Analysis — PDC v2 Restauração da Alma + Cherry-Pick`, spec:63eac955-69ad-45d7-8599-09637d3ce043/2856bafe-6fa6-4f8f-9d1a-80c50a1c739c.

Out of scope: refactor da semântica getReputacao retornar 0 (W2-T6); novo endpoint /reputacao/me (W2-T6).

### Execution Plan (Status: Not Started)

[object Promise]

### Verification (Status: Not Started)