# pdc-v2 Development Guidelines

Last updated: 2026-05-03

## Core Constraints (Constitution)

1. **Zero `any` / `z.any()`** — TypeScript strict typing mandatory. Replace all `any` with concrete or generic types.
2. **JWT in httpOnly Cookies** — Never use localStorage/sessionStorage for auth tokens. Use httpOnly, Secure, SameSite cookies.
3. **Zero Mocks, Hardcoded Data Only for Display** — No fictitious data in components. Components without real data show skeletons/loading states.

## Active Technologies

- TypeScript 5.x / Node.js 24 LTS (BFF) + React 18 + Vite 6 (frontend) + TailwindCSS v4 + Hono 4, Socket.IO 4, TanStack Query 5, motion/react, react-router-dom 6

## Project Structure

```
apps/api/src/          # Hono API server, routes, services, middleware
apps/web/src/          # React application, components, pages, hooks, features
packages/shared/       # Shared types, utilities, constants
infra/strapi/          # Strapi CMS configuration and types
tests/e2e/             # Playwright E2E test specifications
tests/helpers/         # Test utilities, database seeding, fixtures
tests/k6/              # K6 load testing scripts
```

## Code Standards

- **File Size Limit:** 300 lines maximum per file
- **Type Safety:** All function parameters and return types must be typed
- **No `any` Types:** Use generics, unions, or concrete types instead
- **Component Files:** One primary named export per file (`export function ComponentName()`)
- **Error Handling:** Explicit error types, structured error responses
- **Testing Requirements:** E2E tests for critical paths, unit tests for business logic

## Commands

```sh
npm test        # Run unit and E2E tests
npm run lint    # eslint with TypeScript support
npm run build   # Build production bundle
npm run dev     # Start development server
```

## Code Style

- Follow TypeScript strict mode conventions
- Use descriptive variable/function names
- Keep functions focused and single-purpose
- Prefer composition over inheritance
- Use const for immutability by default

## Key Architecture Decisions

- **Home ≠ Dashboard**: `/app/home` is the generic hub, `/app/dashboard/:role` is the analytics panel per role.
- **RBAC on Routes**: All dashboard routes use `RoleGuard` enforcing role + super_admin access.
- **G15 Ecosystem**: Every domain write dispatches via `eventBus.publishWithOutbox` (6 hooks: Ranking, Feed, Match, Achievement, Behavior, Notify).
- **Roles**: 7 canónicos em `@pdc/shared` — estudante, mentor, instituicao, moderador, comite_cientifico, super_admin, patrocinador.

<!-- MANUAL ADDITIONS START -->

## Visual Design Patterns (2026-05-03) — See `apps/web/DESIGN.md § 10`

### Glow Policy (ADR-026)
- ❌ `ctx.shadowBlur = currentSize * N` — banned (produces excessive halos)
- ✅ Max fixed: `ctx.shadowBlur = 2` — only for accent stars in `src/features/landing/NeuralConstellation.tsx`
- ✅ Default everywhere else: `ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'`

### `--card-border` Token (ADR-026)
- ❌ `borderColor: '#000000'` hardcoded — invisible in dark mode
- ✅ Always use `style={{ borderColor: 'var(--card-border)' }}`
- Defined in `apps/web/src/styles/tokens.css`: `#000000` (light) / `rgba(236,231,221,0.7)` (dark)

### NeuralConstellation Dual (ADR-025)
- `src/features/landing/NeuralConstellation.tsx` — landing only, `ChoreographyState`, theme-aware
- `src/components/auth/NeuralConstellation.tsx` — auth only, `NeuralState`, black background fixed
- ❌ Never merge or cross-import between the two

### Auth `neuralState` Pattern
- Form fields fire `NeuralState` via `onFocus`/`onBlur`
- Canonical mapping: name→`pulse`, email/NIF→`align`, password→`encrypt`, confirm→`focus`, select→`flow`, error→`scatter`

### `PasswordInput` Component
- ❌ Never use raw `<input type="password">` in auth pages
- ✅ Import `PasswordInput` from `@/components/ui/PasswordInput`

### Copy Rules
- ❌ "Oráculo" in user-visible copy → use "PDC" or "sistema"
- ❌ Emojis in product badges/pills → text only, uppercase, `tracking-wider`

<!-- MANUAL ADDITIONS END -->
