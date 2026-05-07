# PDC v2 Constitution

## Core Principles

### I. Zero `any` / `z.any()`
TypeScript strict typing non-negotiable. Zero `as any` / `: any` em todo o monorepo (verificado por grep 2026-04-29). Zod schemas usam tipos específicos. `EditorialStateBadge` usa `state: string` (type looseness a corrigir — T-REM-6).

### II. JWT in httpOnly Cookies
Authentication tokens must never be stored in localStorage or sessionStorage. All JWT tokens must be stored in httpOnly, Secure, SameSite cookies to prevent XSS attacks and token theft.

### III. Zero Mocks, Hardcoded Data Only for Display
No fictitious hardcoded data in components. Components without real data must not render content—they display skeletons or loading states instead. Data-driven rendering only. **Excepção auditada:** `EcosystemImpactPanel` mostra `"..."` placeholder (`void eventId`) — T-REM-2 pendente.

### IV. Doc is Law
Se o código contradiz o markdown, o código é defeituoso. O documento justifica o código, nunca o inverso. Fonte de verdade: `specs/IMPORTANTE/01-05`.

### V. Rule of 300
Nenhum ficheiro fonte > 300 linhas. Excepção histórica: `packages/shared/src/index.ts`.

### VI. Telemetria Resiliente Edge-First
A perda de dados comportamentais é inaceitável. Outbox + idempotência são obrigatórios. Score φ (Fluidez) e R (Resiliência) são calculados no servidor — nunca no cliente.

### VII. Soul & Elite Design System
UI premium com tokens canónicos (`tokens.css`), terracota africano subliminar, touch targets ≥ 44px, Spring `(220, 28)`, 3 famílias de border-radius. Anti-patterns: `bg-white`, `text-black`, `#3B82F6`.

## Technology Stack

- **API:** Hono ^4.12 (BFF) with `@hono/node-server` + Node.js
- **Frontend:** React ^18.3 + Vite ^6.0 + Tailwind CSS ^4.0
- **Forms:** react-hook-form ^7.72 + `@hookform/resolvers` + Zod ^3.23
- **State Management:** TanStack Query ^5.56, Socket.IO ^4.8 (client + server)
- **Routing:** react-router-dom ^6.26
- **Animation:** motion/react ^11.11 + GSAP ^3.15
- **UI Components:** Radix UI primitives (Dialog, Tabs, Select, Accordion, etc.)
- **Monitoring:** Sentry ^10.47 (browser + node + profiling, tracesSampleRate 0.1 prod)
- **i18n:** react-i18next (PT base, EN parcial)
- **CMS:** Strapi (PostgreSQL backend)
- **Database:** PostgreSQL + Redis (Upstash REST, com mock soberano se ausente)
- **Auth:** JWT httpOnly + OAuth 2.0 (Google, LinkedIn) via `auth.oauth.ts`
- **AI/Tina:** DeepSeek (default) / OpenAI / Ollama — Oráculo Interpretativo com RAG, guardrails e rate-limit por user
- **SMS:** Twilio (optional)
- **Realtime:** Socket.IO ^4.8 (server em `modules/realtime/`, client em web)
- **LTI:** Integração LMS via `modules/lti/`
- **Push:** Notificações push via `modules/push/`
- **Edge:** Cloudflare Workers (`apps/edge/`) — Hono ^4.12 sobre Workers runtime, ingestão de telemetria Edge-First (ADR-005)
- **Storage:** Cloudflare R2 (`r2.service.ts`) — presigned URLs via `@aws-sdk/client-s3`, bucket `pdc-sovereign-bucket`
- **CDN/DNS:** Cloudflare — `edge.usepdc.com` (prod), `edge-staging.usepdc.com` (staging)
- **Email:** Resend ^6.12
- **Language:** TypeScript ^5.5
- **Testing:** Vitest ^4.1 + Playwright + axe-core ^4.11 (a11y)
- **Deploy tooling:** Wrangler ^3.0 (edge), Vite ^6.0 (web)

## Monorepo Structure

```
apps/api/src/              # Hono BFF: routes, services, middleware, outbox, r2.service
  modules/ai/              #   AI provider abstraction (DeepSeek/OpenAI/Ollama)
  modules/analysis/        #   Análise de dados
  modules/auth/            #   JWT, telemetry-token, OTP
  modules/conquistas/      #   Conquistas (achievements) engine
  modules/cursos/          #   Lógica de negócio cursos
  modules/events/          #   Event bus + outbox-replay (Sovereign Replay)
  modules/feature-flags/   #   Feature flags com Redis cache + institution overrides
  modules/feed/            #   Feed de mérito
  modules/hooks/           #   6 ecosystem hooks (Ranking, Feed, Match, Achievement, Behavior, Notify)
  modules/landing/         #   Stats landing page
  modules/lti/             #   LTI integration (LMS)
  modules/mail/            #   Resend + SendGrid dual provider
  modules/media/           #   R2 upload (presigned URLs)
  modules/outbox/          #   Outbox worker daemon (distributed lock via Redis)
  modules/perfil/          #   Perfil CRUD
  modules/push/            #   Push notifications
  modules/realtime/        #   Socket.IO server
  modules/reputation/      #   Reputation scoring
  modules/strapi/          #   Strapi client (strapiGet/Put/Post/Delete)
  modules/telemetria/      #   Consumer (Redis queue → Strapi + heuristics)
  modules/tina/            #   Tina AI: service, guardrails, knowledge, ratelimit
  modules/vocacional/      #   Motor vocacional (Oráculo determinístico)

apps/web/src/              # React: components, pages, hooks, features, styles
apps/web/src/styles/       # tokens.css (Soul & Elite), index.css (@theme mapping)
apps/edge/                 # Cloudflare Worker: telemetria Edge-First (wrangler.toml, Hono)
packages/shared/           # Shared Zod schemas, types, heuristics, constants
infra/strapi/              # Strapi CMS configuration and content-types
specs/IMPORTANTE/          # Constituição canónica (01-05) — SSOT
docs/audit/                # 8 wave-specs + MASTER audit report
docs/decisoes/             # ADRs (adr-005-edge-telemetry, etc.)
tests/e2e/                 # Playwright E2E tests (a11y, dashboard, refactor-baseline)
tests/helpers/             # Test utilities, fixtures, seed data
tests/k6/                  # K6 load testing scripts
.specify/memory/           # Este ficheiro (constitution agent memory)
```

## Background Workers

| Worker | Ficheiro | Função |
|--------|----------|--------|
| **Outbox Worker** | `modules/outbox/outbox-worker.ts` | Daemon com distributed lock Redis (TTL 90s, ciclo 60s). Replay de domain-events não processados com exponential backoff. |
| **Telemetry Consumer** | `modules/telemetria/consumer.ts` | RPOPLPUSH atómico de Redis queue → validação L2 (sanity/fraude) → persist Strapi → heurísticas. Eventos inválidos vão para Cold Storage. |
| **Edge Ingestor** | `apps/edge/src/index.ts` | Cloudflare Worker: recebe telemetria L1, valida, enfileira em Redis. Separado do BFF para latência mínima. |

## BFF Route Domains (54 route files)

`admin`, `ai`, `auth` (register, OTP, OAuth Google/LinkedIn), `bootstrap`, `catalogo` (explorar, pessoas), `comite`, `comments`, `conquistas`, `cursos`, `dashboard/` (estudante, index), `denuncias`, `discussions`, `domain-events`, `estudante`, `experiencias`, `feature-flags`, `feed` (posts, helpers), `health`, `home`, `interactions`, `landing`, `lti`, `match`, `media`, `mensagens`, `mentorias`, `moderacao`, `notificacoes`, `perfis`, `programas`, `projetos`, `propostas`, `ratings`, `reputation`, `seo`, `simulacoes`, `telemetria`, `tina`, `vocacional`

## Web Feature Modules (24 directories)

`admin`, `ai`, `auth`, `catalogo`, `comite`, `conquistas`, `cursos`, `discussions`, `estudante`, `experiencias`, `feed`, `home`, `instituicao`, `landing`, `mensagens`, `mentor`, `mentorias`, `moderacao`, `perfil`, `projetos`, `reputacao`, `simulacoes`, `tina`, `vinculos`

## Code Standards

- **File Limit:** 300 lines maximum per file (TypeScript/TSX)
- **Type Annotations:** Mandatory for all function parameters and returns
- **No `any` Types:** Use generics, unions, or concrete types — zero `any` confirmado
- **Component Structure:** One primary export per file
- **Error Handling:** Explicit error types, no silent failures
- **Testing:** E2E critical paths, unit tests for business logic
- **Tokens:** Usar `var(--*)` de `tokens.css` — nunca cores hardcoded nos componentes app
- **RBAC:** Backend-enforced via `checkRole()` middleware — frontend é UX, não autoridade
- **Logging:** Pino structured logs — nunca `console.log` em código de produção

## Audit Status (2026-04-29)

**Saúde global: 66% Done/Done-Plus · 32% Partial · 3% Missing**

| Métrica | Valor |
|---------|-------|
| Tickets auditados | 38 (8 waves) |
| Done + Done-Plus | 25 (66%) |
| Partial (STUBs funcionais) | 12 (32%) |
| Missing (⌘K search dinâmico) | 1 (3%) |
| Vision-Failure | 0 |
| STUBs FIXME pendentes | 8 componentes |
| Dívida técnica registada | D1-D12 em IMPORTANTE/02 §11 |

**Relatório completo:** `docs/audit/MASTER--audit-report.md`
**Epic de remediação:** T-REM-1..6 (6 tickets, 17 ficheiros alvo)

## Governance

Constitution supersedes all other development practices. All PRs must verify compliance with these core principles. Exceptions require explicit documentation and approval (ADR formal).

**Hierarquia SSOT:** specs/IMPORTANTE > .planning/CONSTITUTION.md > AGENTS.md > Código

**Version:** 2.3.0 | **Ratified:** 2026-04-09 | **Last Amended:** 2026-04-29
