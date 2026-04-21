# B6 — docs/api/auth.md (slug estudante, 7 perfis, dois tipos de token)

## Status

Draft · Depende de E1 (rename `aluno` → `estudante`).

## Estado actual

file:docs/api/auth.md:

- Linha 16, 27, 45: role default = `"aluno"`.
- Não menciona os **7 perfis canónicos** (spec:IMPORTANTE/03 §1) — apenas refere "6 roles" (alinhado com file:packages/shared/src/user.ts que tem 6).
- Linha 168: JWT só HS256 — sem distinção do RS256 telemetry-token.
- Sem documentação dos endpoints de OAuth social, OTP via SMS (Twilio), 2FA flow.
- Sem documentação do `GET /bootstrap` 4-camadas (file:apps/api/src/routes/bootstrap.ts).

## Estado canónico

- **7 perfis**: `estudante`, `mentor`, `instituicao`, `comite_cientifico`, `moderador`, `super_admin`, `patrocinador` 🔮 (spec:IMPORTANTE/03 §1).
- Slug `aluno` é legacy; `estudante` é canónico (spec:IMPORTANTE/03 §1 nota).
- Dois tokens: HS256 user-session (cookie httpOnly) + RS256 telemetry-token (JWS).

## Tickets

### B6-T1 — Reescrever para 7 perfis com slug estudante

Atualizar todos os exemplos JSON (`role: "estudante"`), tabela de redirects pós-login (spec:IMPORTANTE/03 §8), capacidades por perfil.

- **DoD E2E**: zero menções a `aluno` no doc após E1 aceite.

### B6-T2 — Documentar os 2 tipos de token e JWKS endpoint

Secção dedicada: HS256 user-session (cookie) vs RS256 telemetry-token (header). Onde reside cada chave, JWKS público em BFF, rotação.

- **DoD E2E**: dev frontend e dev edge sabem qual token usar onde.

### B6-T3 — Documentar OAuth social + OTP + 2FA

Endpoints `/auth/oauth/google`, `/auth/oauth/linkedin`, `/auth/otp/request`, `/auth/otp/verify`, `/auth/2fa/enable`, `/auth/2fa/verify`. Estado real (Twilio mockado per spec:IMPORTANTE/02 P2).

- **DoD E2E**: novo cliente integra OAuth seguindo o doc.

### B6-T4 — Documentar GET /bootstrap (4 camadas)

Schema: session, capabilities, security, ux. Como cada camada é populada. Cache.

- **DoD E2E**: dev frontend usa bootstrap em vez de chamadas separadas.

## Dependências

- Depende de E1 (rename slug).