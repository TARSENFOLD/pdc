---
id: "5f429246-9d65-4d53-b319-4b222e60f94d"
title: "W0-T3: Characterization tests — useTelemetry hook"
assignee: ""
status: 0
createdAt: "2026-04-18T02:51:04.311Z"
updatedAt: "2026-04-18T02:51:18.126Z"
type: ticket
---

# W0-T3: Characterization tests — useTelemetry hook

## Scope & Objective

Criar bateria de testes characterization para `apps/web/src/hooks/useTelemetry.ts` que capturam comportamento ACTUAL antes de refactor para edge (W1-T4) e sanity (W2-T1). Stubs in-memory que validam contra `TelemetryEventSchema` real do `@pdc/shared` (Constitution v2.x: zero mocks).

**In scope**: testes para batching (10 eventos), keepalive em beforeunload/visibilitychange, fallback offline (LocalStorage/IndexedDB se aplicável), retry com backoff, sanity client-side (se existir).
**Out of scope**: implementação de novas features no hook (vem em W1-T4); confirmar `@testing-library/react` está em `devDependencies` é dependência blocker.

## References

- Atlas §6.4 (useTelemetry estado real), §6.5 (Q2 default item 1), §3.4 (lacuna crítica), §7.2 (eventos canónicos em uso) — atlas spec
- Approach §5.2 W0-T1, §5.3 (gating rule) — approach spec
- Ficheiros: file:apps/web/src/hooks/useTelemetry.ts, file:apps/web/src/hooks/useTelemetry.spec.ts (existe; verificar deps)

## Guardrails

- Stubs in-memory cumprem o schema real (`TelemetryEventSchema` em `@pdc/shared/telemetry.ts`); rejeitar lixo.
- Zero `vi.mock()` ou `any`; tipagem estrita em todos os helpers.
- Testes documentam comportamento ACTUAL incluindo bugs (ex.: se score Tipo 2 vai hardcoded, teste reflecte; W2-T4 vai ALTERAR esse teste explicitamente).

## Acceptance Criteria

- `apps/web/src/hooks/useTelemetry.spec.ts` cobre: ≥1 teste batching, ≥1 keepalive, ≥1 visibilitychange, ≥1 fallback offline, ≥1 retry.
- `@testing-library/react` confirmado em `apps/web/package.json` devDependencies (instalar se ausente).
- `npm test -w apps/web -- useTelemetry` passa 100%.
- Helper `createTelemetryStub()` exportado para reuso em outros testes.

## Verification Steps

- `npm test -w apps/web -- --run useTelemetry` → verde.
- Coverage report: `useTelemetry.ts` ≥80% lines.
- Code review: humano confirma que stubs validam schema real (não duplicam lógica).
