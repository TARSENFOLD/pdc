---
id: "c4b09e93-7797-4c94-9cbd-d47ff7c1ecba"
title: "GSD — .planning/STATE.md"
createdAt: "2026-04-03T17:22:13.465Z"
updatedAt: "2026-04-03T17:22:48.663Z"
type: spec
---

# GSD — .planning/STATE.md

# PDC v2 — Project State

<user_quoted_section>Memória persistente do projecto entre sessões. Lê este ficheiro PRIMEIRO antes de qualquer trabalho. Actualiza após cada sessão de trabalho.</user_quoted_section>

## Project Reference

Ver: `.planning/PROJECT.md` (actualizado: Abril 2026)

**Core value:** O estudante faz uma escolha de carreira baseada em evidência real do seu próprio comportamento — não em suposições.

**Current focus:** Fase 0 — Fundação (monorepo, tooling, CI/CD)

## Current Status

```
Fase 0 — Fundação          [ ] NÃO INICIADA
Fase 1 — Auth Segura       [ ] NÃO INICIADA
Fase 2 — Design System     [ ] NÃO INICIADA
Fase 3 — API Layer         [ ] NÃO INICIADA
Fase 4 — Core do Produto   [ ] NÃO INICIADA
Fase 5 — LTI 1.3           [ ] NÃO INICIADA
Fase 6 — Moderação/Admin   [ ] NÃO INICIADA
Fase 7 — IA e Realtime     [ ] NÃO INICIADA
```

**Repositório:** `pdc-v2/` — ainda não criado
**Branch activa:** `main` (a criar)
**Último commit:** — (repositório vazio)

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
| Abr 2026 | Domínio de produção não definido | Usar `[dominio-pdc]` como placeholder | Proprietário |
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
│   │       ├── features/        ← Feature-first por domínio
│   │       ├── components/      ← Design system unificado
│   │       ├── lib/api/         ← Módulos de API por domínio (max 200 linhas)
│   │       ├── lib/auth/        ← AuthContext (httpOnly cookies)
│   │       └── config/          ← Roles, permissões
│   └── api/                     ← Hono BFF
│       └── src/
│           ├── routes/          ← Rotas por domínio
│           ├── modules/
│           │   ├── auth/        ← JWT, refresh, OAuth, OTP
│           │   ├── lti/         ← LTI 1.3 Provider
│           │   ├── ai/          ← DeepSeek + LangChain.js
│           │   └── realtime/    ← Socket.IO
│           └── middleware/      ← Auth, rate limit, RBAC, logging
├── infra/
│   └── strapi/                  ← Strapi v5 + PostgreSQL
└── package.json                 ← npm workspaces config
```

## Environment

| Item | Valor |
| --- | --- |
| OS | Fedora 43 |
| Node.js | 24 LTS (via nvm) |
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
| `infra/strapi/package.json` | Dependências do CMS |
| `package.json` | Raiz do monorepo — workspaces config |
| `.github/workflows/ci.yml` | Pipeline CI/CD |
| `docker-compose.yml` | Dev local (Strapi + PostgreSQL + Redis) |

## Specs de Produto (Traycer Epic)

Todas as specs detalhadas do produto estão no Epic `332ffcdb-fa0f-41f5-bfff-9076e4bc1938`:

| Spec | Conteúdo |
| --- | --- |
| Visão do Produto | O que o PDC é, utilizadores, tipos de conteúdo, modelo de negócio |
| Arquitetura de Reconstrução | Diagrama, estrutura de pastas, regras de desenvolvimento |
| Plano Mestre | Stack completo, fases, definition of done |
| Mapa de Páginas e Fluxos | Todas as páginas por role, fluxos de navegação |
| Features Transversais | Likes, avaliações, comentários, denúncias, vínculos, conquistas |
| Algoritmo de Ranking e Feed | Sinais, pesos, candidatos, filtragem |
| Regras de Segurança Base | Rate limiting, mass assignment, uploads, race conditions |
| Design System | Stack visual, tokens, componentes, wireframes |
| Modelo de Dados (Strapi v5) | Todos os content-types, relações, índices únicos |
| Telemetria e Perfil Vocacional | Schema de eventos, cálculo do perfil |
| LTI 1.3 como Serviço Próprio | Fluxo OIDC, AGS, NRPS |
| Estratégia de IA e RAG | DeepSeek, LangChain.js, tutor, quizzes |
| SEO e Performance | Meta tags, Open Graph, sitemap, performance |

## How to Resume Work

Quando retomares o trabalho após uma pausa:

1. Lê este ficheiro (`STATE.md`) — verifica `Current Status` e `Blockers`
2. Lê `PROJECT.md` — relembra constraints e decisões
3. Verifica o ticket activo no Traycer Epic `332ffcdb-fa0f-41f5-bfff-9076e4bc1938`
4. Continua a partir do ponto documentado em `Current focus`

**Regra de ouro:** Se não está documentado aqui, não aconteceu.

*Last updated: Abril 2026 — setup inicial GSD*
*Next update: Após conclusão da Fase 0*
