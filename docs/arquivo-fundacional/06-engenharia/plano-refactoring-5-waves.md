# Plano de Refactoring — 5 Waves + W0

> **Origem:** `traycer-epics/specs/` — 5 specs de análise e abordagem (Abril 2026)
>
> **Propósito:** Destilar as decisões arquitecturais e o plano de execução para restaurar a alma do PDC v2 + integrar melhorias aditivas da conversa de Abril 15-17.

---

## Contexto

A conversa de Abril 15-17 introduziu melhorias legítimas mas executou um REPLACE destrutivo sobre a documentação original. O plano de refactoring define como restaurar a alma v2 como base + adoptar 16 melhorias + reverter 15 cedências destrutivas.

**Risk level:** CORE / Alto, mitigado por faseamento em 5 Waves.

---

## Decisões Fechadas com o Utilizador (18 decisões)

| # | Decisão |
|---|---------|
| A1 | W0 explícita (pre-flight + docs + tests) antes de W1 |
| A2 | 16 melhorias + 15 reversões distribuídas por Wave técnica natural |
| A3 | `apps/edge` hardening PRIMEIRO em W1 (antes do seed narrativo) |
| A4 | i18n estrutura+Strapi W3 + EN W5+; a11y CI gate W0+endurece W3+polish W5 |
| B1 | BootstrapResponseSchema **layered** (`session`/`capabilities`/`security`/`ux`) |
| B2 | FeatureRegistry **híbrido** (estático no `@pdc/shared` + override Strapi runtime) |
| B3 | TelemetryToken **JWT JWS RS256** (mesma chave RSA do JWKS LTI 1.3) |
| C1 | `MensagensPage` **build-from-scratch** conforme spec v2 (W4) |
| C2 | Sanity validator em `packages/shared/src/sanity/` (regras puras, importadas por edge+BFF) |
| C3 | LTI Grade Passback **event-driven** (`tentativa.concluida` → handlers subscrevem) |
| C4 | Recriar AMBOS `roadmap.md` + `CONSTITUTION.md` v2.1 ratificada (W0) |
| C5 | `getReputacao()` muda para **endpoint separado** `/reputacao/me` 404-when-flag-off |
| C6 | `.planning_backup/` → `docs/_archive/planning-2026-04/` |
| D1 | **6 tickets atómicos** de testes em W0 (1 por área) |
| E1 | Pre-commit: lint + typecheck + test (--bail --changed); axe → CI gate |
| F1 | Sidebar.tsx — importar `Brain`+`Zap` (intent original) |
| G1 | Naming **híbrido**: tickets antigos M*/Onda* mantêm-se; novos `W{n}-T{n}` |

**Decisões adicionais (W2 Closure):**

| # | Decisão |
|---|---------|
| D1 | Outbox real com registry explícito de handlers; `processed=true` só após `Promise.allSettled` |
| D2 | Conquistas only-handler — remover chamada directa em `routes/telemetria.ts` |
| D3 | LTI handler faz fetch + cache (lê `perfil.lti_context`, cacheia token Redis TTL=exp-5min) |
| D8 | Contrato externo canónico = `/reputacao/*`; alias temporário `/reputation/*` |
| D9 | LTI sem contexto: tentativa não-LTI = skip estruturado; contexto inválido = erro reprocessável |

---

## Decomposição por Wave

### W0 — Foundation
- Pre-flight bugs (3 runtime): Mensagens router, Sidebar icons, log import
- Docs sync (4): CONSTITUTION v2.1, roadmap, archive `.planning_backup/`
- 6 specs de teste characterization (1 por área)
- Auditoria/fusão `specs/4e02dfe2-...` Auth Fix
- a11y CI gate (axe-core warn)
- **Critério:** Build verde, types verdes, 6 testes verdes, docs sem fantasmas, Branch Protection activa

### W1 — Estabilidade + Edge + Seed
- Hardening `apps/edge` (Telemetry Token JWS, dual-write, Upstash queue, deploy pipeline)
- GET /bootstrap layered + FeatureRegistry híbrido + frontend `bootstrap.ts`
- Edge dual-write + Upstash queue + BFF consumer (full ingestion pipeline)
- Seed narrativo (4 áreas vocacionais + 10 instituições + 30 mentores + 100 alunos)
- **Critério:** Edge worker em produção, telemetria a fluir edge→queue→consumer→behavior_patterns

### W2 — Heurísticas + Relatório + Tipo3
- Anti-cheat sanity validator + Heuristics Engine (φ/R/F/H em `@pdc/shared`)
- Event bus interno + Outbox pattern (Strapi domain events)
- LTI Grade Passback real (event-driven, não stub)
- Sim Tipo 2 score real (substituir hardcoded 8.5)
- Sim Tipo 3 player (criar `Tipo3Player.tsx` + telemetria nativa + scoring)
- GET `/reputacao/me` endpoint + `ReputacaoBreakdownSchema` + Relatório Vocacional Premium MVP
- **Critério:** Scores reais, Relatório com Bento Grid + dados reais, AGS dispara em cada conclusão

### W3 — Design System + i18n + a11y
- Token audit + purga hardcoded colors (27 ui components)
- Design primitives: Glassmorphism + BentoGrid + Padrões africanos 3%
- i18n setup + extracção PT mecânica + Strapi i18n.localized opt-in
- a11y endurece (axe gate ERROR + contrast AA/AAA + touch targets ≥44px + focus visible)
- Visual regression baseline + lint rules de design system
- **Critério:** Baseline visual, axe sem erros críticos, strings PT 100% extraídas

### W4 — Redesign de Páginas + Reversões UI
- MensagensPage build-from-scratch (inbox + busca + filtros role + realtime)
- Feed completo 4 fontes (Geral/Vocacional/Institucional/Trending) + Comments + moderação
- Dashboard Bento Grid + Top Bar Glass Header (Command+K) + Sidebar slim audit
- Reputação Bento role-aware + Hub de Oportunidades "Match Terminal"
- Empty States aspiracionais + Threaded Insights (anotações Tina laterais no Relatório)
- **Critério:** Todas as páginas amputadas restauradas, E2E Playwright passa

### W5 — Polish + Gamificação + EN + a11y final
- Micro-interações em ≥80% elementos clicáveis
- Gamificação profissional (Tier Bronze→Diamond + Talent Bounties + Streaks + notificações)
- EN como segunda língua activa (traduzir strings PT → EN + QA)
- Production polish (Lighthouse ≥90 mobile + a11y full audit + cleanup deprecated endpoints)
- **Critério:** Lighthouse ≥90 mobile, EN funcional, gamificação activa

---

## Princípio de Placement — Onde Vive Cada Peça Nova

| Artefacto | Localização |
|-----------|-------------|
| `FeatureRegistry` const + Schema | `packages/shared/src/registry/features.ts` |
| `SanityRule` types + `applyRules()` | `packages/shared/src/sanity/` |
| `TelemetryEventNameSchema` Zod enum | `packages/shared/src/telemetry-events.ts` |
| Heuristics formulas (φ/R/F/H) | `packages/shared/src/heuristics.ts` |
| `BootstrapResponseSchema` | `packages/shared/src/bootstrap.ts` |
| `ReputacaoBreakdown` schema | `packages/shared/src/reputation.ts` |
| Telemetry Token sign helper | `apps/api/src/modules/auth/telemetry-token.ts` |
| JWS verify middleware (edge) | `apps/edge/src/middleware/jws-verify.ts` |
| Event bus leve | `apps/api/src/modules/events/event-bus.ts` |
| LTI handler subscriber | `apps/api/src/modules/lti/lti.handler.ts` |
| i18n setup + ficheiros | `apps/web/src/i18n/{index.ts,locales/pt.json,en.json}` |
| Bootstrap fetch + state | `apps/web/src/lib/bootstrap.ts` |

---

## Migração Edge (W1) — Strangler Pattern

```
Fase A (estado actual):  Web → BFF → Strapi
Fase B (dual-write):     Web → Edge (preferred) + BFF (fallback) → Queue → Strapi
Fase C (steady state):   Web → Edge → Queue → BFF consumer → Strapi
```

**Rollback:** Cada Wave é git-revertable. Edge = código novo em `apps/edge/`, rollback = router DNS.

---

## Fonte dos Specs Originais (Traycer Epic)

| Spec ID | Título |
|---------|--------|
| `3e8a4789` | Refactoring Analysis — Restauração da Alma + Cherry-Pick (57KB, mapa completo) |
| `2856bafe` | Refactoring Approach — 5 Waves + W0 (32KB, decisões + placement) |
| `9e1df3cf` | Auditoria W0→W2 + Closure W2 T3-T6 (15KB, bugs críticos) |
| `fcd9896a` | Approach W0→W2 Audit + W2 Closure (35KB, implementação detalhada) |
| `ed419cbd` | Constelação Neural — Landing Hero (14KB, spec visual) |

---

*Destilado de 5 specs em `/fv/traycer-epics/specs/` · Abril 2026*
