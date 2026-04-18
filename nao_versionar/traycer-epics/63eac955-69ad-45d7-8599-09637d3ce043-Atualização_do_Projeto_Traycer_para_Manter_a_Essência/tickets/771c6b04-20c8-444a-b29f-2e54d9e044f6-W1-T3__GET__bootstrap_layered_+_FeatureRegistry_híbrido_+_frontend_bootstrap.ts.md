---
id: "771c6b04-20c8-444a-b29f-2e54d9e044f6"
title: "W1-T3: GET /bootstrap layered + FeatureRegistry híbrido + frontend bootstrap.ts"
assignee: ""
status: 0
createdAt: "2026-04-18T02:52:49.840Z"
updatedAt: "2026-04-18T02:53:04.753Z"
type: ticket
---

# W1-T3: GET /bootstrap layered + FeatureRegistry híbrido + frontend bootstrap.ts

## Scope & Objective

Criar endpoint consolidado `/bootstrap` (layered: session/capabilities/security/ux) + `FeatureRegistry` estático no `@pdc/shared` cruzado com Strapi runtime + frontend `lib/bootstrap.ts` que consome no boot do app.

**In scope**: schema, BFF handler, cross-com-Strapi via `feature-flags.service`, frontend hydration + React Context.
**Out of scope**: deprecation dos endpoints antigos `/auth/me` + `/feature-flags/effective` (W5); UI consumindo `features` para esconder/mostrar (W4).

## References

- Approach §1.4 (BootstrapResponseSchema, Features registry), §3.2 (BootstrapHandler), §3.3 boot flow, decisões B1+B2 — approach spec
- Ficheiros: file:packages/shared/src/, file:apps/api/src/routes/, file:apps/api/src/modules/feature-flags/feature-flags.service.ts (reutilizar), file:apps/web/src/

## Guardrails

- `/auth/me` e `/feature-flags/effective` permanecem funcionais (não tocar) — coexistem para rollback.
- Registry estático declara TODAS as features que existem (status STABLE/BETA/ALPHA/HIDDEN/ROLLOUT); Strapi runtime override apenas controla ON/OFF efectivo.
- Features `HIDDEN` no registry NUNCA expostas no `/bootstrap` (mesmo se Strapi tiver flag ON).
- Frontend nunca lê `Features` directamente para decisão de UI; usa `bootstrap.capabilities.features[key]`.

## Acceptance Criteria

- `packages/shared/src/registry/features.ts`: `Features` const + `FeatureKey` type + `FeatureStatusSchema` Zod enum exportados.
- `packages/shared/src/bootstrap.ts`: `BootstrapResponseSchema` (layered: session/capabilities/security/ux) + types.
- `apps/api/src/routes/bootstrap.ts`: GET `/bootstrap` autenticado, compõe payload, emite Telemetry Token via W1-T2.
- `apps/web/src/lib/bootstrap.ts`: fetcher + cache em memória + React Context provider `<BootstrapProvider>`.
- `apps/web/src/main.tsx` ou `App.tsx`: usa `<BootstrapProvider>` antes de qualquer outro consumer de auth/features.
- Testes: ≥1 contract test do schema + ≥3 unit tests do handler (composição correcta + filtro HIDDEN + override Strapi prevalece).

## Verification Steps

- `curl -X GET <bff>/bootstrap -H "Cookie: access_token=..."` → JSON com 4 layers.
- Frontend dev: `console.log` no provider mostra payload completo no boot.
- `npm test -w @pdc/shared -- bootstrap` verde.
- `npm test -w apps/api -- bootstrap` verde.
