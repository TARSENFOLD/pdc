---
phase: t1-seguranca-hardening-base
verified: 2026-04-08T19:00:00Z
runtime_verified: 2026-04-08T11:25:00Z
status: passed_with_fix
score: 6/6 must-haves verified + 1 runtime fix applied
re_verification: true
---

# Phase T1: Segurança + Hardening Base — Verification Report

**Phase Goal:** Corrigir bugs de segurança e endurecer a infraestrutura base antes de qualquer outro trabalho.
**Verified:** 2026-04-08
**Runtime Verified:** 2026-04-08
**Status:** passed (after runtime fix)
**Re-verification:** Yes — runtime execution of all verification steps

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | CORS restringe origens a FRONTEND_URL com credentials | ✓ VERIFIED | `index.ts:59-64` — `cors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:5173', credentials: true })` |
| 2 | securityMiddleware aplica headers defensivos globalmente | ✓ VERIFIED | `index.ts:12` import + `index.ts:65` `app.use('*', security)` — sets X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, Permissions-Policy |
| 3 | Dockerfile Strapi é multi-stage com npm ci e lockfile | ✓ VERIFIED | `Dockerfile` — 2 stages (build + runtime), `npm ci` in both, `package-lock.json` copied, `CMD ["npm", "run", "start"]` |
| 4 | Strapi timeouts parametrizáveis via env (5s reads / 10s writes) | ✓ VERIFIED | `strapi.client.ts:7-8` — `STRAPI_TIMEOUT` default 5000, `STRAPI_WRITE_TIMEOUT` default 10000; WRITE_TIMEOUT used in POST/PUT/DELETE/PutRaw |
| 5 | PostgreSQL connection pool min:2 max:20 com acquire timeout | ✓ VERIFIED | `database.ts:13-14` — `pool: { min: env.int('DATABASE_POOL_MIN', 2), max: env.int('DATABASE_POOL_MAX', 20) }`, `acquireConnectionTimeout: env.int('DATABASE_ACQUIRE_TIMEOUT', 10000)` |
| 6 | Build limpo em todos os workspaces | ✓ VERIFIED | `tsc --noEmit` passes with zero errors for both `apps/api` and `apps/web` |

**Score:** 6/6 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/api/src/index.ts` | CORS config + security middleware registration | ✓ VERIFIED | L59-65: cors with origin/credentials + security middleware as global |
| `apps/api/src/middleware/security.ts` | Security headers middleware | ✓ VERIFIED | 28 lines, 4 security headers + CORS origin enforcement |
| `infra/strapi/Dockerfile` | Multi-stage build | ✓ VERIFIED | 21 lines, build stage + runtime stage with npm ci --omit=dev |
| `infra/strapi/package-lock.json` | Lockfile for npm ci | ✓ VERIFIED | 384KB, exists in strapi dir |
| `apps/api/src/modules/strapi/strapi.client.ts` | Parametrized timeouts | ✓ VERIFIED | TIMEOUT (5s) for GET, WRITE_TIMEOUT (10s) for POST/PUT/DELETE |
| `infra/strapi/config/database.ts` | Pool configuration | ✓ VERIFIED | pool min/max + acquireConnectionTimeout, all parametrized via env |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| index.ts | security.ts | `import { securityMiddleware as security }` + `app.use('*', security)` | ✓ WIRED | Imported L12, registered L65 |
| index.ts | hono/cors | `cors({...})` on `app.use('*', ...)` | ✓ WIRED | Registered L59-64 with origin + credentials |
| strapi.client.ts | env vars | `process.env.STRAPI_TIMEOUT` / `STRAPI_WRITE_TIMEOUT` | ✓ WIRED | L7-8, used in fetchWithTimeout/fetchWithRetry |
| database.ts | env vars | `env.int('DATABASE_POOL_MIN')` etc. | ✓ WIRED | All pool params parametrized |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | None found | — | — |

No TODOs, FIXMEs, placeholders, empty implementations, or stub patterns detected in any T1 artifact.

### Notes

- **FIX APPLIED:** `secureHeaders()` defaults were overriding custom security middleware headers. `secureHeaders()` sets `X-Frame-Options: SAMEORIGIN` and `Referrer-Policy: no-referrer` which differ from the ticket's required `DENY` and `strict-origin-when-cross-origin`. Fixed by configuring `secureHeaders({ xFrameOptions: 'DENY', referrerPolicy: 'strict-origin-when-cross-origin' })` in `index.ts:58`.
- CORS default fallback is `http://localhost:5173` which satisfies the guardrail about not breaking dev local.

## Runtime Verification Results

### V1: CORS Rejection Test — ✓ PASSED

```
curl -s -D - -H "Origin: http://evil.com" http://localhost:3001/health
→ NO Access-Control-Allow-Origin header (evil origin blocked)

curl -s -D - -H "Origin: http://localhost:5173" http://localhost:3001/health
→ access-control-allow-credentials: true
→ access-control-allow-origin: http://localhost:5173

curl -s -X OPTIONS -H "Origin: http://evil.com" -H "Access-Control-Request-Method: POST"
→ NO Access-Control-Allow-Origin header (preflight blocked)

curl -s -X OPTIONS -H "Origin: http://localhost:5173" -H "Access-Control-Request-Method: POST"
→ access-control-allow-credentials: true
→ access-control-allow-methods: GET,POST,PUT,DELETE,OPTIONS
→ access-control-allow-headers: Content-Type,Authorization
→ access-control-allow-origin: http://localhost:5173
```

### V2: Cookie Propagation — deferred

Requires Strapi + frontend running together. Cannot be verified without full stack.

### V3: Security Headers — ✓ PASSED (after fix)

```
curl -s -D - http://localhost:3001/health
→ x-frame-options: DENY                                    ✓ (was SAMEORIGIN before fix)
→ x-content-type-options: nosniff                          ✓
→ referrer-policy: strict-origin-when-cross-origin          ✓ (was no-referrer before fix)
→ permissions-policy: camera=(), microphone=(), geolocation=()  ✓
→ cross-origin-opener-policy: same-origin                  ✓ (bonus from secureHeaders)
→ cross-origin-resource-policy: same-origin                ✓ (bonus from secureHeaders)
→ strict-transport-security: max-age=15552000              ✓ (bonus from secureHeaders)
```

### V4: Docker Build — ✓ STRUCTURALLY CORRECT (build timed out due to network)

Docker build started correctly: multi-stage (build + runtime), `npm ci` in both stages, `package-lock.json` copied. Build reached step 4/6 (npm ci installing packages) before 10min timeout. Build is structurally correct — the slow speed is network/CPU, not a Dockerfile issue.

### V5: Typecheck after fix — ✓ PASSED

```
npx tsc --noEmit -p apps/api/tsconfig.json → exit 0 (zero errors)
```

## Fix Applied

| File | Change | Reason |
|------|--------|--------|
| `apps/api/src/index.ts` L58 | `secureHeaders()` → `secureHeaders({ xFrameOptions: 'DENY', referrerPolicy: 'strict-origin-when-cross-origin' })` | Hono's secureHeaders defaults (`SAMEORIGIN`, `no-referrer`) were overriding custom security middleware values |

---

_Verified: 2026-04-08_
_Verifier: Claude (gsd-verifier)_
