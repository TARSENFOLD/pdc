# DEV_SKIP_OTP — Bypass de OTP para Desenvolvimento

Este documento explica o funcionamento, a configuração e as medidas de segurança do mecanismo de bypass de OTP (One-Time Password) no ambiente de desenvolvimento do PDC.

> **Revisão:** 2026-07-10 — reescrito para reflectir o modelo real de guards após a migração Hetzner. A versão anterior descrevia um “Guard Triplo” com verificação de domínio Railway e um “Código Mestre 000000” que **não existem no código actual**.

## 1. O que é?

O `DEV_SKIP_OTP` é uma funcionalidade do BFF (`apps/api`) que permite aos desenvolvedores autenticarem-se na plataforma sem necessitarem de receber e introduzir códigos de verificação reais (via Email ou SMS). Isto acelera significativamente o ciclo de desenvolvimento e testes de UI.

## 2. Como Activar

1. No ficheiro `apps/api/.env` (local), define:
   ```env
   DEV_SKIP_OTP=true
   NODE_ENV=development
   ```
2. Reinicia o servidor do BFF.

## 3. Como Funciona (Modelo Actual)

Quando `DEV_SKIP_OTP=true` **e** `NODE_ENV` é `development` ou `test`, a função `initiate2faChallenge` em `apps/api/src/routes/auth.otp.ts` **salta o desafio OTP inteiramente**: emite imediatamente os cookies de sessão (`access_token`, `refresh_token`) e devolve o utilizador, redirecionando para o dashboard sem passar pelo ecrã de OTP.

> **Nota:** Ao contrário da versão anterior, **não existe “Código Mestre 000000”**. O bypass ocorre na iniciação do desafio, não na verificação. Se o fluxo de UI levar o utilizador ao ecrã de verificação de OTP, o código tem de ser o OTP real gerado e enviado (ou visível nos logs em dev via `[DEV] OTP gerado`).

## 4. Camadas de Protecção (Guard Duplo + Hardening Env)

O bypass só funciona se **todas** as seguintes condições forem verdadeiras:

### Guard 1 — Ambiente Não-Produção
`NODE_ENV` deve ser `development` ou `test`. Em `production`, `allowOtpBypass` é `false` e o bypass nunca activa, independentemente de `DEV_SKIP_OTP`.

**Código:** `apps/api/src/routes/auth.otp.ts:36`
```typescript
const allowOtpBypass = env.NODE_ENV === 'development' || env.NODE_ENV === 'test';
```

### Guard 2 — Variável Explícita
`DEV_SKIP_OTP` deve ser exactamente `'true'`.

**Código:** `apps/api/src/routes/auth.otp.ts:39`
```typescript
if (allowOtpBypass && env.DEV_SKIP_OTP === 'true') { ... }
```

### Hardening Env (Defense-in-Depth)
O `env.ts` **recusa o boot do BFF** se `DEV_SKIP_OTP=true` em `NODE_ENV=production`. Mesmo que alguém configure acidentalmente `DEV_SKIP_OTP=true` em produção, o servidor não arranca.

**Código:** `apps/api/src/lib/env.ts` — `collectProductionMissingVars()`
```typescript
if (parsedEnv.DEV_SKIP_OTP === 'true') {
  missing.push('DEV_SKIP_OTP must not be enabled in production (security: OTP bypass disabled)');
}
```

### Por que o Guard de Domínio foi removido
A versão anterior deste doc descrevia um terceiro guard: “`STRAPI_URL` não contém `pdc-strapi.railway.app`”. Este guard foi **removido do código** porque, após a migração do BFF/CMS do Railway para o VPS Hetzner (ADR-046), o domínio `pdc-strapi.railway.app` já não é o URL de produção do Strapi — a verificação tornou-se obsoleta. O Guard 1 (`NODE_ENV`) é a protecção primária e suficiente; o Hardening Env é a camada extra de defense-in-depth que substitui o guard de domínio com uma garantia mais forte (boot-time hard refusal vs. runtime string check).

## 5. Logs de Auditoria

Sempre que o bypass é activado, o servidor emite um log de aviso:
```text
WARN: [DEV] OTP skipped via DEV_SKIP_OTP
```
Isto serve para manter a visibilidade sobre a segurança do sistema durante o desenvolvimento.

## 6. Checklist Pré-Deploy

⚠️ **NUNCA** incluas `DEV_SKIP_OTP=true` em variáveis de ambiente de produção.

- [ ] Verificar que `apps/api/.env.example` tem `DEV_SKIP_OTP=false` (ou ausente).
- [ ] Verificar que o `docker-compose.prod.yml` **não** define `DEV_SKIP_OTP`.
- [ ] Verificar que os secrets da CI/CD não contêm esta variável em jobs de produção.
- [ ] O BFF recusa o boot se `DEV_SKIP_OTP=true` em produção (hardening env) — testado em `env.spec.ts`.
- [ ] Em caso de dúvida, o sistema falhará para o modo seguro (OTP obrigatório) devido ao Guard 1 + Hardening Env.

## 7. Locais onde DEV_SKIP_OTP é usado

| Ficheiro | Uso |
|----------|-----|
| `apps/api/src/routes/auth.otp.ts:39` | Bypass do desafio OTP na iniciação |
| `apps/api/src/middleware/rateLimit.ts:49` | Bypass de rate limits de auth em dev/test |
| `apps/api/src/lib/env.ts` | Hardening: recusa boot em produção |
| `.github/workflows/ci.yml` | Activado apenas em jobs E2E com `NODE_ENV=test` |
| `docker-compose.test.yml` | Activado com `NODE_ENV=test` |
| `playwright.config.ts` | Default `'true'` com `NODE_ENV='test'` |
| `tests/helpers/seed.ts` | Aviso se não activado |
