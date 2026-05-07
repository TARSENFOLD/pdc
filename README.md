# Por Dentro do Curso (PDC v2) — Front Door Canónico

> **"Doc is Law"** — Esta é a única fonte de verdade para a visão e estado do projeto.

**Plataforma visual, Mobile-First (PWA + Apps nativas via Capacitor/TWA). Toque mínimo 44px. Performance Lighthouse ≥90 mobile.**

---

## 🏛️ Hierarquia de Autoridade (Governação)

Se encontrar informações contraditórias, a ordem de precedência é:
1. **Epics Canónicas ([spec:IMPORTANTE/01–05](specs/IMPORTANTE/))** — A Constituição Soberana.
2. **[Constituição](.planning/CONSTITUTION.md)** — Leis inegociáveis de engenharia.
3. **[Manual de Prosperidade](.planning/PROSPERITY.md)** — Governação de integridade técnica e documental.
4. **Diretoria `.planning/`** — Estado real, requisitos e roadmap atualizado.
5. **Diretoria `docs/decisoes/`** — Registos de Arquitetura (ADRs).
6. **Diretoria `docs/`** — Guias e manuais secundários.

---

## 📱 Princípios Canónicos (UX/UI)

- **Mobile-First / PWA-First**: O utilizador principal está no telemóvel (spec:IMPORTANTE/05 §2).
- **Toque Mínimo 44px**: Todos os elementos interactivos respeitam o padrão Apple/Android.
- **Performance Crítica**: Lighthouse Score ≥ 90 em Mobile.
- **Hierarquia Visual**: 4 camadas (L1-L4) com processamento na Edge (L1) para latência zero (spec:IMPORTANTE/01 §5).

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| **Frontend** | React 18, Vite 6, TailwindCSS v4, **Motion v11+**, Radix UI, Lucide |
| **Edge (L1)** | **Cloudflare Workers**, Wrangler, Hono |
| **BFF (L2/L3)** | Node.js 24 LTS, Hono, **Jose**, Socket.IO (Realtime) |
| **Persistência** | PostgreSQL 16, **Upstash Redis**, **Cloudflare R2** (S3) |
| **CMS** | Strapi v5 (Headless) |
| **IA & Outros** | **DeepSeek** (RAG), **Sentry**, **Resend** (Email), Zod |
| **Testes** | Playwright (E2E), Vitest (Unit), k6 (Performance) |

---

## 📂 Estrutura do Monorepo

```bash
pdc-v2/
├── apps/
│   ├── web/        # Frontend React (PWA / Mobile-First)
│   ├── api/        # BFF (Business Logic & Orchestration)
│   └── edge/       # Ingestão de Telemetria (Wrangler/Cloudflare Workers)
├── packages/
│   └── shared/     # Motores de Heurísticas, Esquemas e Tipos SSOT
├── infra/
│   └── strapi/     # CMS de Autoridade e Gestão de Conteúdos
├── .planning/      # Roadmap, Estado Operacional e Requisitos (A Lei)
├── specs/          # Especificações Técnicas e Epics
└── tests/          # Suítes de testes cross-app (E2E & Load k6)
```

---

## 🌊 Roadmap: Waves de Evolução

O projeto é executado em **Waves** (spec:IMPORTANTE/02 §10), não em fases lineares.

| Wave | Foco | Estado |
|------|------|--------|
| **W0** | Fundação & Estabilidade | ✅ Concluído |
| **W1** | Autenticação & Pipeline Soberano | ✅ Concluído |
| **W2** | Motor Vocacional & LTI | ✅ Concluído |
| **W3** | Design System de Autoridade | ✅ Concluído (Tokens + Primitivos + Bento Grid) |
| **W4** | Dashboards & Home | 🚧 Em Progresso (7 dashboards + RBAC ✅, BFF parcial) |
| **W5** | Gamificação & Produção | ⏳ Planeado |
| **W6** | Mobile Nativo (Capacitor/TWA) | ⏳ Planeado |

> Ver [`.planning/STATE.md`](.planning/STATE.md) para o estado operacional detalhado minuto-a-minuto.

---

## 🚀 Guia de Início Rápido

### 1. Preparação
```bash
nvm use          # Garante Node.js >=24.0.0
npm install      # Instala dependências de todo o monorepo
```

### 2. Desenvolvimento Local
```bash
# Terminal 1: Infraestrutura (DB, Redis, CMS)
docker compose up -d

# Terminal 2: Monorepo (Frontend, BFF, Edge)
npm run dev
```

### 3. Processamento de Fundo
```bash
# Iniciar consumidor de telemetria
npm run start:consumer -w apps/api

# Reprocessar eventos pendentes (Outbox Pattern)
npm run replay-outbox -w apps/api
```

### 4. Qualidade e Testes (Playwright & k6) <a id="playwright-e2e-section"></a>
```bash
npm run typecheck       # Verificação de tipos global
npm run lint            # Linting de autoridade
npm run test:e2e:smoke  # Testes de fumo Playwright (Suite "Bravura", o path feliz principal)
npm run test:load:auth  # k6: Fluxo de Auth (tests/k6/auth-flow.js)
npm run test:load:edge  # k6: Ingestão de Telemetria (tests/k6/edge-load.js)
# Ver tests/k6/README.md para catálogo completo de testes de stress/spike.
```

---

## 📜 Licença e Contribuição

Este é um projeto **World-Class**. Antes de submeter qualquer PR:
1. Verifique se o `typecheck` está verde.
2. Garanta que o impacto em Mobile foi testado (44px min).
3. Leia o [`CONTRIBUTING.md`](CONTRIBUTING.md).

---
*PDC v2 — Transformando o futuro da educação em Angola.*
