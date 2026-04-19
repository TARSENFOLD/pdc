# Implementation Plan: MicroDesafio — Live Pulse e Carrossel com Dados Reais

**Branch**: `002-micro-desafio-live-data` | **Date**: 2026-04-08 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/002-micro-desafio-live-data/spec.md`

## Summary

Ligar o Live Pulse do MicroDesafio a dados reais: o BFF emite eventos `landing:pulse` via Socket.IO quando utilizadores iniciam o desafio, com um contador in-process (TTL 60s, debounce 1s por área). O carrossel de instituições passa a mostrar `regiao` e `tipo` (campos que já existem no schema mas não eram exibidos) e os cartões ficam clicáveis para `/instituicoes/:slug`. Nenhuma alteração ao schema de dados.

Ver [research.md](./research.md) para decisões de design e [data-model.md](./data-model.md) para entidades.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 24 LTS (BFF) + React 18 + Vite 5 (frontend)  
**Primary Dependencies**: Hono 4, Socket.IO 4, TanStack Query 5, motion/react, react-router-dom 6  
**Storage**: In-process `Map` com TTL (sem Redis obrigatório); Upstash Redis disponível se necessário no futuro  
**Testing**: Playwright e2e (`tests/e2e/`); TypeScript `tsc --noEmit` como gate de qualidade  
**Target Platform**: Monorepo — `apps/api/` (BFF, Hono) + `apps/web/` (frontend, Vite)  
**Project Type**: web-service (BFF) + web-app (frontend)  
**Performance Goals**: Emissão de `landing:pulse` com debounce ≤1s após actividade; sem perda de dados entre abas abertas  
**Constraints**: Graceful degradation — se socket não conectar, MicroDesafio funciona sem pulse; sem mocks de dados  
**Scale/Scope**: Escala single-node; in-process é suficiente

## Constitution Check

## Constitution Check

*Constitution is an unfilled template — no gates to evaluate. No violations.*

## Project Structure

### Documentation (this feature)

```text
specs/002-micro-desafio-live-data/
├── plan.md              ✅ este ficheiro
├── research.md          ✅ gerado (Phase 0)
├── data-model.md        ✅ gerado (Phase 1)
├── quickstart.md        ✅ gerado (Phase 1)
└── tasks.md             ⏳ Phase 2 output (/speckit.tasks)
```

### Source Code (monorepo)

```text
apps/api/src/
├── modules/
│   ├── landing/
│   │   └── pulse.service.ts     # NOVO — counter in-process + debounce + emit
│   └── realtime/
│       └── socket.service.ts    # MODIFICADO — auth soft + emitirLandingPulse()
├── routes/
│   └── landing.ts               # NOVO — POST /landing/pulse (público)
└── index.ts                     # MODIFICADO — registar /landing

apps/web/src/features/landing/
├── useMicroDesafio.ts           # MODIFICADO — POST /landing/pulse após submeterTexto()
└── CarrosselInstituicoes.tsx    # MODIFICADO — regiao, tipo, slug link
```

**Structure Decision**: Monorepo web (Option 2) — BFF em `apps/api/`, frontend em `apps/web/`. Todos os ficheiros novos são adições minimais ao módulo correcto existente.

## Complexity Tracking

Sem violações.
