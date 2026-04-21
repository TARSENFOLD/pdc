# E2 — Edge Worker Hardening (validEvents bugfix + SET NX EX 7d + JWKS cache)

## Status

Draft · **CRÍTICA** · Bloqueia DEPLOY.

## Estado actual

file:apps/edge/src/index.ts:

- Linha ~64: `c.json({...count: validEvents.length...})` referencia variável **inexistente** (foi renomeada para `processedEvents`). **`ReferenceError`**** no primeiro POST em produção.**
- **Sem idempotência ao nível Edge** (`SET NX EX` por evento) — D6 midnight rollover do ensaio file:specs/IMPORTANTE/why-edge-telemetry-pipelines-fail-at-midnight.txt continua exposto se cliente fizer retry.
- `wrangler.toml` (file:apps/edge/wrangler.toml): URLs e routes só placeholder.
- `jws-verify` (file:apps/edge/src/middleware/jws-verify.ts): JWKS cache TTL não documentado nem auditado.

## Estado canónico

- Edge "tag-don't-drop" funcional sem runtime errors.
- Idempotência por `eventId`: `SET NX EX 604800` (7 dias) — ataca D6 directamente.
- Wrangler config com routes reais + secrets via `wrangler secret put`.
- JWKS cache TTL ≤ 60s, com refresh on miss.

## Tickets

### E2-T1 — Bugfix `validEvents` reference (1h)

- Substituir `validEvents.length` por `processedEvents.length` (ou variável correcta). Confirmar com vitest test.
- Adicionar test no `apps/edge` (criar suite se não existe) que cobre o path completo.
- **DoD E2E**:
  - **UI**: N/A.
  - **Contrato**: response `{ success, count }` válido.
  - **BFF**: consumer recebe eventos.
  - **Persistência**: nenhuma duplicação.
  - **Impacto**: pipeline funciona ponta-a-ponta sem 503/ReferenceError.

### E2-T2 — Idempotência SET NX EX no Edge

- Antes de pushar para queue, `SET NX EX` em chave `tel:evt:{eventId}` com TTL 604800s.
- Se chave já existe, ignora silenciosamente (return `{success: true, deduped: true}`).
- Atomicidade garantida pela própria operação Redis NX.
- **DoD E2E**:
  - **Contrato**: schema Zod inclui `eventId` UUID obrigatório.
  - **BFF**: mesmo evento enviado 2× nunca chega 2× ao consumer.
  - **Persistência**: chave expira após 7 dias automaticamente (sem garbage collection).
  - **Impacto**: D6 midnight rollover resolvido permanentemente.

### E2-T3 — Documentar JWKS cache TTL + refresh

- file:apps/edge/src/middleware/jws-verify.ts: cache JWKS por 60s, refresh on JWT `kid` mismatch.
- Fail-closed se BFF JWKS unreachable (não permitir bypass).
- **DoD E2E**: rotação de chave RSA no BFF propaga ao Edge em ≤60s sem deploy.

### E2-T4 — Atualizar `wrangler.toml` para multi-env (staging + prod)

- `[env.staging]` e `[env.production]` com routes e vars reais.
- Secrets configurados via `wrangler secret put` (documentar em `spec:B3`).
- `deploy-edge.yml` workflow respeita env baseado em branch.
- **DoD E2E**: PR em `develop` deploya `edge-staging.usepdc.com`; merge `main` deploya `edge.usepdc.com`.

### E2-T5 — Health endpoint no Edge

- `GET /health` que responde `{ status: "ok", version, region, uptime }`.
- Permite health check externo + smoke test pós-deploy.
- **DoD E2E**: ops valida edge em <10s.

## Dependências

- Bloqueia DEPLOY (sem isto, telemetria parte em produção).
- Coordena com B4 (doc espelha código).

</TRAYCER_SPEC>