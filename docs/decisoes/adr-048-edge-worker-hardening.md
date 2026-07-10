# ADR-048 — Edge Worker Hardening (Idempotência + JWKS + Health)

**Data:** 2026-07-05
**Estado:** Aceite
**Caixa:** A — bugfix de ReferenceError + B/C — hardening e documentação

## Contexto

O Edge Worker (`apps/edge/src/index.ts`) era o ponto de entrada da telemetria L1, mas tinha 3 fragilidades:

1. **ReferenceError em produção:** a resposta de `POST /telemetria/batch` referenciava `validEvents.length`, variável que não existia no escopo (tinha sido renomeada para `processedEvents`). Num deploy real, todos os POSTs de telemetria quebrassem com 500.
2. **Sem idempotência no Edge:** eventos reenviados (retry do cliente, reconexão, midnight rollover) chegavam duplicados à fila Redis, violando a Constituição §4 (Telemetria Resiliente).
3. **JWKS cache sem TTL documentado:** a propagação de rotação de chave RSA no BFF para o Edge não era previsível.

## Decisão

1. **Correcção imediata:** substituir `validEvents.length` por `processedEvents.length` no retorno do batch.
2. **Deduplicação atómica no Edge:** antes de empurrar para a fila, cada evento faz `SET tel:evt:{eventId} 1 EX 604800 NX` via Upstash Redis pipeline. Só eventos cuja chave foi criada (`OK`) prosseguem; reenvios são descartados silenciosamente com `count=0, deduped=N`.
3. **Health endpoint:** `GET /health` retorna `{ status, version, region, uptime }` para smoke tests pós-deploy.
4. **JWKS cache TTL 60s:** `jws-verify.ts` recria o `createRemoteJWKSet` a cada 60s e faz refresh on-the-fly em `ERR_JWKS_NO_MATCHING_KEY`, garantindo propagação de rotação de chave ≤60s.
5. **wrangler.toml multi-env:** separar `[env.staging]` (`edge-staging.usepdc.com`) e `[env.production]` (`edge.usepdc.com`), mantendo secrets exclusivamente via `wrangler secret put`.

## Consequências

- Telemetria L1 torna-se resiliente a retries e midnight rollover.
- A perda de eventos duplicados é zero; eventos inválidos continuam a ser etiquetados (tag-don't-drop), não descartados.
- Deploys do Edge podem ser validados automaticamente via `/health`.
- A rotação de chave RSA no BFF propaga-se ao Edge em ≤60s sem necessidade de deploy.

## Referências

- `docs/a_implementar/E2_—_Edge_Worker_Hardening_(validEvents_bugfix_+_SET_NX_EX_7d_+_JWKS_cache).md`
- `specs/IMPORTANTE/01` §11 (Constituição — Telemetria Resiliente)
- `apps/edge/src/index.ts`
- `apps/edge/src/middleware/jws-verify.ts`
- `apps/edge/wrangler.toml`
