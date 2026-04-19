# pdc-v2 Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-04-09

## Core Constraints (Constitution)

1. **Zero `any` / `z.any()`** — TypeScript strict typing mandatory. Replace all `any` with concrete or generic types.
2. **JWT in httpOnly Cookies** — Never use localStorage/sessionStorage for auth tokens. Use httpOnly, Secure, SameSite cookies.
3. **Zero Mocks, Hardcoded Data Only for Display** — No fictitious data in components. Components without real data show skeletons/loading states.

## Active Technologies

- TypeScript 5.x / Node.js 24 LTS (BFF) + React 18 + Vite 5 (frontend) + Hono 4, Socket.IO 4, TanStack Query 5, motion/react, react-router-dom 6 (002-micro-desafio-live-data)

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
- **Component Files:** One primary export per file (default export)
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

## Recent Changes

- 002-micro-desafio-live-data: Added TypeScript 5.x / Node.js 24 LTS (BFF) + React 18 + Vite 5 (frontend) + Hono 4, Socket.IO 4, TanStack Query 5, motion/react, react-router-dom 6

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
