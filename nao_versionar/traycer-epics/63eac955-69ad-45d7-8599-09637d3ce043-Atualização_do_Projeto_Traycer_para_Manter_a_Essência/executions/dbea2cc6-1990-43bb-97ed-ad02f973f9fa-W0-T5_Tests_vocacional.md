---
id: "dbea2cc6-1990-43bb-97ed-ad02f973f9fa"
title: "W0-T5 Tests vocacional"
createdAt: "1776496010569"
updatedAt: "1776496324121"
type: execution
---

### User Query (Status: Completed)

Implementar `ticket:W0-T5: Characterization tests — vocacional.service.ts (expand)` (W0-T5: Characterization tests — vocacional.service.ts).

Expandir `/home/cj/pdc-v2/apps/api/src/modules/vocacional/vocacional.service.spec.ts` (que hoje tem apenas 4 testes básicos) para cobrir 10 personas representativas baseadas nos 3 arquétipos: O Cirurgião (precisão/foco/resiliência altos em Saúde), O Hacker Hesitante (cognição alta mas hesitação elevada em Tecnologia), O Gestor Impulsivo (rapidez alta mas baixa estabilidade de foco em Gestão).

Acceptance Criteria:

- Criar apps/api/src/modules/vocacional/**fixtures**/personas.ts exportando ≥10 fixtures de persona reutilizáveis (3 arquétipos + 7 variações cobrindo as 4 áreas: Engenharia, Saúde, Tecnologia, Gestão).
- ≥1 teste por persona-arquétipo gerando perfil completo via vocacionalService.calcularPerfil.
- Snapshot dos resultados (toMatchSnapshot ou expect explícito) capturando estado actual.
- `npm test -w apps/api -- --run vocacional` verde.
- Coverage vocacional.service.ts ≥85%.

Guardrails:

- Fixtures em **fixtures**/personas.ts devem ser reutilizáveis (vão ser consumidas por W1-T5 seed também — mesma linguagem).
- Snapshot do output é a fonte de verdade actual; W2 não pode partir esses testes sem alteração explícita.
- Constitution: zero `any`, tipagem estrita.

Specs: `spec:Refactoring Analysis — PDC v2 Restauração da Alma + Cherry-Pick`, spec:63eac955-69ad-45d7-8599-09637d3ce043/2856bafe-6fa6-4f8f-9d1a-80c50a1c739c.

Out of scope: criar as 100 personas no seed (W1-T5); alterar algoritmo (W2).

### Execution Plan (Status: Not Started)

[object Promise]

### Verification (Status: Not Started)