# PDC v2 — Project State

> Memória persistente do projecto entre sessões. Lê este ficheiro PRIMEIRO.

## Current Status
Estamos na transição para a **Wave 3+ (Hardening & Mobile First)**. O saneamento de design system está avançado, mas a integridade E2E (D1-D9) e o fecho de dívida técnica são os focos críticos.

| Wave | Nome | Status | Detalhe Granular |
| --- | --- | --- | --- |
| W0 | Fundação | ✅ | Characterization tests ratificados, pre-flight fixed. |
| W1 | Auth & Pipeline | ✅ | OTP mockado (P2), RS256 ativo, Edge dual-write. |
| W2 | Motor & LTI | ✅ | D1 Heuristics paralelo, LTI passback funcional. |
| W3 | Design System | ⏳ | Tokens ✅, Primitivos ✅, a11y ⏳, V-Reg ⏳. |
| W4 | Dashboards | ⏳ | ~70% UI; falta Mensagens final e Match Terminal. |
| W5 | Mobile & PWA | ⏳ | W6 em preparação; D1 manifests pendentes. |

## Realizações Recentes (Auditadas)
- **Infraestrutura Core:** 5 dashboards funcionais, 41 rotas BFF ativas, 25 módulos lib/api.
- **Qualidade & Testes:** 10 scripts de performance k6, redução de ESLint (700+ -> ~40).
- **Design System:** `tokens.css` e 5 primitivos (GlassCard, BentoGrid, etc.) ratificados.
- **Ecosystem Hooks (G15):** Auditoria concluída. 6 hooks (Ranking, Feed, Match, Achievement, Behavior, Notify) com idempotência Redis.
- **Outbox Scheduler:** Processamento automático de eventos pendentes ativo via BFF.

## Dívida Técnica & Bloqueios (Auditados D1–D9)
| ID | Descrição | Origem | Ticket |
| --- | --- | --- | --- |
| D1 | Heurísticas paralelas (duplicação shared vs engine) | E4 | E4-T1 |
| D2 | 4× `any` explícito no FeedPage.tsx | ESLint | E4-T2 |
| D3 | Prometheus Exporter (Drift de Métricas) | Auditoria | E* |
| D4 | Conquistas Naming Mismatch (12 não disparam) | QA | E4-T3 |
| D5 | Outbox Co-location (Performance bottleneck) | Auditoria | E* |
| D6 | Midnight Rollover (Race Condition na Telemetria) | E2 | E2-T2 |
| D7 | Race Condition Edge ↔ BFF (Persistence lag) | Auditoria | E2 |
| D8 | Subscriptions sem features/quotas (Hardcoded) | ADR-014 | E* |
| D9 | LTI Error Handling (Retry infinito em 401/403) | Auditoria | E* |

## Bugs Críticos (Auditoria C1 + Falhas Invisíveis)
| ID | Descrição | Spec | Status |
| --- | --- | --- | --- |
| BUG-01 | Edge `validEvents` ReferenceError no POST | E2 | ⏳ |
| BUG-02 | Drift de áreas vocacionais: 4 vs 15 inconsistente | E1 | ⏳ |
| BUG-03 | Viewport `user-scalable=no` bloqueia a11y | D1 | ⏳ |
| BUG-04 | Manifest `theme_color` inconsistente (Amber/Dark) | D1 | ⏳ |
| BUG-05 | OTP Twilio mockado (Impede onboarding real) | E4 | ⏳ |
| BUG-06 | Telemetria `payload` vs `dados` (D20 mismatch) | Auditoria | ✅ |
| BUG-07 | Missing `Tentativa.metadata` no CMS (D21) | Auditoria | ⏳ |
| BUG-08 | Drift nomenclature datas (D22: StartAt vs Inicio) | Auditoria | ⏳ |
| BUG-09 | Outbox Replay manual-only (Bung D2) | Auditoria | ✅ |
| BUG-10 | Cloudflare R2 Keys expostas em ficheiros plain text | Auditoria | ⏳ |

## Próximos Passos (Sequência Operacional)
1. **Hardening:** E2 (Edge) → E5 (Cloudflare Pages)
2. **Core Debt:** E1 (Áreas) → E3 (Schemas) → E4 (Debt Closeout)
3. **Docs & Planning:** A1 (README) + B* (Docs) + C* (Planning)
4. **Mobile:** D1 → D2 → D3
5. **Polimento:** F1 (OG Image) → DEPLOY FINAL.

## Environment
- **OS:** Linux (Fedora 43 / Debian agnostic)
- **Node:** 24.13.0 LTS
- **Docker:** Nativo (Strapi + Postgres + Redis)
- **Editor:** Cursor / VS Code

---
*Regra de Ouro: Se não está documentado aqui, não aconteceu.*