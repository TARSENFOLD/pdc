# PDC v2 — Project State

> Memória persistente do projecto entre sessões. Lê este ficheiro PRIMEIRO. Actualiza após cada sessão.

## Current Status
Estamos na transição entre a **Wave 1 (Estabilização)** e a **Wave 2 (Motor Vocacional)**.

```
Wave 0 — Fundação          [x] COMPLETA
Wave 1 — Estabilização     [~] EM PROGRESSO (Fix de redirects e Login pendentes)
Wave 2 — Motor Vocacional  [~] EM PROGRESSO (Event Bus e Heurísticas)
Wave 3 — Design System     [ ] NÃO INICIADA (Soul & Elite Design)
Wave 4 — Dashboards        [ ] NÃO INICIADA (Bento Grids)
Wave 5 — Gamificação       [ ] NÃO INICIADA
```

## O que foi feito (Real)
- [x] Monorepo npm workspaces e ADRs base.
- [x] Cliente Strapi v5 com normalização de dados.
- [x] Simulações Tipo 1 e 2 (Placeholder técnico enriquecido).
- [x] Dockerfile soberano para o BFF.
- [~] Saneamento de tipos `any` residuais.

## Bloqueios Imediatos
- [404] Redirecionamentos pós-login em `LoginPage.tsx` e `TwoFactorPage.tsx`.
- [CORS] Erros de preflight no browser ("estado null") devido a inconsistência de origem.

## Lacunas Estruturais Críticas (Sincronizado)
A auditoria real confirmou que os seguintes ficheiros nucleares **existem** e estão operacionais (drift documental corrigido):
- `packages/shared/src/bootstrap.ts`
- `apps/api/src/modules/events/event-bus.ts`
- `packages/shared/src/heuristics.ts`
- `apps/edge/src/middleware/jws-verify.ts`
- `apps/api/src/modules/telemetria/consumer.ts`

## Reclassificação de Tickets Parciais (R1-1)
- **W1-T3 (Bootstrap Layered)**: ✅ COMPLETA (review-only). O `BootstrapProvider` já está implementado e integrado em `main.tsx`.
- **W4-T1 (Mensagens)**: ⏸ ESTACIONADO. Depende da Wave 3 (Design System).
- **W4-T2 (Feed)**: ⏸ ESTACIONADO. Depende da Wave 3 (Design System).

## Wave 2 Progress (Real-time)
- **R2.T3 (Event Bus)**: ✅ COMPLETO. Refactor soberano concluído. Handlers (LTI + Conquistas) integrados via Registry explícito. Outbox reentrante com aguardo de todos os handlers.
- **R2.T4 (Score Real)**: ✅ COMPLETO. Derivação determinística no BFF implementada. Remoção do hardcoded 8.5. Tests "Cirurgião vs Hacker Hesitante" verdes.
- **R2.T5 (Sim Tipo 3)**: ✅ COMPLETO. Shell funcional do `Tipo3Player` implementado com telemetria canónica e suporte a derivação no BFF. Seed extendido com simulações Tipo 3.
- **R2.T6 (Reputação Canónica)**: ✅ COMPLETO. Endpoint `/reputacao/me` soberano implementado com gate de feature-flag. Alias temporário `/reputation/me` mantido para rollback. `RelatorioVocacional` no frontend totalmente integrado com o breakdown real.

## Debt Explícito (Registado em R3-1)
1. **BFF Heuristics Parallelism**: `apps/api/src/modules/analysis/heuristics.engine.ts` paralelo ao `@pdc/shared/heuristics` — consolidar na Wave 3.
2. **FeedPage Residual Any**: `apps/web/src/features/feed/FeedPage.tsx` contém 4 `any` — limpar em W4-T2.
3. **Observability Exporter**: Métrica `domain_events_failed_total` implementada em logs; exporter (Prometheus/Sentry) pendente.

## Próximos Passos (Ordem de Autoridade)
1. **Wave 3 (Design System)**: Purga de cores hardcoded, Glassmorphism, BentoGrid e endurecimento de acessibilidade.
2. **R3-1 (Sync Final)**: Sincronização final do plano, debt registry e métricas de setup.

## Architecture Snapshot
```
pdc-v2/
├── .planning/       ← Fonte de Verdade (Manifesto, Req, State)
├── apps/
│   ├── web/         ← Frontend (React/Vite/Tailwind v4)
│   └── api/         ← BFF (Hono/Node 24)
├── packages/
│   └── shared/      ← Contrato Soberano (@pdc/shared)
└── infra/
    └── strapi/      ← CMS Strapi v5
```

---
**Regra de Ouro:** Se não está documentado aqui, não aconteceu.
