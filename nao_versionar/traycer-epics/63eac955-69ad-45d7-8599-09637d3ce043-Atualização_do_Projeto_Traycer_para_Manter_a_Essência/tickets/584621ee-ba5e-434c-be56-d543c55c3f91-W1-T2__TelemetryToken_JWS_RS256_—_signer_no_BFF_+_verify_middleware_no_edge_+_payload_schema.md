---
id: "584621ee-ba5e-434c-be56-d543c55c3f91"
title: "W1-T2: TelemetryToken JWS RS256 — signer no BFF + verify middleware no edge + payload schema"
assignee: ""
status: 0
createdAt: "2026-04-18T02:52:35.272Z"
updatedAt: "2026-04-18T02:52:49.034Z"
type: ticket
---

# W1-T2: TelemetryToken JWS RS256 — signer no BFF + verify middleware no edge + payload schema

## Scope & Objective

Implementar TelemetryToken end-to-end: BFF assina JWS RS256 short-lived (1h, mesma chave RSA do JWKS LTI 1.3), edge valida via JWKS fetch + cache no isolate, payload schema canónico no `@pdc/shared`.

**In scope**: signer module no BFF, verify middleware no edge, JWKS cache strategy, schema partilhado, integração com refresh token rotation.
**Out of scope**: emissão do token no `/bootstrap` (W1-T3); aplicar token em real telemetry flow (W1-T4).

## References

- Approach §1.4 (TelemetryToken payload), §3.2 (TelemetryTokenSigner + JwsVerifyMiddleware), decisão B3 — approach spec
- Ficheiros: file:apps/api/src/modules/lti/lti.jwks.ts (reutilizar keypair), file:packages/shared/src/, file:apps/edge/src/

## Guardrails

- Reutilizar EXACTAMENTE a mesma keypair RSA do `lti.jwks.ts` — zero novos secrets.
- Token expira em 1h; refresh acontece no próximo `/bootstrap` ou refresh token rotation (W1-T3).
- Edge verify: cache JWKS por 1h no isolate; fetch da `https://<bff>/.well-known/jwks.json` no boot.
- Payload mínimo: `{ sub, perfilId, iss: 'pdc-v2-bff', aud: 'pdc-v2-edge', exp, iat }` — zero PII.
- `aud` e `iss` validados no edge (rejeita JWS de outras audiences).

## Acceptance Criteria

- `packages/shared/src/telemetry-token.ts`: `TelemetryTokenPayloadSchema` (Zod) + `type TelemetryTokenPayload` exportados.
- `apps/api/src/modules/auth/telemetry-token.ts`: `signTelemetryToken(userId, perfilId): Promise<string>` usando jose + keypair LTI.
- `apps/edge/src/middleware/jws-verify.ts`: middleware Hono que cacheia JWKS, valida token, injeta `c.set('userId', ...)` e `c.set('perfilId', ...)`.
- Worker `/telemetria/batch` passa a usar este middleware; rejeita 401 se token inválido/expirado.
- Testes: ≥3 unit tests (sign+verify roundtrip, expirado retorna 401, audience errada retorna 401).
- Documentação `apps/edge/README.md` actualizada com como JWKS é fetched.

## Verification Steps

- `npm test -w @pdc/shared -- telemetry-token` verde.
- `npm test -w apps/api -- telemetry-token` verde.
- `npm test -w @pdc/edge -- jws-verify` verde.
- Manual: signTelemetryToken local → curl edge `/telemetria/batch` com header → 202.
- Manual: token expirado → 401.
