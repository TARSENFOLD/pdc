Este roadmap define a trajectória de execução técnica do PDC v2, organizada em waves temáticas.

## 📱 Mobile-First (Faixa Transversal)
> **Checklist Obrigatória para o Fecho de Qualquer Wave:**
> - [ ] Touch targets ≥ 44px (auditado via axe-core)
> - [ ] Viewport meta tag correcta (`width=device-width, initial-scale=1, viewport-fit=cover`)
> - [ ] Safe-area-inset padding para notches (iOS/Android)
> - [ ] Performance Lighthouse Mobile ≥ 90
> - [ ] Offline-ready (PWA Manifest + Service Worker funcional)

## Taxonomia Híbrida (G1)

O projeto migrou do modelo M*/Onda* para W*-T*. Identificadores antigos são preservados para rastreabilidade histórica.

### Mapeamento Histórico (M/Onda → Wave)

| Origem (Legacy) | Destino (W*-T*) | Nome da Tarefa (Epic Verbatim) |
|-----------------|-----------------|--------------------------------|
| M0-T1           | W0-T1 | Pre-flight runtime bugs (Mensagens router + Sidebar icons + log import) |
| M0-T2           | W0-T2 | Documentation governance reset (recreate ghosts + sync + archive + audit Auth Fix) |
| M0-T3           | W0-T3 | Characterization tests — useTelemetry hook |
| M0-T4           | W0-T4 | Characterization tests — heuristics.engine.ts |
| M0-T5           | W0-T5 | Characterization tests — vocacional.service.ts (expand) |
| M0-T6           | W0-T6 | Characterization tests — reputation.service.ts |
| M0-T7           | W0-T7 | Characterization tests — conquistas.engine.ts |
| M0-T8           | W0-T8 | Characterization tests — lti.ags.ts (sendScore) |
| Tooling         | W0-T9 | CI/Tooling foundation (axe-core warn gate + pre-commit + Strapi ESLint + Branch Protection) |
| Onda 1-T1       | W1-T1 | apps/edge worker hardening (wrangler config + nodejs compat + secrets + scoped package) |
| Onda 1-T2       | W1-T2 | TelemetryToken JWS RS256 — signer no BFF + verify middleware no edge + payload schema |
| Onda 1-T3       | W1-T3 | GET /bootstrap layered + FeatureRegistry híbrido + frontend bootstrap.ts |
| Onda 1-T4       | W1-T4 | Edge dual-write + Upstash queue + BFF consumer (full ingestion pipeline) |
| Onda 1-T5       | W1-T5 | Seed narrativo (4 áreas vocacionais + 10 instituições + 30 mentores + 100 alunos) |

---

## Wave 0: Fundação & Estabilidade (Actual)
*Foco: Sanear o monorepo e congelar comportamento actual via characterization tests.*

| ID | Task | Status | Epic Link |
|----|------|--------|-----------|
| W0-T1 | Pre-flight runtime bugs (Mensagens router + Sidebar icons + log import) | ✅ | T1 |
| W0-T2 | Documentation governance reset (recreate ghosts + sync + archive + audit Auth Fix) | ✅ | T2 |
| W0-T3 | Characterization tests — useTelemetry hook | ✅ | T3 |
| W0-T4 | Characterization tests — heuristics.engine.ts | ✅ | T4 |
| W0-T5 | Characterization tests — vocacional.service.ts (expand) | ✅ | T5 |
| W0-T6 | Characterization tests — reputation.service.ts | ✅ | T6 |
| W0-T7 | Characterization tests — conquistas.engine.ts | ✅ | T7 |
| W0-T8 | Characterization tests — lti.ags.ts (sendScore) | ✅ | T8 |
| W0-T9 | CI/Tooling foundation (axe-core warn gate + pre-commit + Strapi ESLint + Branch Protection) | ✅ | T9 |

## Wave 1: Autenticação & Pipeline Soberano
| ID | Task | Status | Context |
|----|------|--------|---------|
| W1-T1 | apps/edge worker hardening (wrangler config + nodejs compat + secrets + scoped package) | ✅ | Hardening |
| W1-T2 | TelemetryToken JWS RS256 — signer no BFF + verify middleware no edge + payload schema | ✅ | Security |
| W1-T3 | GET /bootstrap layered + FeatureRegistry híbrido + frontend bootstrap.ts | ✅ | review-only |
| W1-T4 | Edge dual-write + Upstash queue + BFF consumer (full ingestion pipeline) | ✅ | Telemetry |
| W1-T5 | Seed narrativo (4 áreas vocacionais + 10 instituições + 30 mentores + 100 alunos) | ✅ | Data |

## Wave 2.5: Sync Constitucional (Hardening)
| ID | Task | Status | Context |
|----|------|--------|---------|
| W2.5-E1 | Migração F10 (15 áreas vocacionais + slug 'estudante') | ⏳ | Debt |
| W2.5-E2 | Edge Worker Hardening (Idempotência + Bugfixes) | ⏳ | Security |
| W2.5-E3 | Schemas Canónicos Programa + Projeto (Abstract vs Core) | ⏳ | Shared |
| W2.5-E4 | Wave 2 Debt Closeout (D1 Consolidação + OTP + Tina) | ⏳ | Core |
| W2.5-E5 | Migração Frontend Vercel → Cloudflare Pages | ⏳ | Infra |

## Wave 3: Design System de Autoridade
| ID | Task | Status | Context |
|----|------|--------|---------|
| W3-T1 | Token audit + purga hardcoded colors (tokens.css) | ✅ | Design |
| W3-T2 | Design primitives — Glassmorphism + BentoGrid + Padrões africanos | ✅ | UI |
| W3-T3 | i18n setup + extracção PT mecânica + Strapi localized | ⏳ | Global |
| W3-T4 | a11y endurece (axe gate ERROR + contrast AA/AAA + touch targets) | ⏳ | Accessibility |
| W3-T5 | Visual regression baseline + lint rules de design system | ⏳ | Polish |

## Wave 4: Dashboards & Hubs
| ID | Task | Status | Context |
|----|------|--------|---------|
| W4-T1 | MensagensPage UI build (inbox + busca + realtime) | ✅ | UI |
| W4-T2 | Feed completo 4 fontes (Geral/Voc/Inst/Trend) + Comments | ⏳ | Logic |
| W4-T3 | Dashboard Bento Grid + Top Bar Glass Header (Command+K) | ✅ | UI |
| W4-T4 | Reputação Bento role-aware + Hub de Oportunidades 'Match Terminal' | ⏳ | Marketplace |
| W4-T5 | Threaded Insights (anotações Tina laterais no Relatório) | ⏳ | AI |

## Wave 5: Gamificação & Produção
| ID | Task | Status | Context |
|----|------|--------|---------|
| W5-T1 | Micro-interações em ≥80% elementos (hover, transitions) | ⏳ | Polish |
| W5-T2 | Gamificação profissional (Tier Silver→Diamond + Streaks) | ⏳ | Retention |
| W5-T3 | EN como segunda língua activa (QA strings) | ⏳ | Scale |
| W5-T4 | cleanup deprecated endpoints + Production Polish | ⏳ | Scale |

## Wave 6: Mobile Release
| ID | Task | Status | Context |
|----|------|--------|---------|
| W6-T1 | PWA Production-Grade (manifest + icons + offline) | ⏳ | Release |
| W6-T2 | Capacitor iOS build + signing + TestFlight | ⏳ | Store |
| W6-T3 | TWA Android build + Play Console Internal Track | ⏳ | Store |
| W6-T4 | App Store Connect submission | ⏳ | Release |
| W6-T5 | Play Store submission | ⏳ | Release |
| W6-T6 | App Store Assets (Screenshots, Descriptions) | ⏳ | Creative |

---
*Regra de Ouro: Uma Wave só termina quando o typecheck está verde e o CI está aprovado.*
