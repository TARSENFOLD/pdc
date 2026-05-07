# Inventário de Tickets — W0 a W5

> **Origem:** `traycer-epics/tickets/` — 60+ tickets (Abril 2026)
>
> **Propósito:** Catálogo completo de todos os tickets planeados para as 6 waves de refactoring, destilados dos ficheiros individuais em `/fv/traycer-epics/tickets/`.

---

## W0 — Foundation (9 tickets)

| ID | Título | Escopo |
|----|--------|--------|
| W0-T1 | Pre-flight runtime bugs | Mensagens router + Sidebar icons (`Brain`+`Zap`) + `log` import em `simulacoes.ts` |
| W0-T2 | Documentation governance reset | Recriar ghosts + sync `.planning/` + archive `.planning_backup/` + audit Auth Fix |
| W0-T3 | Characterization tests — `useTelemetry` hook | Testes de batching, resilience (offline), keepalive, buffer persistence |
| W0-T4 | Characterization tests — `heuristics.engine.ts` | Testes da engine BFF: cálculos φ/R/F, edge cases, determinismo |
| W0-T5 | Characterization tests — `vocacional.service.ts` | Testes do serviço vocacional: fórmulas, personas narrativas, snapshot |
| W0-T6 | Characterization tests — `reputation.service.ts` | Testes das 6 dimensões ponderadas, cache Redis, flag gate |
| W0-T7 | Characterization tests — `conquistas.engine.ts` | Testes do motor de conquistas: regras, desbloqueio, idempotência |
| W0-T8 | Characterization tests — `lti.ags.ts` (sendScore) | Testes do LTI AGS: assinatura, payload IMS, error handling |
| W0-T9 | CI Tooling foundation | axe-core warn gate + pre-commit hook + Strapi ESLint + Branch Protection |

## W1 — Estabilidade + Edge + Seed (5 tickets)

| ID | Título | Escopo |
|----|--------|--------|
| W1-T1 | `apps/edge` worker hardening | wrangler config + nodejs compat + secrets + scoped package |
| W1-T2 | TelemetryToken JWS RS256 | Signer no BFF + verify middleware no edge + payload schema |
| W1-T3 | GET /bootstrap layered + FeatureRegistry | FeatureRegistry híbrido + frontend `bootstrap.ts` (já existe — review-only) |
| W1-T4 | Edge dual-write + Upstash queue + BFF consumer | Full ingestion pipeline: edge→queue→consumer→behavior_patterns |
| W1-T5 | Seed narrativo | 4 áreas vocacionais + 10 instituições + 30 mentores + 100 alunos |

## W2 — Heurísticas + Relatório + Tipo3 (6 tickets)

| ID | Título | Escopo |
|----|--------|--------|
| W2-T1 | Heuristics shared + Sanity validator | Mover fórmulas puras para `@pdc/shared` + sanity dupla (edge + BFF) |
| W2-T2 | Event bus interno + Outbox pattern | Strapi domain events, `publishWithOutbox`, handler registry, ack-tracking |
| W2-T3 | LTI Grade Passback + Conquistas event subscribers | Handler real (não stub), `lti.score.service.ts`, conquistas only-handler |
| W2-T4 | Sim Tipo 2 score real | Substituir hardcoded 8.5 + telemetry-driven scoring via heuristics shared |
| W2-T5 | Sim Tipo 3 player | Criar `Tipo3Player.tsx` + telemetria nativa + 3 eventos canónicos novos |
| W2-T6 | GET `/reputacao/me` + ReputacaoBreakdown + Relatório Vocacional Premium | Endpoint separado + schema Zod + tier + 404-when-flag-off + `RelatorioVocacional` real |

## W3 — Design System + i18n + a11y (5 tickets)

| ID | Título | Escopo |
|----|--------|--------|
| W3-T1 | Token audit + purga hardcoded colors | 27 ui components + outros ficheiros com `text-slate-*`/`bg-blue-*` hardcoded |
| W3-T2 | Design primitives | Glassmorphism contextual + BentoGrid genérico + Padrões africanos 3% opacidade |
| W3-T3 | i18n setup + extracção PT | react-i18next + extracção mecânica + Strapi `i18n.localized` opt-in |
| W3-T4 | a11y endurece | axe gate ERROR + contrast AA/AAA + touch targets ≥44px + focus visible |
| W3-T5 | Visual regression baseline | Snapshot visual + lint rules de design system |

## W4 — Redesign de Páginas + Reversões UI (5 tickets)

| ID | Título | Escopo |
|----|--------|--------|
| W4-T1 | MensagensPage build-from-scratch | Inbox + busca + filtros role + realtime Socket.IO |
| W4-T2 | Feed completo 4 fontes | Geral/Vocacional/Institucional/Trending + Comments com moderação |
| W4-T3 | Dashboard Bento Grid + Top Bar Glass Header | Command+K + Sidebar slim audit |
| W4-T4 | Reputação Bento role-aware + Hub de Oportunidades | "Match Terminal" para mentores/patrocinadores |
| W4-T5 | Empty States aspiracionais + Threaded Insights | Anotações Tina laterais no Relatório Vocacional |

## W5 — Polish + Gamificação + EN + a11y final (4 tickets)

| ID | Título | Escopo |
|----|--------|--------|
| W5-T1 | Micro-interações | ≥80% elementos clicáveis (hover, click feedback, loading, page transitions) |
| W5-T2 | Gamificação profissional | Tier Bronze→Diamond + Talent Bounties + Streaks + notificações inteligentes |
| W5-T3 | EN como segunda língua activa | Traduzir strings PT → EN + QA |
| W5-T4 | Production polish | Lighthouse ≥90 mobile + a11y full audit + cleanup deprecated endpoints |

---

## Tickets de Saneamento Documental (Epic S1-S3)

| ID | Título | Escopo |
|----|--------|--------|
| T-S1-A | Foundation `docs/canon/` skeleton + Bloco A Visão | 4 docs de visão canonizados |
| T-S1-B | 18 ADRs canonizados | 6 normalizados + 12 novos (007-018) |
| T-S1-C | Bloco C Domínio | 16 docs em `docs/canon/10-dominio/` |
| T-S1-D | Bloco D Arquitectura | 19 docs em `docs/canon/20-arquitectura/` |
| T-S1-E | Bloco F Design System + Wireframes | Tokens, componentes, regras |
| T-S1-F | Bloco G Mapa de Páginas | 7 docs por role |
| T-S1-G | Bloco H Pivots + Guias Públicos | Decisões pivotais + docs públicos |
| T-S1-H | Bloco I Arquivamento + substituição paths `/fv/` | Limpar referências externas |
| T-S2-A | PROJECT.md + CONSTITUTION.md | Restaurar alma + ratificar improvements |
| T-S2-B | ROADMAP.md | W0-W6 + tabela mapeamento histórico M*/Onda* → W* |
| T-S2-C | REQUIREMENTS.md | REQs + dual-state + 11 features F1-F11 |
| T-S2-D | STATE.md + DECISIONS-LOG.md + DEBT.md | Gate S2 — sincronizar com verdade |
| T-S3-A | Baseline lint/typecheck/test pós-canon | Validação técnica pós-canonização |
| T-S3-B | Validar doc↔code + caçar divergências | Tabela de divergências documentação vs código |
| T-S3-C | Bulk-create tickets fix + actualizar STATE/DEBT | Gate S3 — conclusão documental |

## Tickets Fix (Isolados)

| ID | Título | Escopo |
|----|--------|--------|
| T-FIX-1 | Estender Strapi subscrição schema | `features` + `quotas` JSON para entitlements B2B |
| T-FIX-2 | Outbox Replay scheduler | Scheduler em `apps/api/src/index.ts` |
| T-FIX-3 | Conquistas naming mismatch | 12 regras que nunca disparam por naming errado |
| T-FIX-4 | Reconciliação schema tentativa + telemetria | D20 + D21 + D22 divergences |

## Auditorias e Reviews (R0-R3)

| ID | Título | Escopo |
|----|--------|--------|
| R0-1 | Baseline: lint typecheck test e2e a11y + relatório | Estado zero antes de qualquer mudança |
| R0-2 | Sync `.planning/` pass 1 | Factos imediatos |
| R0-3 | Audit retroactivo: 14 review-executions | Tickets Done auditados |
| R1-1 | Reclassificar parciais | W1-T3 review-only, W4-T1/T2 estacionados |
| R2.T3a | Tests-first: event bus + lti.handler + conquistas.handler | Testes antes de implementação |
| R2.T3b | Refactor event bus + LTI adapter + conquistas single-source | Tests-first → green |
| R2.T4 | Sim Tipo 2 score real: derivação BFF | Remover hardcoded 8.5 |
| R2.T5 | Sim Tipo 3 player + 3 eventos canónicos | Novo player + telemetria |
| R2.T6a | Tests-first: `/reputacao/me` 404-flag-off + alias + schema | Testes |
| R2.T6b | `/reputacao/me` canónico + flag gate + alias + RelatorioVocacional consumer | Implementação |
| R3-1 | Sync final `.planning/` + debt registry + métrica setup | Conclusão do ciclo |

---

## Resumo Quantitativo

- **Total tickets planeados:** 34 (W0-W5) + 15 (Saneamento S1-S3) + 4 (Fix) + 11 (Auditorias) = **64 tickets**
- **W0 já executado:** 9/9 tickets (baseline + testes + CI)
- **W1 parcialmente executado:** T1, T2, T4, T5 Done; T3 review-only
- **W2 parcialmente executado:** T1, T2 Done; T3-T6 pendentes (closure)
- **W3-W5:** Totalmente pendentes

---

*Destilado de 60+ ficheiros em `/fv/traycer-epics/tickets/` · Abril 2026*
