# Arquitectura do PDC v2

## Visão Geral

O PDC v2 é um monorepo npm workspaces com três pacotes principais:

```
pdc-v2/
├── apps/
│   ├── web/          # React 18 + Vite (frontend)
│   └── api/          # Hono BFF (backend-for-frontend)
├── packages/
│   └── shared/       # Tipos Zod partilhados
└── infra/
    └── strapi/       # Strapi v5 CMS (conteúdo + persistência)
```

---

## Diagrama do Monorepo

```mermaid
graph TD
    subgraph Monorepo["pdc-v2 (npm workspaces)"]
        WEB["apps/web<br/>React 18 · Vite · TailwindCSS v4<br/>React Query v5 · React Router v6"]
        API["apps/api<br/>Hono v4 · Node.js 24<br/>JWT httpOnly cookies"]
        SHARED["packages/shared<br/>Zod schemas · TypeScript types"]
        STRAPI["infra/strapi<br/>Strapi v5 · PostgreSQL"]
    end

    WEB -->|"HTTP + cookies<br/>(VITE_API_URL)"| API
    API -->|"REST + Bearer token<br/>(STRAPI_API_TOKEN)"| STRAPI
    WEB -.->|"tipos partilhados"| SHARED
    API -.->|"tipos partilhados"| SHARED
    STRAPI -->|"PostgreSQL"| DB[(PostgreSQL)]
```

---

## Fluxo de Dados

```mermaid
sequenceDiagram
    participant U as Utilizador (Browser)
    participant W as apps/web (React)
    participant B as apps/api (Hono BFF)
    participant S as Strapi v5
    participant DB as PostgreSQL

    U->>W: Navega para /app/cursos
    W->>B: GET /cursos?page=1 (cookie httpOnly)
    B->>B: verifyJwt() — valida JWT do cookie
    B->>S: GET /api/cursos (Bearer STRAPI_API_TOKEN)
    S->>DB: SELECT cursos …
    DB-->>S: rows[]
    S-->>B: { data: [...], meta: { pagination } }
    B-->>W: { data: [...], pagination: {...} }
    W-->>U: Renderiza lista de cursos
```

---

## Camadas de Segurança

```
Browser
  └── HTTPS (TLS 1.3)
       └── Hono BFF
            ├── securityMiddleware (headers defensivos)
            ├── cors() — Origin restrita a FRONTEND_URL
            ├── secureHeaders() — CSP, HSTS, etc.
            ├── verifyJwt — jose · HS256
            ├── checkRole — RBAC 6 níveis
            └── auditLog — regista acções sensíveis
                 └── Strapi /api/audit-logs
```

---

## Módulos do BFF (`apps/api/src/`)

| Directório | Responsabilidade |
|-----------|-----------------|
| `routes/` | Handlers HTTP por domínio (≤200 linhas cada) |
| `modules/auth/` | JWT, RBAC, middleware de autenticação |
| `modules/strapi/` | Cliente tipado para Strapi v5 |
| `modules/ai/` | Integração DeepSeek (Fase 7) |
| `modules/lti/` | LTI 1.3 Provider (Fase 5) |
| `modules/realtime/` | WebSocket (Fase 7) |
| `middleware/` | `security.ts`, `audit.ts`, `rateLimit.ts` |

---

## Stack de Tecnologia

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Frontend framework | React | 18 |
| Frontend build | Vite | 6 |
| CSS | TailwindCSS | 4 (CSS-first) |
| Estado servidor | TanStack Query | 5 |
| Roteamento | React Router | 6 |
| BFF framework | Hono | 4 |
| Runtime | Node.js | 24 LTS |
| Validação | Zod | 3 |
| CMS / Persistência | Strapi | 5 |
| Base de dados | PostgreSQL | 16 |
| Armazenamento ficheiros | Cloudflare R2 | — |
| Autenticação | JWT (httpOnly cookies) | jose |
| Deploy frontend | Vercel | — |
| Deploy BFF + Strapi | Railway | — |
