---
id: "810f1d73-3081-42ec-8ff3-9ab4391a1b9a"
title: "W0-T3 Tests useTelemetry"
createdAt: "1776496010576"
updatedAt: "1776496011737"
type: execution
---

### User Query (Status: Waiting for Execution)

Implementar `ticket:W0-T3: Characterization tests — useTelemetry hook` (W0-T3: Characterization tests — useTelemetry hook).

Expandir `/home/cj/pdc-v2/apps/web/src/hooks/useTelemetry.spec.ts` (que hoje só cobre 2 cenários básicos) com cobertura characterization completa:

- ≥1 teste batching (10 eventos triggeram flush)
- ≥1 teste keepalive em beforeunload
- ≥1 teste visibilitychange (visibilityState=hidden)
- ≥1 teste fallback offline (LocalStorage rehydration após erro)
- ≥1 teste retry com backoff

Confirmar @testing-library/react em devDependencies de `/home/cj/pdc-v2/apps/web/package.json` (já está presente — bom).

Criar helper exportado `createTelemetryStub()` em arquivo separado (ex: apps/web/src/hooks/**test-utils**/telemetry-stub.ts) para reuso.

Guardrails:

- Stubs validam contra TelemetriaEventoSchema real do @pdc/shared/telemetry (zero mocks de schema).
- Capturar comportamento ATUAL incluindo o bug conhecido: o hook envia para `${EDGE_URL}/ingest` mas o edge expõe `/telemetria/batch` e o BFF expõe `/telemetria/batch`. NÃO corrigir esse mismatch aqui — capturar como snapshot da verdade. W1-T4 vai alterar.
- Constitution: zero `any`, zero mocks de schema, tipagem estrita.

Specs: `spec:Refactoring Analysis — PDC v2 Restauração da Alma + Cherry-Pick`, spec:63eac955-69ad-45d7-8599-09637d3ce043/2856bafe-6fa6-4f8f-9d1a-80c50a1c739c.

Out of scope: corrigir o mismatch /ingest vs /telemetria/batch (W1-T4); alterar comportamento do hook (W1-T4).

### Execution Plan (Status: Skipped)

[object Promise]

### Verification (Status: Not Started)