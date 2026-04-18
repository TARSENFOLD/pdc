---
id: "b548a82b-ede6-4b6e-8cdd-e1d7c7f9425c"
title: "W0-T4 Tests heuristics"
createdAt: "1776496010578"
updatedAt: "1776496080969"
type: execution
---

### User Query (Status: Completed)

Implementar `ticket:W0-T4: Characterization tests — heuristics.engine.ts` (W0-T4: Characterization tests — heuristics.engine.ts).

Criar apps/api/src/modules/analysis/heuristics.engine.spec.ts cobrindo TODAS as funções exportadas de `/home/cj/pdc-v2/apps/api/src/modules/analysis/heuristics.engine.ts` (analyzeFluidity, analyzeResilience, analyzeFocus).

Acceptance Criteria:

- ≥3 casos limite por função (zero, máximo, valor impossível NaN/Infinity).
- ≥1 teste de determinismo por função (mesmo input X → mesmo output Y, repetir 10x).
- Teste de cada DiagnosticLevel ('EXCELENTE'|'ESTAVEL'|'VULNERAVEL'|'CRITICO') sendo retornado pelos thresholds corretos.
- Coverage ≥90% lines em heuristics.engine.ts.
- `npm test -w apps/api -- --run heuristics` verde.

Guardrails:

- Captar comportamento actual incluindo simplificações (snapshot da verdade — W2-T1 vai mover formulas para @pdc/shared, esses testes NÃO devem partir).
- Testes puros, sem importar outros módulos do BFF.
- Constitution: zero `any`, tipagem estrita.

Specs: `spec:Refactoring Analysis — PDC v2 Restauração da Alma + Cherry-Pick`, spec:63eac955-69ad-45d7-8599-09637d3ce043/2856bafe-6fa6-4f8f-9d1a-80c50a1c739c.

Out of scope: alterar formulas (W2-T1); mover para shared (W2-T1).

### Execution Plan (Status: Skipped)

[object Promise]

### Verification (Status: Not Started)