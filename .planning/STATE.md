# PDC v2 — Project State

> Memória persistente do projecto entre sessões. Lê este ficheiro PRIMEIRO antes de qualquer trabalho. Actualiza após cada sessão de trabalho.

## Project Reference

Ver: `.planning/PROJECT.md` (actualizado: Abril 2026)

**Core value:** O estudante faz uma escolha de carreira baseada em evidência real do seu próprio comportamento — não em suposições.

**Current focus:** Pronto para lançamento — configurar Strapi v5 em produção, variáveis de ambiente e resolver dívida técnica de modularidade

## Current Status

```
Fase 0 — Fundação          [~] PARCIAL (Strapi v5 instalado, mas configuração de produção pendente)
Fase 1 — Auth Segura       [x] COMPLETA (JWT+RBAC ✅; OAuth+2FA ✅; Google ✅)
Fase 2 — Design System     [x] COMPLETA
Fase 3 — API Layer         [~] PARCIAL (Módulos frontend ✅; Rotas BFF violam limite de 200 linhas)
Fase 4 — Core do Produto   [~] PARCIAL (Sim Tipo 1+2, Cursos, Experiências, Projetos, Mentorias, Conquistas✅, Feed ranking✅, Programas✅; Sim Tipo 3 ❌)
Fase 5 — LTI 1.3           [x] COMPLETA
Fase 6 — Moderação/Admin   [x] COMPLETA
Fase 7 — IA e Realtime     [x] COMPLETA
```

**Repositório:** `pdc-v2/` — criado em Abril 2026
**Branch activa:** main
**Último commit:** (Auditoria Técnica — Estado sincronizado com realidade do código)

## O que foi feito

- [x] Fase 0 — Monorepo, tooling, CI/CD, Docker Compose
- [x] Fase 1 — Auth JWT (httpOnly cookies), RBAC, rate limiting, páginas de auth, Google Auth, OTP 2FA
- [x] Fase 2 — Design system (tokens Tailwind v4), 11 componentes ui/, AppLayout, Sidebar, 5 dashboards, LandingPage
- [x] Fase 3 — 7 módulos API frontend, 6 rotas BFF, strapi.client.ts, r2.service.ts
- [x] Fase 4A — Simulações Tipo 1 e 2, telemetria com idempotência Redis, perfil vocacional, relatório
- [x] Fase 4B — Cursos (list/detail/player), Experiências (list/detail), PerfilPage, LandingMentores (M5)
- [x] Fase 4C — Projetos (CRUD, 4 modos, ACL), Vínculos (pedido/aprovação/rejeição), Conquistas (listagem, badges)
- [x] Fase 4D — Feed e Algoritmo de Ranking (M2)
- [x] Fase 4E — M1 Interações: Likes, Bookmarks, Ratings, Comments (API ✅)
- [x] Fase 5 — LTI 1.3 Provider (OIDC, AGS, NRPS, JWKS, admin CRUD, frontend)
- [x] Fase 6 — Moderação (denúncias, painel admin, audit trail, CSP/CORS)
- [x] Fase 7 — IA e Realtime (DeepSeek streaming, RAG, quiz gen, Socket.IO, TutorChat, QuizPlayer)
- [x] Onda 1 — Sidebar sub-menus, Comité fix, Dashboards com dados reais
- [x] Onda 2A — Zona Mentor completa (8 páginas + 9 rotas)
- [x] Onda 2B — Zona Instituição completa (8 páginas + 8 rotas)
- [x] Onda 3A — Zona Estudante (MeusCursos, Certificados, Guardados, Ranking)
- [x] Onda 3B — Fluxo Editorial + Vínculos bilaterais + Mensagens só entre connected
- [x] Onda 4 — Admin completo (telemetria, relatórios, reativar) + Comité Científico
- [x] M5 — SEO (OG dinâmico, sitemap, robots, Vercel edge middleware, JSON-LD)
- [x] M5 — Performance (87KB bundle inicial, 93 lazy chunks, code splitting)
- [x] M5 — PWA (manifest, service worker, Sentry, pino)
- [x] M5 — Programas públicos (catálogo + detalhe + inscrição)
- [x] M5 — Projectos abertos a aluno/mentor/instituição
- [x] M7 — Qualidade (zero any, zero erros TS/lint, Instrument Serif, tokens CSS)
- [x] Refactor: `LandingPage.tsx` extraído em 9 componentes (`LandingNavbar`, `LandingHero`, `LandingProblema`, `LandingComoFunciona`, `LandingFeatures`, `LandingCTAFinal`, `LandingFooter`, `useFadeUp`) — 37 linhas finais
- [x] Conquistas auto-trigger: `conquistas.engine.ts` com 12 regras declar. + flag gate + idempotência
- [x] Feed ranking: `feed.scoring.ts` + `feed.weights.ts` integrados no `feed.ts`
- [x] Programas: `POST /programas/:id/inscricao` + `GET /programas/:id/participantes` adicionados
## Próximos passos

- [ ] Simulação Tipo 3: ambiente interativo com feedback AI inline (REQ-4-003) — próxima wave

## Decisions Log

| Data | Decisão | Racional | Quem |
| --- | --- | --- | --- |
| Abr 2026 | Monorepo com npm workspaces (sem Turborepo/Nx) | Overhead desnecessário para equipa pequena | Proprietário + Traycer |
| Abr 2026 | Hono em vez de Express para o BFF | 3x menos overhead; TypeScript nativo; edge-ready | Traycer |
| Abr 2026 | TailwindCSS v4 (não v3) | Novo motor CSS-first; melhor performance; tokens nativos | Traycer |
| Abr 2026 | Strapi v5 apenas como CMS (não como BFF) | Lógica de negócio no Hono; Strapi só gere conteúdo | Traycer |
| Abr 2026 | JWT em httpOnly cookies (nunca localStorage/sessionStorage) | Elimina vulnerabilidade crítica do projecto anterior | Traycer |
| Abr 2026 | Upstash Redis para rate limiting | Sem estado em memória; funciona com múltiplas instâncias | Traycer |
| Abr 2026 | Upload direto até 50MB; vídeos via YouTube/Vimeo embed | Custo controlado; R2 para assets; plataformas externas para vídeo | Proprietário |
| Abr 2026 | Domínio definido: usepdc.com | Frontend: Vercel; BFF: api.usepdc.com (Railway) | Confirmado |
| Abr 2026 | Gateway de pagamento fora do MVP | Fase comercial posterior; CTAs de contacto no MVP | Proprietário |
| Abr 2026 | Node.js 24 LTS | Versão LTS mais recente; já configurada no ambiente Fedora 43 | Traycer |
| Abr 2026 | DeepSeek como IA principal + Ollama como fallback | DeepSeek para produção; Ollama para dev local e fallback | Traycer |

## Blockers

*Nenhum blocker activo.*

| Data | Blocker | Estado | Resolução |
| --- | --- | --- | --- |
| — | — | — | — |

## Architecture Snapshot

```
pdc-v2/                          ← Monorepo raiz (npm workspaces)
├── .planning/                   ← GSD framework files
│   ├── PROJECT.md
│   ├── REQUIREMENTS.md
│   └── STATE.md
├── apps/
│   ├── web/                     ← React 18 + Vite + TailwindCSS v4
│   │   └── src/
│   │       ├── features/        ← Feature-first por domínio (14 features)
│   │       ├── components/      ← Design system unificado
│   │       ├── lib/api/         ← Módulos de API por domínio (max 200 linhas)
│   │       ├── lib/auth/        ← AuthContext (httpOnly cookies)
│   │       └── config/          ← Roles, permissões (6 roles)
│   └── api/                     ← Hono BFF
│       └── src/
│           ├── routes/          ← Rotas por domínio
│           ├── modules/
│           │   ├── auth/        ← JWT, refresh, OAuth, OTP
│           │   ├── lti/         ← LTI 1.3 Provider
│           │   ├── ai/          ← DeepSeek + LangChain.js
│           │   └── realtime/    ← Socket.IO
│           └── middleware/      ← Auth, rate limit, RBAC, logging
├── packages/
│   └── shared/                  ← Tipos TypeScript partilhados
├── infra/
│   └── strapi/                  ← Strapi v5 + PostgreSQL
├── .github/
│   └── workflows/
│       └── ci.yml               ← Build + lint em cada PR
└── package.json                 ← npm workspaces config
```

## Environment

| Item | Valor |
| --- | --- |
| OS | Fedora 43 |
| Node.js | 24 LTS (via nvm) — `.nvmrc`: 24.13.0 |
| npm | 11+ |
| Docker | Nativo (sem WSL2) |
| Filesystem | Btrfs (compressão automática de node_modules) |
| SELinux | Activo — volumes Docker precisam de flag `:Z` |
| Editor | VS Code / Cursor |
| Git remote | GitHub (SSH com Ed25519) |

## Key Files Reference

| Ficheiro | Propósito |
| --- | --- |
| `.planning/PROJECT.md` | Visão, stack, decisões, constraints |
| `.planning/REQUIREMENTS.md` | Requisitos com ID, fase e critério de verificação |
| `.planning/STATE.md` | Este ficheiro — memória persistente |
| `apps/web/package.json` | Dependências do frontend |
| `apps/api/package.json` | Dependências do BFF |
| `packages/shared/src/index.ts` | Tipos partilhados (User, Role, etc.) |
| `package.json` | Raiz do monorepo — workspaces config |
| `.github/workflows/ci.yml` | Pipeline CI/CD |
| `docker-compose.yml` | Dev local (Strapi + PostgreSQL + Redis) |

## Specs de Produto (Traycer Epic)

Todas as specs detalhadas do produto estão no Epic `332ffcdb-fa0f-41f5-bfff-9076e4bc1938`:

| Spec ID | Conteúdo |
| --- | --- |
| `d34f63b8` | Visão do Produto e Lógica de Funcionamento |
| `631b796e` | Arquitetura de Reconstrução |
| `868a324b` | Plano Mestre de Reconstrução |
| `c67e1ed4` | Mapa Completo de Páginas e Fluxos por Role |
| `ae07e114` | Features Transversais (Interações, Avaliações, Telemetria, Moderação) |
| `15428b59` | Algoritmo de Ranking e Feed |
| `ef76adef` | Regras de Segurança Base |
| `dc2a19a2` | Design System e Linguagem Visual |
| `36c60fa0` | Modelo de Dados Completo (Strapi v5) |
| `1a81656f` | Modelo de Telemetria e Perfil Vocacional |
| `26799a9d` | LTI 1.3 como Serviço Próprio |
| `01e25234` | Estratégia de IA, RAG e Tutor Vocacional |
| `6f5d9251` | SEO, Performance e Distribuição de Conteúdo |

## How to Resume Work

Quando retomares o trabalho após uma pausa:

1. Lê este ficheiro (`STATE.md`) — verifica `Current Status` e `Blockers`
2. Lê `PROJECT.md` — relembra constraints e decisões
3. Verifica o ticket activo no Traycer Epic `332ffcdb-fa0f-41f5-bfff-9076e4bc1938`
4. Continua a partir do ponto documentado em `Current focus`

**Regra de ouro:** Se não está documentado aqui, não aconteceu.
