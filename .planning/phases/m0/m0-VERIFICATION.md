---
phase: m0-build-limpo
verified: 2026-04-06T10:00:00Z
status: gaps_found
score: 3/6 must-haves verified
gaps:
  - truth: "tsc --noEmit passes in apps/api with zero errors"
    status: failed
    reason: "10 TypeScript errors across 2 files: auth.service.ts (7 syntax errors — code placed outside object literal) and cursos.ts (3 syntax errors — malformed route handler)"
    artifacts:
      - path: "apps/api/src/modules/auth/auth.service.ts"
        issue: "Lines 122-138: let/function declarations inside authService object literal — cachedAlunoRoleId and getAlunoRoleId() split out of the object scope"
      - path: "apps/api/src/routes/cursos.ts"
        issue: "Lines 79,83: floating code after interface definitions inside route handler — comment '// ... uso nos métodos ...' suggests incomplete paste/edit"
    missing:
      - "Fix auth.service.ts: move cachedAlunoRoleId and getAlunoRoleId() before the authService const or restructure into a class"
      - "Fix cursos.ts: remove stray comment and ensure code is properly scoped inside the route handler"
  - truth: "STATE.md and REQUIREMENTS.md reflect actual codebase state"
    status: failed
    reason: "Multiple discrepancies between planning docs and codebase reality"
    artifacts:
      - path: ".planning/STATE.md"
        issue: "M7 claims 'zero any, zero erros TS/lint' — false (z.any() in shared, any in auth.service.ts, TS errors in API). Fase 4 lists Programas and Feed as ❌ — both are implemented. auth.ts listed as >400 lines — now 134."
      - path: ".planning/REQUIREMENTS.md"
        issue: "REQ-2-001 marked [x] but hardcoded hex colors in 4 files. REQ-4-009 marked [ ] but 4 frontend pages + BFF exist. REQ-4-014 marked [ ] but full scoring algorithm exists."
      - path: ".planning/roadmap.md"
        issue: "All M0 tasks shown as [ ] — T1-T4 are done. Fase 1 says OAuth+2FA ❌ — both exist. M1 all [ ] but 6/8 done. M5/M7 milestones partially done but all shown [ ]."
    missing:
      - "STATE.md: Fix M7 claim, fix Fase 4 Programas/Feed status, update auth.ts line count"
      - "REQUIREMENTS.md: REQ-2-001 → [~], REQ-4-009 → [~], REQ-4-014 → [x], REQ-4-013 → [~]"
      - "roadmap.md: Update M0-T1/T2/T3/T4 to [x], fix Fase 1 OAuth status, update milestone task states"
  - truth: "roadmap.md reflects actual delivery state"
    status: failed
    reason: "Roadmap is broadly stale — at least 25+ tasks marked [ ] that are actually done or partially done"
    artifacts:
      - path: ".planning/roadmap.md"
        issue: "M0 tasks (T1-T4 done), M1 tasks (6/8 done), M3 tasks (OAuth+OTP exist), M5 tasks (SEO/PWA/Performance done), M7 tasks (Sentry/pino/fonts done), Ondas 1-4 done — all still shown as [ ] or [~]"
    missing:
      - "Comprehensive update of all milestone task states to match reality"
---

# M0: Build Limpo e Qualidade Base — Verification Report

**Phase Goal:** `tsc --noEmit` passa sem erros em `apps/web` e `apps/api`. Base sólida para continuar.
**Verified:** 2026-04-06
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `tsc --noEmit` passes in apps/web (zero errors) | ✓ VERIFIED | Exit code 0, zero output. Tested at 2026-04-06. |
| 2 | `tsc --noEmit` passes in apps/api (zero errors) | ✗ FAILED | Exit code 2. 10 errors: 7 in auth.service.ts (lines 122-138, declarations inside object literal), 3 in cursos.ts (lines 79,83, malformed handler) |
| 3 | No `apiClient` references remain in codebase | ✓ VERIFIED | `grep -rn "apiClient" apps/web/src/lib/api/ apps/api/src/` — zero matches |
| 4 | Component API issues (Avatar, Modal, Button) resolved | ✓ VERIFIED | Avatar uses `fallback` prop; LtiPlataformasPage has no `isOpen`/`destructive`/`headers` |
| 5 | STATE.md and REQUIREMENTS.md reflect actual codebase state | ✗ FAILED | 9+ discrepancies found (see detailed analysis below) |
| 6 | roadmap.md reflects actual delivery state | ✗ FAILED | 25+ tasks marked `[ ]` that are actually done or partially done |

**Score:** 3/6 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/web/` | tsc clean | ✓ VERIFIED | Zero errors |
| `apps/api/` | tsc clean | ✗ FAILED | 10 errors in 2 files |
| `apps/api/src/modules/auth/auth.service.ts` | Valid syntax | ✗ BROKEN | Lines 122-138: `let`/`function` declarations inside object literal scope |
| `apps/api/src/routes/cursos.ts` | Valid syntax | ✗ BROKEN | Lines 68-83: floating comment + code after interface defs |
| `.planning/STATE.md` | Accurate state | ✗ STALE | Multiple false claims (see below) |
| `.planning/REQUIREMENTS.md` | Accurate requirements | ✗ STALE | 5 requirements have wrong status |
| `.planning/roadmap.md` | Accurate delivery state | ✗ STALE | Broadly outdated |

### Key Link Verification

N/A — M0 is infrastructure/quality tasks, not feature wiring.

### Data-Flow Trace (Level 4)

N/A — M0 has no dynamic data rendering.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Web tsc clean | `npx tsc --noEmit -p apps/web/tsconfig.json` | Exit 0 | ✓ PASS |
| API tsc clean | `npx tsc --noEmit -p apps/api/tsconfig.json` | Exit 2, 10 errors | ✗ FAIL |
| Zero apiClient | `grep -rn "apiClient" apps/web/src/lib/api/ apps/api/src/` | No output | ✓ PASS |
| Avatar fallback | `grep -n "Avatar" AdminAuditPage.tsx` | Uses `fallback` prop | ✓ PASS |
| LtiPlataformasPage clean | `grep "isOpen\|destructive\|headers" LtiPlataformasPage.tsx` | No matches | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| REQ-NF-003 | M0/M7 | Zero `any` in TypeScript | ✗ FAILED | `z.any()` in shared/index.ts:164; `any` in auth.service.ts:152,183; `any` in CriarExperienciaPage.tsx:28 |
| REQ-0-002 | M0 | apps/web tsc clean | ✓ SATISFIED | tsc --noEmit exit 0 |
| REQ-0-003 | M0 | apps/api tsc clean | ✗ FAILED | tsc --noEmit exit 2 (10 errors) |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `apps/api/src/modules/auth/auth.service.ts` | 122–138 | Code outside object literal scope | 🛑 Blocker | Breaks API compilation |
| `apps/api/src/routes/cursos.ts` | 68 | `// ... uso nos métodos ...` placeholder comment with stray code | 🛑 Blocker | Breaks API compilation |
| `apps/api/src/modules/auth/auth.service.ts` | 152 | `as { data: { attributes: any }[] }` | ⚠️ Warning | Violates REQ-NF-003 |
| `apps/api/src/modules/auth/auth.service.ts` | 183 | `perfil?: any` | ⚠️ Warning | Violates REQ-NF-003 |
| `packages/shared/src/index.ts` | 164 | `z.any()` | ⚠️ Warning | Violates REQ-NF-003 |
| `apps/web/src/features/instituicao/CriarExperienciaPage.tsx` | 28 | `err: any` | ⚠️ Warning | Violates REQ-NF-003 |
| `apps/web/src/pages/ForgotPasswordPage.tsx` | 23,26,37,46 | Hardcoded hex `#f59e0b`, `#d97706` | ⚠️ Warning | Violates REQ-2-001 |
| `apps/web/src/components/auth/ProtectedRoute.tsx` | 12 | Hardcoded hex `#f59e0b` | ⚠️ Warning | Violates REQ-2-001 |
| `apps/web/src/features/tina/TinaChat.tsx` | 92,104,108 | Hardcoded hex in inline styles | ⚠️ Warning | Violates REQ-2-001 |
| `apps/web/src/pages/ForgotPasswordPage.tsx` | 18,33,51 | `text-gray-*` instead of token | ⚠️ Warning | Violates REQ-2-001 |
| `apps/web/src/pages/DashboardPage.tsx` | 12,24,28,32,33 | `text-gray-*` instead of token | ⚠️ Warning | Violates REQ-2-001 |
| `apps/web/src/features/simulacoes/Tipo1Player.tsx` | 98 | `text-gray-600` | ℹ️ Info | Violates REQ-2-001 |
| `apps/web/src/features/simulacoes/SimulacaoPlayerPage.tsx` | 21,48 | `text-gray-500` + "em desenvolvimento" placeholder | ⚠️ Warning | Sim Tipo 3 placeholder |

### Human Verification Required

### 1. API Syntax Fixes Test
**Test:** After fixing auth.service.ts and cursos.ts, run `npx tsc --noEmit -p apps/api/tsconfig.json` and verify zero errors
**Expected:** Exit code 0, no output
**Why human:** Fixes require code editing and may have cascading effects

### 2. Strapi Runtime Connectivity
**Test:** Run `docker compose up -d` and verify Strapi starts and API can connect
**Expected:** `GET /health` returns OK with PostgreSQL and Redis status
**Why human:** Requires Docker runtime environment

---

## Detailed State Audit (M0-T6 Input)

### STATE.md Discrepancies

| Claim in STATE.md | Reality | Corrective Action |
|-------------------|---------|-------------------|
| M7: "zero any, zero erros TS/lint" | z.any() in shared, `any` in auth.service.ts + CriarExperienciaPage, 10 TS errors in API | Change to "z.any() pendente em metadata; any em auth.service.ts; erros TS no API pendentes" |
| Fase 0: `[~]` PARCIAL (Strapi config pendente) | Correct but incomplete — API also has TS errors | Add "API tsc falha: auth.service.ts + cursos.ts" |
| Fase 4: Programas ❌ | 4 frontend pages + BFF route (92 lines) + router wiring exist | Change to Programas ✅ (or [~] if Strapi schema pending) |
| Fase 4: Feed ❌ | Full scoring algorithm: calcScore, recencyScore, feed.scoring.ts, feed.weights.ts, 4 feed endpoints | Change to Feed ✅ |
| Fase 4: Conquistas auto ❌ | `/conquistas/verificar` endpoint exists, delegates to Strapi. Auto-trigger from telemetry events NOT implemented | Change to Conquistas auto [~] |
| auth.ts > 400 lines (implied by NF-007 reference) | auth.ts = 134 lines (refactored into modules) | Update file reference in NF-007 |

### REQUIREMENTS.md Discrepancies

| Requirement | Current Status | Should Be | Evidence |
|-------------|---------------|-----------|----------|
| REQ-2-001 | `[x]` "sem valores hardcoded" | `[~]` | Hardcoded hex colors (#f59e0b, #d97706, #d4a017, #0a0a0f) in ForgotPasswordPage, ProtectedRoute, TinaChat. text-gray-* in 5 files. |
| REQ-4-009 | `[ ]` Programas | `[~]` | ProgramasCatalogoPage, ProgramaDetailPage, InstituicaoProgramasPage, CriarProgramaPage exist. BFF programas.ts (92 lines) with 4+ endpoints. Wired in router.tsx. Strapi schema may be pending. |
| REQ-4-013 | `[ ]` Conquistas auto | `[~]` | `/conquistas/verificar` BFF endpoint exists (conquistas.ts:34-40). Delegates to Strapi. Auto-trigger by telemetry events NOT wired. |
| REQ-4-014 | `[ ]` Feed ranking | `[x]` | feed.scoring.ts exports calcScore/calcRecencyScore. feed.weights.ts exports getWeights/setWeights. feed.ts:204,277,344 apply scoring. 4 feed endpoints exist. |
| REQ-NF-003 | `[~]` | `[~]` correct | z.any() in shared + `any` in auth.service.ts:152,183 + CriarExperienciaPage:28 |
| REQ-NF-007 | `[ ]` "violado em auth.ts e LandingPage.tsx" | `[ ]` update list | auth.ts now 134 lines ✓. Violations: feed.ts(404), seo.ts(300), mensagens.ts(288), vinculos.ts(266), cursos.ts(233), simulacoes.ts(224), mentorias.ts(215), admin.ts(215), LandingPage.tsx(439) |

### roadmap.md Discrepancies

| Section | Current | Should Be |
|---------|---------|-----------|
| Fase 1 Auth | "Google OAuth + 2FA ❌" | "Google OAuth + OTP 2FA ✅" (auth.oauth.ts, otp.service.ts exist) |
| Fase 4 | "Feed ❌" | Feed ✅ (scoring algorithm implemented) |
| M0-T1 | `[ ]` | `[x]` — zero apiClient references |
| M0-T2 | `[ ]` | `[x]` — Avatar uses fallback |
| M0-T3 | `[ ]` | `[x]` — LtiPlataformasPage fixed |
| M0-T4 | `[ ]` | `[x]` — DenunciaDetail/SolicitarMentoria compile clean |
| M0-T5 | `[ ]` | `[~]` — web passes, API fails |
| M0-T6 | `[ ]` | `[ ]` — this task, still pending |
| M1-T1 through M1-T8 | `[ ]` | Per m1-VERIFICATION: T1-T5,T7-T8 done, T6 pending |
| M3-T2,T3 | `[ ]` | `[x]` (auth.oauth.ts with /google endpoint) |
| M3-T4,T5 | `[ ]` | `[x]` (otp.service.ts with generate/verify, auth.otp.ts routes) |
| M5-T7 | `[ ]` | `[x]` (SEOHead implemented per STATE.md M5 bullet) |
| M5-T9 | `[ ]` | `[x]` (93 lazy chunks per STATE.md M5 bullet) |
| M5-T10 | `[ ]` | `[x]` (manifest.json + sw.js exist per STATE.md) |
| M7-T1 | `[ ]` | `[x]` (Sentry in both web and API) |
| M7-T3 | `[ ]` | `[x]` (pino logger, zero console.log) |
| M7-T5 | `[ ]` | `[x]` (Instrument Serif per STATE.md) |
| Ondas 1-4 | `[~]` or `[ ]` | STATE.md says all Ondas 1-4 done `[x]` |

### REQ-NF-007 Updated Violations

Files exceeding 200 lines:

| File | Lines | Delta |
|------|-------|-------|
| `apps/web/src/pages/LandingPage.tsx` | 439 | +239 |
| `apps/api/src/routes/feed.ts` | 404 | +204 |
| `apps/api/src/routes/seo.ts` | 300 | +100 |
| `apps/api/src/routes/mensagens.ts` | 288 | +88 |
| `apps/api/src/routes/vinculos.ts` | 266 | +66 |
| `apps/api/src/routes/cursos.ts` | 233 | +33 |
| `apps/api/src/routes/simulacoes.ts` | 224 | +24 |
| `apps/api/src/routes/mentorias.ts` | 215 | +15 |
| `apps/api/src/routes/admin.ts` | 215 | +15 |
| `apps/api/src/routes/experiencias.ts` | 200 | (at limit) |

Previously listed `auth.ts` (134 lines) no longer violates.

---

## Gaps Summary

**2 blockers prevent M0 goal achievement:**

1. **API TypeScript compilation fails** — auth.service.ts has code improperly scoped (declarations inside object literal) and cursos.ts has a malformed route handler with placeholder comment. These are syntax errors, not type errors, so they're quick fixes.

2. **Planning documents do not reflect reality** — STATE.md, REQUIREMENTS.md, and roadmap.md collectively contain 30+ discrepancies. The most critical: REQ-2-001 falsely marked done (hardcoded colors remain), REQ-4-014 falsely marked not done (feed scoring exists), Fase 1 contradicts between STATE.md (complete) and roadmap.md (partial — OAuth ❌), and roadmap.md shows 25+ tasks as undone that are actually complete.

**Root causes:**
- auth.service.ts: likely a merge or edit that moved code outside the object literal
- cursos.ts: likely an interrupted refactoring that left placeholder comments
- Planning docs: organic drift as features were implemented across sessions without docs being updated consistently

---

_Verified: 2026-04-06T10:00:00Z_
_Verifier: Claude (gsd-verifier)_
