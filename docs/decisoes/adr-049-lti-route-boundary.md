# ADR-049 — Fronteira Canónica da Rota LTI

**Data:** 2026-07-05
**Estado:** Aceite
**Caixa:** C — divergência crítica entre rota comentada e serviços reais

## Contexto

`apps/api/src/routes/lti.ts` estava praticamente todo comentado com um `TODO` de desativação. O código comentado prometia OIDC login/launch LTI 1.3 completo, mas chamava métodos que não existem no serviço real (`generateNonce`, `validateLaunchJwt`, `upsertLtiUser`) e referia um `LtiScoreSchema` que também não existia em `@pdc/shared`.

Ao mesmo tempo, partes reais do ecossistema LTI já existem:

- `lti.ags.ts` envia score para AGS quando recebe `lineitemUrl`, `score` e token LMS.
- `lti.nrps.ts` consulta memberships NRPS quando recebe URL e token LMS.
- `lti.score.service.ts` tenta grade passback a partir de contexto LTI persistido no perfil.
- `lti.jwks.ts` expõe JWKS quando `LTI_PUBLIC_KEY` está configurada.

Reativar a rota comentada sem implementar a validação IMS/OIDC completa seria AP-02 (stub/falsa completude) e risco de segurança.

## Decisão

1. Remover o bloco morto comentado de `routes/lti.ts`.
2. Manter `GET /lti/jwks` funcional e explícito: retorna `503 LTI_JWKS_UNAVAILABLE` quando chaves LTI não estão configuradas.
3. Expor `POST /lti/login` e `POST /lti/launch` como `501 LTI_LAUNCH_NOT_IMPLEMENTED`, documentando que o launch OIDC ainda requer nonce, JWT IMS e provisionamento seguro.
4. Reativar somente utilitários já sustentados por serviços reais:
   - `POST /lti/ags/scores`, protegido por JWT, validado por `LtiScoreSchema` em `@pdc/shared`.
   - `GET /lti/nrps/memberships`, protegido por JWT e query validada.
5. Criar testes de contrato para impedir regressão silenciosa.

## Consequências

- A plataforma deixa de ter uma rota LTI “muda” que parece existir mas não faz nada.
- Grade passback manual/serviço permanece utilizável onde o token LMS já existe.
- OIDC launch completo continua fora do escopo até implementação dedicada com validação IMS, nonce/estado persistido e mapeamento seguro de utilizador.
- O próximo ticket de LTI deve implementar `generateNonce`, `validateLaunchJwt` e provisionamento com testes criptográficos, não descomentar código legado.

## Referências

- `apps/api/src/routes/lti.ts`
- `apps/api/src/modules/lti/lti.ags.ts`
- `apps/api/src/modules/lti/lti.nrps.ts`
- `apps/api/src/modules/lti/lti.score.service.ts`
- `packages/shared/src/core.ts`
