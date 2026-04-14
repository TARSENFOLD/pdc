# PDC v2 Constitution

## Core Principles

### I. Zero `any` / `z.any()`
TypeScript strict typing non-negotiable. Every use of `any` must be replaced with a concrete type or generic type. This ensures type safety and prevents runtime errors. Zod schemas must use specific types instead of `z.any()`.

### II. JWT in httpOnly Cookies
Authentication tokens must never be stored in localStorage or sessionStorage. All JWT tokens must be stored in httpOnly, Secure, SameSite cookies to prevent XSS attacks and token theft.

### III. Zero Mocks, Hardcoded Data Only for Display
No fictitious hardcoded data in components. Components without real data must not render content—they display skeletons or loading states instead. Data-driven rendering only.

## Technology Stack

- **API:** Hono 4 (BFF) with Node.js 24 LTS
- **Frontend:** React 18 + Vite 5 + Tailwind v4
- **State Management:** TanStack Query 5, Socket.IO 4
- **Routing:** react-router-dom 6
- **Animation:** motion/react
- **CMS:** Strapi
- **Database:** PostgreSQL + Redis
- **Language:** TypeScript 5.x

## Monorepo Structure

```
apps/api/src/          # Hono API endpoints, services, middleware
apps/web/src/          # React components, pages, hooks, features
packages/shared/       # Shared types, utilities, constants
infra/strapi/          # Strapi configuration and types
tests/e2e/             # Playwright E2E tests
tests/helpers/         # Test utilities and seed data
tests/k6/              # K6 load testing scripts
```

## Code Standards

- **File Limit:** 300 lines maximum per file (TypeScript/TSX)
- **Type Annotations:** Mandatory for all function parameters and returns
- **No `any` Types:** Use generics, unions, or concrete types
- **Component Structure:** One primary export per file
- **Error Handling:** Explicit error types, no silent failures
- **Testing:** E2E critical paths, unit tests for business logic

## Governance

Constitution supersedes all other development practices. All PRs must verify compliance with these three core principles. Exceptions require explicit documentation and approval.

**Version:** 2.0.0 | **Ratified:** 2026-04-09 | **Last Amended:** 2026-04-09
