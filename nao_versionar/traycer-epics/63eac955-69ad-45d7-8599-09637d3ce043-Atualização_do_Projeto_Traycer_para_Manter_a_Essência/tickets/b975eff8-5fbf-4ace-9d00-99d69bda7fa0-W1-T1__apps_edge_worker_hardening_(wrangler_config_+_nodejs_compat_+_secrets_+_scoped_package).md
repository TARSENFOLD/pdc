---
id: "b975eff8-5fbf-4ace-9d00-99d69bda7fa0"
title: "W1-T1: apps/edge worker hardening (wrangler config + nodejs_compat + secrets + scoped package)"
assignee: ""
status: 0
createdAt: "2026-04-18T02:52:17.515Z"
updatedAt: "2026-04-18T02:52:34.508Z"
type: ticket
---

# W1-T1: apps/edge worker hardening (wrangler config + nodejs_compat + secrets + scoped package)

## Scope & Objective

Transformar `apps/edge/` de rascunho funcional para workspace de produção: renomear package para `@pdc/edge`, configurar `wrangler.toml` com `nodejs_compat`/`compatibility_date`/routes/secrets, instalar TypeScript estrito, criar scripts dev/build/deploy. Sem ainda implementar Telemetry Token (W1-T2) ou dual-write (W1-T4).

**In scope**: estrutura de workspace, configs, secrets management via `wrangler secret`, deploy pipeline GitHub Action.
**Out of scope**: lógica de validação JWS (W1-T2), queue Upstash + consumer (W1-T4), endpoints catalogo edge (futuro).

## References

- Atlas §6.1 correção 3 (apps/edge é rascunho), §2.4 (ADR-005 migração) — atlas spec
- Approach §1.1 placement, §1.2 transition (Strangler Fase A→B→C), decisão A3 — approach spec
- ADR-005 — file:docs/decisoes/adr-005-edge-telemetry.md
- Ficheiros: file:apps/edge/package.json, file:apps/edge/wrangler.toml, file:apps/edge/src/index.ts

## Guardrails

- Worker actual continua a funcionar durante hardening (não quebrar pre-existing endpoints `/telemetria/batch` e `/landing/pulse`).
- Secret `TELEMETRY_SECRET` placeholder do wrangler.toml é REMOVIDO; secret real só via `wrangler secret put`.
- Compatibility date fixa (não usar `latest`); flag `nodejs_compat` activa para permitir Web Crypto + bibliotecas com polyfills.
- Worker permanece edge-clean: zero `node:fs`, `node:http`, etc.

## Acceptance Criteria

- `apps/edge/package.json`: `name: "@pdc/edge"`, `type: "module"`, scripts `dev`/`build`/`deploy`/`lint`/`typecheck`.
- `apps/edge/wrangler.toml` com: `compatibility_date`, `compatibility_flags = ["nodejs_compat"]`, `[vars]` (não-secret), `routes` configuradas, `[observability]`.
- `apps/edge/tsconfig.json` strict + `@cloudflare/workers-types`.
- `apps/edge/src/index.ts` mantém endpoints actuais funcionais (smoke deploy verde).
- `.github/workflows/deploy-edge.yml` corre `wrangler deploy` em push para `main` (após Branch Protection W0-T9).
- Secret `TELEMETRY_SECRET` antigo removido do código; documentação em `apps/edge/README.md` explica `wrangler secret put`.

## Verification Steps

- `wrangler dev` local funciona, responde aos 2 endpoints existentes.
- `npm run typecheck -w @pdc/edge` verde.
- `npm run lint -w @pdc/edge` verde.
- Deploy em ambiente de pré-produção: `wrangler deploy --env staging` → URL acessível.
- `curl -X POST <staging>/telemetria/batch -H "X-Telemetry-Token: dummy" -d "{...}"` retorna 401 (auth ainda placeholder até W1-T2).
