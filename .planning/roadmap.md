# PDC v2 — Strategic Roadmap

Este roadmap define a trajectória de execução técnica do PDC v2, organizada em 5 Waves temáticas.

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

## Wave 2: Motor Vocacional & LTI
| ID | Task | Status | Context |
|----|------|--------|---------|
| W2-T1 | Heuristics shared + Sanity validator dupla (edge + BFF) | ✅ | Core |
| W2-T2 | Event bus interno + Outbox pattern (Strapi domain events) | ✅ | Feature |
| W2-EXT | Constelação Neural — Hero Landing Page Adaptive | ✅ | Design |
| W2-T3 | LTI Grade Passback + Conquistas como event subscribers | ✅ | LTI |
| W2-T4 | Sim Tipo 2 score real (substituir hardcoded 8.5 + telemetry-driven) | ✅ | Reputation |
| W2-T5 | Sim Tipo 3 player (criar Tipo3Player.tsx + telemetria nativa + scoring) | ✅ | Simulation |
| W2-T6 | GET /reputacao/me endpoint separado + ReputacaoBreakdown schema + Relatório Vocacional Premium MVP | ✅ | Dashboard |

## Wave 3: Design System de Autoridade (PRÓXIMO BLOCO)
| ID | Task | Status | Context |
|----|------|--------|---------|
| W3-T1 | Token audit + purga hardcoded colors (27 ui components + outros) | ⏳ | Design |
| W3-T2 | Design primitives — Glassmorphism + BentoGrid + Padrões africanos 3% | ⏳ | UI |
| W3-T3 | i18n setup + extracção PT mecânica + Strapi i18n.localized opt-in | ⏳ | Global |
| W3-T4 | a11y endurece (axe gate ERROR + contrast AA/AAA + touch targets ≥44px + focus visible) | ⏳ | Accessibility |
| W3-T5 | Visual regression baseline + lint rules de design system | ⏳ | Polish |

## Wave 4: Dashboards & Hubs
| ID | Task | Status | Context |
|----|------|--------|---------|
| W4-T1 | MensagensPage build-from-scratch (inbox + busca + filtros role + realtime) | ⏸ | depende de W3 |
| W4-T2 | Feed completo 4 fontes (Geral Vocacional Institucional Trending) + Comments com moderação | ⏸ | depende de W3 |
| W4-T3 | Dashboard Bento Grid + Top Bar Glass Header (Command+K) + Sidebar slim audit | ⏳ | B2B |
| W4-T4 | Reputação Bento role-aware + Hub de Oportunidades 'Match Terminal' | ⏳ | Marketplace |
| W4-T5 | Empty States aspiracionais + Threaded Insights (anotações Tina laterais no Relatório) | ⏳ | Polish |

## Wave 5: Gamificação & Produção
| ID | Task | Status | Context |
|----|------|--------|---------|
| W5-T1 | Micro-interações em ≥80% elementos clicáveis (hover, click feedback, loading, page transitions) | ⏳ | Polish |
| W5-T2 | Gamificação profissional (Tier Bronze→Diamond + Talent Bounties + Streaks + notificações inteligentes) | ⏳ | Retention |
| W5-T3 | EN como segunda língua activa (traduzir strings PT → EN + QA) | ⏳ | Retention |
| W5-T4 | Production polish (Lighthouse ≥90 mobile + a11y full audit + cleanup deprecated endpoints) | ⏳ | Scale |

---
*Regra de Ouro: Uma Wave só termina quando o typecheck está verde e o CI está aprovado.*
