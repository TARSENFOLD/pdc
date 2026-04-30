Este roadmap define a trajectória de execução técnica do PDC v2, organizada em waves temáticas.

## 📱 Mobile-First (Faixa Transversal)
> **Checklist Obrigatória para o Fecho de Qualquer Wave:**
> - [ ] Touch targets ≥ 44px (auditado via axe-core)
> - [ ] Viewport meta tag correcta (`width=device-width, initial-scale=1, viewport-fit=cover`)
> - [ ] Safe-area-inset padding para notches (iOS/Android)
> - [ ] Performance Lighthouse Mobile ≥ 90
> - [ ] Offline-ready (PWA Manifest + Service Worker funcional)

## Taxonomia (G1)

O projecto usa waves de **implementação** (W0-T* legacy, W1-T*) e waves de **auditoria** (W-1..W6). Identificadores legacy são preservados para rastreabilidade.

---

## Parte I — Waves de Implementação (Concluídas)

### Wave 0: Fundação & Estabilidade ✅
*Foco: Sanear o monorepo e congelar comportamento actual via characterization tests.*

| ID | Task | Status |
|----|------|--------|
| W0-T1 | Pre-flight runtime bugs (Mensagens router + Sidebar icons + log import) | ✅ |
| W0-T2 | Documentation governance reset | ✅ |
| W0-T3..T8 | Characterization tests (useTelemetry, heuristics, vocacional, reputation, conquistas, lti) | ✅ |
| W0-T9 | CI/Tooling foundation (axe-core + pre-commit + Strapi ESLint) | ✅ |

### Wave 1: Autenticação & Pipeline Soberano ✅

| ID | Task | Status |
|----|------|--------|
| W1-T1 | apps/edge worker hardening (wrangler + nodejs compat + secrets) | ✅ |
| W1-T2 | TelemetryToken JWS RS256 (BFF signer + edge verifier) | ✅ |
| W1-T3 | GET /bootstrap layered + FeatureRegistry | ✅ |
| W1-T4 | Edge dual-write + Upstash queue + BFF consumer | ✅ |
| W1-T5 | Seed narrativo (4 áreas + 10 inst. + 30 mentores + 100 alunos) | ✅ |

### Wave 2.5: Sync Constitucional (Backlog)

| ID | Task | Status |
|----|------|--------|
| W2.5-E1 | Migração F10 (15 áreas vocacionais + slug 'estudante') | ⏳ |
| W2.5-E2 | Edge Worker Hardening (Idempotência + Bugfixes) | ⏳ |
| W2.5-E3 | Schemas Canónicos Programa + Projeto | ⏳ |
| W2.5-E4 | Wave 2 Debt Closeout (D1 Consolidação + OTP + Tina) | ⏳ |
| W2.5-E5 | Migração Frontend Vercel → Cloudflare Pages | ⏳ |

---

## Parte II — Waves de Auditoria (Concluídas 2026-04-29)

> 38 tickets auditados estaticamente. Resultado: 25 Done/Done+ · 12 Partial · 1 Missing.
> Relatório: `docs/audit/MASTER--audit-report.md`

| Wave | Nome | Tickets | Done+ | Partial | Missing |
|------|------|---------|-------|---------|---------|
| W-1 | Stabilization Invariants | 5 | 4 | 1 | 0 |
| W0 | Bootstrap & Foundation | 3 | 1 | 2 | 0 |
| W1 | TopBar + ⌘K skeleton | 2 | 2 | 0 | 0 |
| W2 | Dashboards + token purge | 5 | 2 | 3 | 0 |
| W3 | Strapi + BFF Full-Spec | 7 | 6 | 1 | 0 |
| W4 | Builder Primitives | 8 | 6 | 2 | 0 |
| W5 | Pipeline Editorial + Impact | 3 | 2 | 1 | 0 |
| W6 | Catálogos + a11y | 5 | 2 | 2 | 1 |

---

## Parte III — Remediação Post-Audit (Fase D — ACTUAL ⏳)

> Epic: `d4e7f2a3-8b1c-4d6e-9f3a-2b5c8d1e4f7a`

```
Bloco 1 (Crítico):     T-REM-1 → T-REM-2   PostComposer → EcosystemImpactPanel
Bloco 2 (Alto):         T-REM-3              CommandPalette ⌘K dinâmico
Bloco 3 (Alto):         T-REM-4 → T-REM-5   UI catálogos → baselines visuais
Bloco 4 (Médio):        T-REM-6              EditorialStateBadge + BootstrapErrorScreen + a11y
```

---

## Parte IV — Futuro (Pós-Remediação)

| Wave | Foco | Pré-requisito |
|------|------|---------------|
| Gamificação | Tier Silver→Diamond + Streaks + micro-interações | T-REM-1..4 concluídos |
| i18n EN | EN como 2ª língua activa (QA strings) | Design System estável |
| Mobile Release | PWA prod + Capacitor iOS/Android + Store submissions | Lighthouse ≥90 + a11y pass |

---
*Última actualização: 29 de Abril de 2026.*
*Regra de Ouro: Uma Wave só termina quando o typecheck está verde e o CI está aprovado.*
